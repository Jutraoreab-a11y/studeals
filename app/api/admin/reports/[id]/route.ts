import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { notify } from "@/lib/notify";
import { jsonError } from "@/lib/api";

const Body = z.object({
  action: z.enum(["dismiss", "remove", "ban"]),
  decision: z.string().min(10).max(1000), // exposé des motifs (DSA art. 17)
});

async function authorOf(type: string, id: string): Promise<string | null> {
  if (type === "user") return id;
  const map: Record<string, [string, string]> = {
    listing: ["listings", "seller_id"], gig: ["gigs", "requester_id"], message: ["messages", "sender_id"],
  };
  const [table, col] = map[type];
  const { data } = await supabaseAdmin.from(table).select(col).eq("id", id).maybeSingle();
  return (data as Record<string, string> | null)?.[col] ?? null;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Accès refusé.", 403);
  const { id } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Motif de décision requis (10 caractères min.).");
  const { action, decision } = parsed.data;

  const { data: report } = await supabaseAdmin.from("reports").select("*").eq("id", id).maybeSingle();
  if (!report) return jsonError("Signalement introuvable.", 404);
  const { target_type: type, target_id: targetId } = report;
  const author = await authorOf(type, targetId);

  if (action === "dismiss") {
    // Le contenu masqué automatiquement est remis en ligne
    if (type === "listing") await supabaseAdmin.from("listings").update({ status: "active" }).eq("id", targetId).eq("status", "removed");
    if (type === "gig") await supabaseAdmin.from("gigs").update({ status: "open" }).eq("id", targetId).eq("status", "cancelled");
  }
  if (action === "remove" || action === "ban") {
    if (type === "listing") await supabaseAdmin.from("listings").update({ status: "removed" }).eq("id", targetId);
    if (type === "gig") await supabaseAdmin.from("gigs").update({ status: "cancelled" }).eq("id", targetId);
    if (type === "message") await supabaseAdmin.from("messages").delete().eq("id", targetId);
  }
  if (action === "ban" && author) {
    await supabaseAdmin.from("users").update({ is_banned: true }).eq("id", author);
    await supabaseAdmin.from("listings").update({ status: "removed" }).eq("seller_id", author).eq("status", "active");
    await supabaseAdmin.from("gigs").update({ status: "cancelled" }).eq("requester_id", author).eq("status", "open");
  }

  // Tous les signalements sur la même cible sont clos ensemble
  await supabaseAdmin
    .from("reports")
    .update({ status: action === "dismiss" ? "dismissed" : "actioned", decision, handled_by: admin.id, handled_at: new Date().toISOString() })
    .eq("target_type", type).eq("target_id", targetId).eq("status", "open");

  if (author && action !== "dismiss") {
    await notify(author, {
      kind: action === "ban" ? "account_banned" : "content_removed",
      title: action === "ban"
        ? `Ton compte a été suspendu. Motif : ${decision} Tu peux contester en écrivant au support.`
        : `Un de tes contenus a été retiré. Motif : ${decision} Tu peux contester en écrivant au support.`,
      href: "/legal/cgu#moderation",
    });
  }
  return NextResponse.json({ ok: true });
}
