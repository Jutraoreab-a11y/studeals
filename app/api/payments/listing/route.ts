import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getOrCreateCustomer } from "@/lib/stripe";
import { createEscrowPayment } from "@/lib/payments";
import { jsonError } from "@/lib/api";

const Body = z.object({ listingId: z.string().uuid() });

export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session) return jsonError("Connecte-toi pour acheter.", 401);
  const { profile } = session;
  if (!profile.is_verified) return jsonError("Badge de Confiance requis pour acheter.", 403);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Requête invalide.");

  const { data: listing } = await supabaseAdmin
    .from("listings")
    .select("id, seller_id, title, price, status, category")
    .eq("id", parsed.data.listingId)
    .single();

  if (!listing || listing.status !== "active") return jsonError("Annonce indisponible.", 409);
  if (listing.category !== "goods") return jsonError("Les colocations ne se paient pas sur l'app.", 400);
  if (listing.seller_id === profile.id) return jsonError("Tu ne peux pas acheter ta propre annonce.");

  const { data: seller } = await supabaseAdmin
    .from("users")
    .select("payouts_enabled")
    .eq("id", listing.seller_id)
    .single();
  if (!seller?.payouts_enabled) return jsonError("Le vendeur n'a pas encore activé ses paiements.", 409);

  const customerId = await getOrCreateCustomer(profile.id, profile.email, profile.stripe_customer_id);
  if (!profile.stripe_customer_id) {
    await supabaseAdmin.from("users").update({ stripe_customer_id: customerId }).eq("id", profile.id);
  }

  const result = await createEscrowPayment({
    kind: "listing",
    referenceId: listing.id,
    buyerId: profile.id,
    sellerId: listing.seller_id,
    amountEuros: Number(listing.price),
    customerId,
    description: `Studeals — ${listing.title}`,
  });

  return NextResponse.json(result);
}
