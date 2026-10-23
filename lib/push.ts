import "server-only";
import webpush from "web-push";
import { supabaseAdmin } from "@/lib/supabase/admin";

let configured = false;
function setup() {
  if (configured) return;
  webpush.setVapidDetails(
    `mailto:${process.env.SUPPORT_EMAIL ?? "support@studeals.fr"}`,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  configured = true;
}

export async function sendPush(userId: string, payload: { title: string; body?: string; href?: string; tag?: string }) {
  setup();
  const { data: subs } = await supabaseAdmin
    .from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("user_id", userId);
  await Promise.all(
    (subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
          { TTL: 60 * 60, urgency: payload.tag === "sos" ? "high" : "normal" },
        );
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) {
          await supabaseAdmin.from("push_subscriptions").delete().eq("id", s.id); // abonnement expiré
        }
      }
    }),
  );
}
