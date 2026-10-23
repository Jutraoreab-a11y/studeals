import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { stripe, getOrCreateCustomer } from "@/lib/stripe";
import { jsonError } from "@/lib/api";

/** Checkout Session Stripe Billing — Studeals+ à 4,99 €/mois. */
export async function POST() {
  const session = await getSessionUser();
  if (!session) return jsonError("Connecte-toi.", 401);
  const { profile } = session;
  if (profile.is_premium) return jsonError("Tu es déjà Studeals+.", 409);

  const customerId = await getOrCreateCustomer(profile.id, profile.email, profile.stripe_customer_id);
  if (!profile.stripe_customer_id) {
    await supabaseAdmin.from("users").update({ stripe_customer_id: customerId }).eq("id", profile.id);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: profile.id,
    line_items: [{ price: process.env.STRIPE_PRICE_VIP_MONTHLY!, quantity: 1 }],
    subscription_data: { metadata: { user_id: profile.id } },
    allow_promotion_codes: true,
    success_url: `${appUrl}/nightlife?vip=welcome`,
    cancel_url: `${appUrl}/nightlife`,
  });

  return NextResponse.json({ url: checkout.url });
}
