import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";
import { jsonError } from "@/lib/api";

/** Onboarding Stripe Connect Express : nécessaire pour recevoir des paiements. */
export async function POST() {
  const session = await getSessionUser();
  if (!session) return jsonError("Connecte-toi.", 401);
  const { profile } = session;
  if (!profile.is_verified) return jsonError("Badge de Confiance requis.", 403);

  let accountId = profile.stripe_account_id;
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      country: "FR",
      email: profile.email ?? undefined,
      business_type: "individual",
      capabilities: { transfers: { requested: true } },
      business_profile: { product_description: "Vente entre particuliers / micro-services sur Studeals" },
      metadata: { user_id: profile.id },
    });
    accountId = account.id;
    await supabaseAdmin.from("users").update({ stripe_account_id: accountId }).eq("id", profile.id);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  const link = await stripe.accountLinks.create({
    account: accountId,
    type: "account_onboarding",
    refresh_url: `${appUrl}/account?connect=refresh`,
    return_url: `${appUrl}/account?connect=done`,
  });

  return NextResponse.json({ url: link.url });
}
