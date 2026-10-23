import { createClient, getSessionUser } from "@/lib/supabase/server";
import { jsonError } from "@/lib/api";

/** RGPD, droit d'accès et de portabilité : toutes les données du compte en JSON. */
export async function GET() {
  const session = await getSessionUser();
  if (!session) return jsonError("Connecte-toi.", 401);
  const { profile } = session;
  const supabase = await createClient(); // RLS : uniquement ce que la personne a le droit de voir

  const [listings, gigs, transactions, messages, alerts, notifications, checkins, tax] = await Promise.all([
    supabase.from("listings").select("*").eq("seller_id", profile.id),
    supabase.from("gigs").select("*").eq("requester_id", profile.id),
    supabase.from("transactions").select("id, type, amount, platform_fee, status, created_at, released_at, buyer_id, seller_id"),
    supabase.from("messages").select("sender_id, recipient_id, body, created_at"),
    supabase.from("alerts").select("keyword, max_price, city_id"),
    supabase.from("notifications").select("kind, title, created_at"),
    supabase.from("nightlife_checkins").select("venue_id, date"),
    supabase.from("seller_tax_info").select("*").maybeSingle(),
  ]);

  const body = {
    exported_at: new Date().toISOString(),
    profile: {
      id: profile.id, email: profile.email, phone: profile.phone, display_name: profile.display_name,
      city_id: profile.city_id, birth_date: profile.birth_date, is_verified: profile.is_verified,
      is_premium: profile.is_premium, created_at: profile.created_at,
      notify_email: profile.notify_email, notify_push: profile.notify_push,
    },
    listings: listings.data ?? [],
    gigs: gigs.data ?? [],
    transactions: (transactions.data ?? []).map((t) => ({ ...t, role: t.buyer_id === profile.id ? "acheteur" : "vendeur" })),
    messages: messages.data ?? [],
    alerts: alerts.data ?? [],
    notifications: notifications.data ?? [],
    nightlife_checkins: checkins.data ?? [],
    tax_info: tax.data ?? null,
  };

  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="mes-donnees-studeals.json"`,
      "Cache-Control": "no-store",
    },
  });
}
