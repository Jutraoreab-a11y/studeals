import { createClient } from "@/lib/supabase/server";

/** Côté acheteur : affiche le code à donner au vendeur (RLS : lisible par l'acheteur seul). */
export async function EscrowCodeCard({ transactionId }: { transactionId: string }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("escrow_codes")
    .select("code_plain, locked")
    .eq("transaction_id", transactionId)
    .maybeSingle();

  if (!data) {
    return <p className="text-ink-soft">Paiement en cours de confirmation. Rafraîchis dans quelques secondes.</p>;
  }

  return (
    <div className="rounded-3xl bg-sticker p-6 text-center shadow-[4px_4px_0_#1a1b4b]">
      <p className="font-semibold">Ton code de remise</p>
      <p className="font-display mt-2 text-6xl font-extrabold tracking-[0.2em]" aria-label={`Code ${data.code_plain.split("").join(" ")}`}>
        {data.code_plain}
      </p>
      <p className="mt-3 text-sm">
        Donne-le au vendeur seulement quand tu as l&apos;objet en main et qu&apos;il te convient.
      </p>
    </div>
  );
}
