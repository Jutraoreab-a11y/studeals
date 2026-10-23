import Link from "next/link";
import { notFound } from "next/navigation";
import { Gate } from "@/components/Gate";
import { createClient, getSessionUser } from "@/lib/supabase/server";
import { euros } from "@/lib/format";
import { EscrowCodeCard } from "@/components/EscrowCodeCard";
import { ValidateCodeForm } from "@/components/ValidateCodeForm";
import { DisputePanel } from "@/components/DisputePanel";
import { ESCROW_EXPIRY_DAYS, DISPUTE_REASONS } from "@/lib/legal";
import type { Transaction } from "@/types/database";

const STATUS: Record<Transaction["status"], string> = {
  pending: "Paiement en cours",
  held: "Argent bloqué, en attente de la remise",
  released: "Terminé, le vendeur a été payé",
  refunded: "Remboursé",
  failed: "Paiement refusé",
  disputed: "Litige en cours d'examen, argent bloqué",
};

/** Page de suivi d'une transaction : code côté acheteur, saisie côté vendeur. */
export default async function PurchasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSessionUser();
  if (!session) return <Gate reason="login" next={`/purchases/${id}`} />;

  const supabase = await createClient();
  const { data } = await supabase.from("transactions").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const tx = data as Transaction;
  const isBuyer = tx.buyer_id === session.profile.id;

  const refTable = tx.type === "listing" ? "listings" : "gigs";
  const { data: ref } = await supabase.from(refTable).select("id, title").eq("id", tx.reference_id!).maybeSingle();
  const refHref = tx.type === "listing" ? `/marketplace/${tx.reference_id}` : `/gigs/${tx.reference_id}`;
  const other = isBuyer ? tx.seller_id : tx.buyer_id;
  const { data: dispute } = await supabase
    .from("disputes").select("reason, status, resolution_note, created_at").eq("transaction_id", tx.id).maybeSingle();
  const heldAt = (data as { held_at?: string | null }).held_at;
  const expiry = heldAt ? new Date(new Date(heldAt).getTime() + ESCROW_EXPIRY_DAYS * 86_400_000) : null;

  return (
    <div className="space-y-6 pt-4">
      <div>
        <p className="text-sm font-semibold text-ink-soft">{STATUS[tx.status]}</p>
        <h1 className="font-display text-3xl font-extrabold leading-tight">
          <Link href={refHref}>{ref?.title ?? "Transaction"}</Link>
        </h1>
        <p className="mt-1 font-display text-xl font-bold">{euros(tx.amount)}</p>
      </div>

      {tx.status === "held" && (isBuyer ? (
        <>
          <EscrowCodeCard transactionId={tx.id} />
          <p className="text-sm text-ink-soft">
            {tx.type === "listing"
              ? "Retrouve le vendeur dans un lieu public. Vérifie l'objet, puis donne-lui le code."
              : "Quand la mission est terminée, donne ce code à la personne pour qu'elle soit payée."}
          </p>
        </>
      ) : (
        <>
          <p className="rounded-2xl bg-white p-4">
            {tx.type === "listing"
              ? "L'acheteur a payé. À la remise, il te donne un code à 4 chiffres : tape-le ici pour recevoir l'argent."
              : "La rémunération est bloquée. À la fin de la mission, demande le code à la personne et tape-le ici."}
          </p>
          <ValidateCodeForm transactionId={tx.id} />
          <p className="text-sm text-ink-soft">
            Tu recevras {euros(Number(tx.amount) - Number(tx.platform_fee))} après la commission Studeals.
          </p>
        </>
      ))}

      {tx.status === "held" && expiry && (
        <p className="text-sm text-ink-soft">
          Sans code ni signalement avant le {expiry.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })},
          l&apos;acheteur est remboursé automatiquement.
        </p>
      )}

      {tx.status === "held" && <DisputePanel transactionId={tx.id} isBuyer={isBuyer} isGig={tx.type === "gig"} />}

      {dispute && (
        <section className="rounded-2xl bg-white p-4">
          <p className="font-semibold">
            {dispute.status === "open" ? "Litige ouvert" : "Litige traité"} :{" "}
            {DISPUTE_REASONS.find((r) => r.key === dispute.reason)?.label}
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            {dispute.status === "open"
              ? "L'équipe Studeals examine la situation. Vous recevrez tous les deux la décision par email et notification."
              : dispute.resolution_note}
          </p>
        </section>
      )}

      {tx.status === "pending" && (
        <p className="text-ink-soft">On attend la confirmation de la banque. Rafraîchis dans quelques secondes.</p>
      )}

      {other && (
        <Link href={`/messages/${other}`} className="block rounded-full border-2 border-ink py-4 text-center font-semibold">
          {isBuyer ? "Écrire au vendeur" : "Écrire à l'acheteur"}
        </Link>
      )}
    </div>
  );
}
