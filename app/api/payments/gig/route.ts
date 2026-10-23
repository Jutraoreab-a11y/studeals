import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getOrCreateCustomer } from "@/lib/stripe";
import { createEscrowPayment } from "@/lib/payments";
import { jsonError } from "@/lib/api";

const Body = z.object({ gigId: z.string().uuid(), workerId: z.string().uuid() });

/** Le demandeur attribue la mission et bloque la rémunération en séquestre. */
export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session) return jsonError("Connecte-toi.", 401);
  const { profile } = session;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Requête invalide.");
  const { gigId, workerId } = parsed.data;

  const { data: gig } = await supabaseAdmin
    .from("gigs")
    .select("id, requester_id, title, reward_amount, status")
    .eq("id", gigId)
    .single();

  if (!gig || gig.requester_id !== profile.id) return jsonError("Mission introuvable.", 404);
  if (gig.status !== "open") return jsonError("Mission déjà attribuée.", 409);
  if (workerId === profile.id) return jsonError("Choisis quelqu'un d'autre que toi.");

  const { data: worker } = await supabaseAdmin
    .from("users")
    .select("is_verified, payouts_enabled")
    .eq("id", workerId)
    .single();
  if (!worker?.is_verified || !worker.payouts_enabled) {
    return jsonError("Ce profil ne peut pas encore recevoir de paiement.", 409);
  }
  // DAC7 : les prestataires de services doivent être identifiables fiscalement avant d'être payés.
  const { data: tax } = await supabaseAdmin.from("seller_tax_info").select("user_id").eq("user_id", workerId).maybeSingle();
  if (!tax) {
    await supabaseAdmin.from("notifications").insert({
      user_id: workerId, kind: "dac7_info_needed",
      title: "Quelqu'un veut te confier une mission ! Renseigne tes infos fiscales dans ton profil pour être payé·e.",
      href: "/account",
    });
    return jsonError("Cette personne doit d'abord compléter ses infos fiscales. On l'a prévenue.", 409);
  }

  const customerId = await getOrCreateCustomer(profile.id, profile.email, profile.stripe_customer_id);
  if (!profile.stripe_customer_id) {
    await supabaseAdmin.from("users").update({ stripe_customer_id: customerId }).eq("id", profile.id);
  }

  const result = await createEscrowPayment({
    kind: "gig",
    referenceId: gig.id,
    buyerId: profile.id,
    sellerId: workerId,
    amountEuros: Number(gig.reward_amount),
    customerId,
    description: `Studeals mission — ${gig.title}`,
  });

  return NextResponse.json(result);
}
