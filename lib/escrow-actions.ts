import "server-only";
import { stripe, toCents } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { notify } from "@/lib/notify";
import { euros } from "@/lib/format";

type Tx = {
  id: string;
  type: "listing" | "gig" | "subscription";
  reference_id: string | null;
  buyer_id: string;
  seller_id: string | null;
  amount: number | string;
  platform_fee: number | string;
  stripe_payment_intent_id: string | null;
  status: string;
};

export async function loadTx(id: string): Promise<Tx | null> {
  const { data } = await supabaseAdmin.from("transactions").select("*").eq("id", id).maybeSingle();
  return (data as Tx) ?? null;
}

/** Verse l'argent au vendeur (montant − commission). Idempotent. */
export async function releaseTransaction(tx: Tx) {
  if (tx.status === "released") return;
  const { data: seller } = await supabaseAdmin
    .from("users").select("stripe_account_id").eq("id", tx.seller_id!).single();
  if (!seller?.stripe_account_id) throw new Error("seller_without_connect_account");

  const intent = await stripe.paymentIntents.retrieve(tx.stripe_payment_intent_id!);
  const chargeId = typeof intent.latest_charge === "string" ? intent.latest_charge : intent.latest_charge?.id;
  if (!chargeId) throw new Error("charge_not_found");

  const net = toCents(Number(tx.amount)) - toCents(Number(tx.platform_fee));
  const transfer = await stripe.transfers.create(
    {
      amount: net,
      currency: "eur",
      destination: seller.stripe_account_id,
      transfer_group: tx.id,
      source_transaction: chargeId,
      metadata: { transaction_id: tx.id },
    },
    { idempotencyKey: `release-${tx.id}` },
  );

  await supabaseAdmin
    .from("transactions")
    .update({ status: "released", stripe_transfer_id: transfer.id, released_at: new Date().toISOString() })
    .eq("id", tx.id);

  if (tx.type === "listing") await supabaseAdmin.from("listings").update({ status: "sold" }).eq("id", tx.reference_id!);
  if (tx.type === "gig") await supabaseAdmin.from("gigs").update({ status: "completed" }).eq("id", tx.reference_id!);

  await notify(tx.seller_id!, {
    kind: "payout",
    title: `Paiement libéré : ${euros(net / 100)} arrivent sur ton compte.`,
    href: `/purchases/${tx.id}`,
  });
}

/**
 * Rembourse intégralement l'acheteur. Idempotent.
 * relist = true remet l'annonce / la mission en ligne (le vendeur n'est pas en faute).
 */
export async function refundTransaction(tx: Tx, opts: { relist: boolean; reason: string }) {
  if (tx.status === "refunded") return;
  await stripe.refunds.create(
    { payment_intent: tx.stripe_payment_intent_id!, metadata: { transaction_id: tx.id } },
    { idempotencyKey: `refund-${tx.id}` },
  );
  await supabaseAdmin.from("transactions").update({ status: "refunded" }).eq("id", tx.id);

  if (tx.type === "listing") {
    await supabaseAdmin.from("listings").update({ status: opts.relist ? "active" : "removed" }).eq("id", tx.reference_id!);
  } else if (tx.type === "gig") {
    await supabaseAdmin
      .from("gigs")
      .update(opts.relist ? { status: "open", worker_id: null } : { status: "cancelled" })
      .eq("id", tx.reference_id!);
  }

  await Promise.all([
    notify(tx.buyer_id, {
      kind: "refund",
      title: `Tu as été remboursé·e de ${euros(Number(tx.amount))}. ${opts.reason}`,
      href: `/purchases/${tx.id}`,
    }),
    notify(tx.seller_id!, {
      kind: "refund",
      title: `La transaction a été annulée et l'acheteur remboursé. ${opts.reason}`,
      href: `/purchases/${tx.id}`,
    }),
  ]);
}
