import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { jsonError } from "@/lib/api";

/** Stripe Identity : document + selfie. Le résultat arrive par webhook. */
export async function POST() {
  const session = await getSessionUser();
  if (!session) return jsonError("Connecte-toi.", 401);
  if (session.profile.is_verified) return jsonError("Tu es déjà vérifié.", 409);

  const vs = await stripe.identity.verificationSessions.create({
    type: "document",
    options: { document: { require_matching_selfie: true, require_live_capture: true } },
    metadata: { user_id: session.profile.id },
  });
  return NextResponse.json({ clientSecret: vs.client_secret });
}
