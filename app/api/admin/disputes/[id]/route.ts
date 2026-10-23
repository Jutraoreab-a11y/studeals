import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { loadTx, refundTransaction, releaseTransaction } from "@/lib/escrow-actions";
import { notify } from "@/lib/notify";
import { jsonError } from "@/lib/api";

const Body = z.object({
  action: z.enum(["refund", "release", "reject"]),
  note: z.string().min(10).max(1000),
  relist: z.boolean().default(false),
});

/**
 * refund  : l'acheteur est remboursé ;
 * release : le vendeur est payé ;
 * reject  : litige infondé, la transaction reprend son cours normal (code).
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Accès refusé.", 403);
  const { id } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Explique ta décision (10 caractères min.).");
  const { action, note, relist } = parsed.data;

  const { data: dispute } = await supabaseAdmin.from("disputes").select("*").eq("id", id).maybeSingle();
  if (!dispute || dispute.status !== "open") return jsonError("Litige introuvable ou déjà traité.", 404);
  const tx = await loadTx(dispute.transaction_id);
  if (!tx) return jsonError("Transaction introuvable.", 404);

  if (action === "refund") await refundTransaction(tx, { relist, reason: note });
  if (action === "release") await releaseTransaction(tx);
  if (action === "reject") {
    await supabaseAdmin.from("transactions").update({ status: "held", held_at: new Date().toISOString() }).eq("id", tx.id);
    await supabaseAdmin.from("escrow_codes").update({ attempts: 0, locked: false }).eq("transaction_id", tx.id);
  }

  await supabaseAdmin
    .from("disputes")
    .update({
      status: action === "refund" ? "refunded" : action === "release" ? "released" : "rejected",
      resolution_note: note, resolved_by: admin.id, resolved_at: new Date().toISOString(),
    })
    .eq("id", id);

  await Promise.all(
    [tx.buyer_id, tx.seller_id!].map((u) =>
      notify(u, { kind: "dispute_resolved", title: `Décision sur ton litige : ${note}`, href: `/purchases/${tx.id}` }),
    ),
  );
  return NextResponse.json({ ok: true });
}
