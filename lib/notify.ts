import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Crée une notification in-app. La livraison push + email est déclenchée
 * automatiquement par le trigger SQL `notifications_deliver`
 * → POST /api/notifications/deliver.
 */
export async function notify(userId: string, n: { kind: string; title: string; href?: string }) {
  await supabaseAdmin.from("notifications").insert({ user_id: userId, kind: n.kind, title: n.title, href: n.href ?? null });
}

/** Prévient tous les admins (nouveau litige, signalement grave…). */
export async function notifyAdmins(n: { kind: string; title: string; href?: string }) {
  const { data } = await supabaseAdmin.from("users").select("id").eq("is_admin", true);
  await Promise.all((data ?? []).map((a) => notify(a.id, n)));
}

/** Événements qui méritent aussi un email (le reste : push seulement). */
export const EMAIL_KINDS = new Set([
  "listing_sold", "gig_assigned", "payout", "refund", "dispute_opened", "dispute_resolved",
  "escrow_reminder", "content_removed", "account_banned", "verification_refused", "dac7_info_needed",
]);
