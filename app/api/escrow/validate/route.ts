import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { hashCode, MAX_CODE_ATTEMPTS } from "@/lib/escrow";
import { loadTx, releaseTransaction } from "@/lib/escrow-actions";
import { jsonError } from "@/lib/api";

const Body = z.object({ transactionId: z.string().uuid(), code: z.string().regex(/^\d{4}$/) });

/** Le vendeur / worker saisit le code donné par l'acheteur → libération des fonds. */
export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session) return jsonError("Connecte-toi.", 401);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Le code fait 4 chiffres.");
  const { transactionId, code } = parsed.data;

  const tx = await loadTx(transactionId);
  if (!tx || tx.seller_id !== session.profile.id) return jsonError("Transaction introuvable.", 404);
  if (tx.status === "released") return NextResponse.json({ ok: true, alreadyReleased: true });
  if (tx.status === "disputed") return jsonError("Un litige est en cours : l'équipe Studeals va trancher.", 409);
  if (tx.status !== "held") return jsonError("Paiement pas encore confirmé.", 409);

  const { data: esc } = await supabaseAdmin
    .from("escrow_codes").select("code_hash, attempts, locked").eq("transaction_id", transactionId).single();
  if (!esc) return jsonError("Code introuvable.", 404);
  if (esc.locked) return jsonError("Trop d'essais. Signale un problème pour qu'on débloque la situation.", 423);

  if (hashCode(code, transactionId) !== esc.code_hash) {
    const attempts = esc.attempts + 1;
    await supabaseAdmin
      .from("escrow_codes").update({ attempts, locked: attempts >= MAX_CODE_ATTEMPTS }).eq("transaction_id", transactionId);
    return jsonError(`Code incorrect. ${Math.max(0, MAX_CODE_ATTEMPTS - attempts)} essai(s) restant(s).`, 400);
  }

  try {
    await releaseTransaction(tx);
  } catch (e) {
    if (e instanceof Error && e.message === "seller_without_connect_account") {
      return jsonError("Ajoute ton IBAN dans ton profil pour être payé·e.", 409);
    }
    throw e;
  }
  return NextResponse.json({ ok: true });
}
