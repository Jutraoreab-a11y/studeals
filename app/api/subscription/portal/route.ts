import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { jsonError } from "@/lib/api";

/** Portail client Stripe : résiliation en ligne simple (obligation légale en France). */
export async function POST() {
  const session = await getSessionUser();
  if (!session?.profile.stripe_customer_id) return jsonError("Aucun abonnement.", 404);

  const portal = await stripe.billingPortal.sessions.create({
    customer: session.profile.stripe_customer_id,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/account`,
  });
  return NextResponse.json({ url: portal.url });
}
