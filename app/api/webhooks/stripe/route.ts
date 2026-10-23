import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { generateValidationCode, hashCode } from "@/lib/escrow";
import { ageFrom } from "@/lib/format";

export const runtime = "nodejs";

/**
 * Source de vérité des paiements. Chaque handler est idempotent :
 * Stripe peut renvoyer le même événement plusieurs fois.
 */
export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) return new NextResponse("Missing signature", { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await req.text(), signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return new NextResponse("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded":
        await onPaymentSucceeded(event.data.object);
        break;
      case "payment_intent.payment_failed":
        await supabaseAdmin
          .from("transactions")
          .update({ status: "failed" })
          .eq("stripe_payment_intent_id", event.data.object.id)
          .eq("status", "pending");
        break;
      case "checkout.session.completed":
        await onCheckoutCompleted(event.data.object);
        break;
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncSubscription(event.data.object);
        break;
      case "identity.verification_session.verified":
        await onIdentityVerified(event.data.object.id);
        break;
      case "account.updated":
        await supabaseAdmin
          .from("users")
          .update({ payouts_enabled: event.data.object.payouts_enabled ?? false })
          .eq("stripe_account_id", event.data.object.id);
        break;
    }
  } catch (err) {
    console.error(`[stripe webhook] ${event.type}`, err);
    return new NextResponse("Handler error", { status: 500 }); // Stripe réessaiera
  }

  return NextResponse.json({ received: true });
}

async function onPaymentSucceeded(pi: Stripe.PaymentIntent) {
  const txId = pi.metadata.transaction_id;
  const kind = pi.metadata.kind;
  if (!txId) return;

  const { data: tx } = await supabaseAdmin
    .from("transactions")
    .update({ status: "held", held_at: new Date().toISOString() })
    .eq("id", txId)
    .eq("status", "pending")
    .select("id, buyer_id, reference_id, seller_id")
    .maybeSingle();
  if (!tx) return; // déjà traité

  // Réservation atomique : si quelqu'un a payé avant, on rembourse.
  if (kind === "listing") {
    const { data: reserved } = await supabaseAdmin
      .from("listings")
      .update({ status: "reserved" })
      .eq("id", tx.reference_id!)
      .eq("status", "active")
      .select("id")
      .maybeSingle();
    if (!reserved) {
      await stripe.refunds.create({ payment_intent: pi.id }, { idempotencyKey: `refund-${tx.id}` });
      await supabaseAdmin.from("transactions").update({ status: "refunded" }).eq("id", tx.id);
      return;
    }
  } else if (kind === "gig") {
    const { data: assigned } = await supabaseAdmin
      .from("gigs")
      .update({ status: "in_progress", worker_id: tx.seller_id })
      .eq("id", tx.reference_id!)
      .eq("status", "open")
      .select("id")
      .maybeSingle();
    if (!assigned) {
      await stripe.refunds.create({ payment_intent: pi.id }, { idempotencyKey: `refund-${tx.id}` });
      await supabaseAdmin.from("transactions").update({ status: "refunded" }).eq("id", tx.id);
      return;
    }
    await supabaseAdmin.from("notifications").insert({
      user_id: tx.seller_id,
      kind: "gig_assigned",
      title: "Tu as été choisi·e pour une mission !",
      href: `/purchases/${tx.id}`,
    });
  }

  if (kind === "listing") {
    await supabaseAdmin.from("notifications").insert({
      user_id: tx.seller_id,
      kind: "listing_sold",
      title: "Ton annonce est payée. Organise la remise en main propre.",
      href: `/purchases/${tx.id}`,
    });
  }

  const code = generateValidationCode();
  await supabaseAdmin.from("escrow_codes").upsert(
    { transaction_id: tx.id, buyer_id: tx.buyer_id, code_plain: code, code_hash: hashCode(code, tx.id) },
    { onConflict: "transaction_id", ignoreDuplicates: true },
  );
}

async function onCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (session.mode !== "subscription" || !session.client_reference_id) return;
  await supabaseAdmin
    .from("users")
    .update({ is_premium: true, stripe_customer_id: session.customer as string })
    .eq("id", session.client_reference_id);
}

async function syncSubscription(sub: Stripe.Subscription) {
  const active = sub.status === "active" || sub.status === "trialing";
  await supabaseAdmin
    .from("users")
    .update({ is_premium: active })
    .eq("stripe_customer_id", sub.customer as string);
}

/** Badge de Confiance : identité vérifiée ET âge 18-25 (date lue sur la pièce, pas déclarée). */
async function onIdentityVerified(sessionId: string) {
  const vs = await stripe.identity.verificationSessions.retrieve(sessionId, { expand: ["verified_outputs"] });
  const userId = vs.metadata?.user_id;
  const dob = vs.verified_outputs?.dob;
  if (!userId || !dob?.year || !dob.month || !dob.day) return;

  const birth = new Date(Date.UTC(dob.year, dob.month - 1, dob.day));
  const age = ageFrom(birth);
  const eligible = age >= 18 && age <= 25;

  await supabaseAdmin
    .from("users")
    // La contrainte SQL age_18_25 refuse une date hors tranche : on ne la stocke que si éligible.
    .update(eligible ? { is_verified: true, birth_date: birth.toISOString().slice(0, 10) } : { is_verified: false })
    .eq("id", userId);

  if (!eligible) {
    await supabaseAdmin.from("notifications").insert({
      user_id: userId,
      kind: "verification_refused",
      title: "Studeals est réservé aux 18-25 ans : ton compte ne peut pas obtenir le badge.",
    });
  }
}
