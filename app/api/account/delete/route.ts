import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, getSessionUser } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";
import { jsonError } from "@/lib/api";

const Body = z.object({ confirm: z.literal("SUPPRIMER") });

/**
 * Suppression du compte.
 * Les transactions et infos fiscales sont conservées (obligation légale, 10 ans),
 * donc le profil est anonymisé plutôt qu'effacé, et la connexion est bloquée.
 */
export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session) return jsonError("Connecte-toi.", 401);
  const { profile } = session;
  if (!Body.safeParse(await req.json().catch(() => null)).success) return jsonError("Tape SUPPRIMER pour confirmer.");

  const { count } = await supabaseAdmin
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .or(`buyer_id.eq.${profile.id},seller_id.eq.${profile.id}`)
    .in("status", ["pending", "held", "disputed"]);
  if (count) return jsonError("Termine d'abord tes ventes, achats ou litiges en cours.", 409);

  // Abonnement Studeals+ : résilié immédiatement
  if (profile.stripe_customer_id) {
    const subs = await stripe.subscriptions.list({ customer: profile.stripe_customer_id, status: "active" });
    await Promise.all(subs.data.map((s) => stripe.subscriptions.cancel(s.id)));
  }

  await Promise.all([
    supabaseAdmin.from("listings").update({ status: "removed" }).eq("seller_id", profile.id).eq("status", "active"),
    supabaseAdmin.from("gigs").update({ status: "cancelled" }).eq("requester_id", profile.id).eq("status", "open"),
    supabaseAdmin.from("gig_applications").delete().eq("worker_id", profile.id),
    supabaseAdmin.from("alerts").delete().eq("user_id", profile.id),
    supabaseAdmin.from("push_subscriptions").delete().eq("user_id", profile.id),
    supabaseAdmin.from("nightlife_checkins").delete().eq("user_id", profile.id),
  ]);

  // Déconnecte tous les appareils, puis bloque le compte d'authentification.
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "global" });
  await supabaseAdmin.auth.admin.updateUserById(profile.id, {
    email: `supprime-${profile.id}@comptes-supprimes.invalid`, // libère l'adresse pour une future inscription
    ban_duration: "876000h",
  });

  // Anonymisation en dernier : le trigger de synchro a recopié l'email factice juste au-dessus.
  await supabaseAdmin
    .from("users")
    .update({
      email: null, phone: null, display_name: null, avatar_url: null,
      is_verified: false, is_premium: false, notify_email: false, notify_push: false,
      deleted_at: new Date().toISOString(),
    })
    .eq("id", profile.id);

  return NextResponse.json({ ok: true });
}
