import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendPush } from "@/lib/push";
import { sendEmail } from "@/lib/email";
import { EMAIL_KINDS } from "@/lib/notify";

export const runtime = "nodejs";

/** Appelé par le trigger SQL à chaque notification créée : envoie push + email. */
export async function POST(req: Request) {
  if (req.headers.get("x-notify-secret") !== process.env.NOTIFY_WEBHOOK_SECRET) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const { id } = (await req.json()) as { id: string };

  const { data: n } = await supabaseAdmin
    .from("notifications").select("id, user_id, kind, title, href").eq("id", id).maybeSingle();
  if (!n) return NextResponse.json({ skipped: true });

  const { data: user } = await supabaseAdmin
    .from("users").select("email, notify_email, notify_push").eq("id", n.user_id).single();
  if (!user) return NextResponse.json({ skipped: true });

  const jobs: Promise<unknown>[] = [];
  if (user.notify_push) {
    jobs.push(sendPush(n.user_id, { title: n.kind === "sos" ? "Mode SOS" : "Studeals", body: n.title, href: n.href ?? "/", tag: n.kind }));
  }
  if (user.notify_email && user.email && EMAIL_KINDS.has(n.kind)) {
    jobs.push(sendEmail(user.email, n.title.slice(0, 90), n.title, n.href ?? "/account"));
  }
  await Promise.allSettled(jobs);
  return NextResponse.json({ ok: true });
}
