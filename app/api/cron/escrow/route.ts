import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { refundTransaction } from "@/lib/escrow-actions";
import { notify } from "@/lib/notify";
import { ESCROW_EXPIRY_DAYS, ESCROW_REMINDER_DAYS } from "@/lib/legal";

/**
 * Tâche quotidienne (Vercel Cron, voir vercel.json) :
 *  - J+7 sans code : rappel aux deux parties ;
 *  - J+14 sans code ni litige : remboursement de l'acheteur, annonce remise en ligne ;
 *  - paiements « pending » de plus de 24 h : marqués échoués.
 */
export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const day = 86_400_000;
  const now = Date.now();
  let reminded = 0, refunded = 0;

  const { data: reminders } = await supabaseAdmin
    .from("transactions")
    .select("id, buyer_id, seller_id")
    .eq("status", "held")
    .is("reminder_sent_at", null)
    .lt("held_at", new Date(now - ESCROW_REMINDER_DAYS * day).toISOString());

  for (const tx of reminders ?? []) {
    const msg = `Remise toujours en attente. Sans code ni signalement d'ici ${ESCROW_EXPIRY_DAYS - ESCROW_REMINDER_DAYS} jours, l'acheteur sera remboursé automatiquement.`;
    await notify(tx.buyer_id, { kind: "escrow_reminder", title: msg, href: `/purchases/${tx.id}` });
    await notify(tx.seller_id, { kind: "escrow_reminder", title: msg, href: `/purchases/${tx.id}` });
    await supabaseAdmin.from("transactions").update({ reminder_sent_at: new Date().toISOString() }).eq("id", tx.id);
    reminded++;
  }

  const { data: expired } = await supabaseAdmin
    .from("transactions")
    .select("*")
    .eq("status", "held")
    .lt("held_at", new Date(now - ESCROW_EXPIRY_DAYS * day).toISOString());

  for (const tx of expired ?? []) {
    try {
      await refundTransaction(tx, { relist: true, reason: `Aucune remise confirmée en ${ESCROW_EXPIRY_DAYS} jours.` });
      refunded++;
    } catch (e) {
      console.error("[cron escrow] refund failed", tx.id, e);
    }
  }

  await supabaseAdmin
    .from("transactions")
    .update({ status: "failed" })
    .eq("status", "pending")
    .lt("created_at", new Date(now - day).toISOString());

  // RGPD : les check-ins nightlife ne sont gardés que 48 h
  await supabaseAdmin
    .from("nightlife_checkins")
    .delete()
    .lt("date", new Date(now - 2 * day).toISOString().slice(0, 10));

  return NextResponse.json({ reminded, refunded });
}
