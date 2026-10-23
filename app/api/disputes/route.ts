import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { loadTx } from "@/lib/escrow-actions";
import { notify, notifyAdmins } from "@/lib/notify";
import { DISPUTE_REASONS } from "@/lib/legal";
import { jsonError } from "@/lib/api";

const Body = z.object({
  transactionId: z.string().uuid(),
  reason: z.enum(DISPUTE_REASONS.map((r) => r.key) as [string, ...string[]]),
  details: z.string().max(2000).optional(),
});

/** « Signaler un problème » : gèle la transaction jusqu'à la décision de l'équipe. */
export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session) return jsonError("Connecte-toi.", 401);
  const me = session.profile.id;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Choisis un motif.");
  const { transactionId, reason, details } = parsed.data;

  const tx = await loadTx(transactionId);
  if (!tx || (tx.buyer_id !== me && tx.seller_id !== me)) return jsonError("Transaction introuvable.", 404);
  if (tx.status !== "held") return jsonError("Cette transaction ne peut plus faire l'objet d'un litige.", 409);

  const { error } = await supabaseAdmin
    .from("disputes").insert({ transaction_id: tx.id, opened_by: me, reason, details: details ?? null });
  if (error) return jsonError("Un litige est déjà ouvert pour cette transaction.", 409);

  await supabaseAdmin.from("transactions").update({ status: "disputed" }).eq("id", tx.id).eq("status", "held");

  const other = tx.buyer_id === me ? tx.seller_id! : tx.buyer_id;
  await Promise.all([
    notify(other, {
      kind: "dispute_opened",
      title: "Un problème a été signalé sur ta transaction. L'argent reste bloqué le temps qu'on regarde.",
      href: `/purchases/${tx.id}`,
    }),
    notifyAdmins({ kind: "admin_dispute", title: `Nouveau litige (${reason})`, href: "/admin?tab=disputes" }),
  ]);

  return NextResponse.json({ ok: true });
}
