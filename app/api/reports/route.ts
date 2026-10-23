import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, getSessionUser } from "@/lib/supabase/server";
import { notifyAdmins } from "@/lib/notify";
import { REPORT_REASONS } from "@/lib/legal";
import { jsonError } from "@/lib/api";

const Body = z.object({
  targetType: z.enum(["listing", "gig", "user", "message"]),
  targetId: z.string().uuid(),
  reason: z.enum(REPORT_REASONS.map((r) => r.key) as [string, ...string[]]),
  details: z.string().max(1000).optional(),
});

export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session) return jsonError("Connecte-toi pour signaler.", 401);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Choisis un motif.");
  const { targetType, targetId, reason, details } = parsed.data;

  const supabase = await createClient(); // RLS : reporter_id = auth.uid()
  const { error } = await supabase.from("reports").insert({
    reporter_id: session.profile.id, target_type: targetType, target_id: targetId, reason, details: details ?? null,
  });
  if (error?.code === "23505") return jsonError("Tu as déjà signalé ce contenu. Merci !", 409);
  if (error) return jsonError("Signalement impossible.", 500);

  if (reason === "scam" || reason === "illegal" || reason === "harassment") {
    await notifyAdmins({ kind: "admin_report", title: `Signalement prioritaire : ${reason}`, href: "/admin?tab=reports" });
  }
  return NextResponse.json({ ok: true });
}
