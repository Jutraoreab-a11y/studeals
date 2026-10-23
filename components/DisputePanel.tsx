"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { DISPUTE_REASONS } from "@/lib/legal";

/** « Signaler un problème » sur une transaction en séquestre. */
export function DisputePanel({ transactionId, isBuyer, isGig }: { transactionId: string; isBuyer: boolean; isGig: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reasons = DISPUTE_REASONS.filter((r) => {
    if (r.key === "code_not_given") return !isBuyer;
    if (r.key === "mission_not_done") return isGig && isBuyer;
    if (r.key === "not_as_described" || r.key === "damaged") return isBuyer && !isGig;
    return true;
  });

  async function submit() {
    setBusy(true);
    const res = await fetch("/api/disputes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transactionId, reason, details: details || undefined }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error);
    router.refresh();
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="w-full rounded-full border-2 border-signal py-3.5 font-semibold text-signal">
        Signaler un problème
      </button>
    );
  }

  return (
    <div className="rounded-3xl bg-white p-5">
      <p className="font-display text-xl font-bold">Qu&apos;est-ce qui s&apos;est passé ?</p>
      <p className="mt-1 text-sm text-ink-soft">
        L&apos;argent reste bloqué pendant qu&apos;on examine. Réponse sous 72 h en général.
      </p>
      <div className="mt-3 space-y-2">
        {reasons.map((r) => (
          <label key={r.key} className={`flex items-center gap-3 rounded-2xl p-3 ${reason === r.key ? "bg-ink text-white" : "bg-paper"}`}>
            <input type="radio" name="dispute" className="sr-only" checked={reason === r.key} onChange={() => setReason(r.key)} />
            {r.label}
          </label>
        ))}
      </div>
      <textarea
        value={details} onChange={(e) => setDetails(e.target.value)} rows={3} maxLength={2000}
        placeholder="Raconte-nous en quelques lignes. Tu peux aussi joindre des photos via la messagerie."
        className="mt-3 w-full rounded-2xl border-2 border-ink/15 px-4 py-3 focus:border-ink focus:outline-none"
      />
      {error && <p role="alert" className="mt-2 text-sm text-signal">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button onClick={() => setOpen(false)} className="flex-1 rounded-full py-3.5 font-semibold">Annuler</button>
        <button onClick={submit} disabled={!reason || busy} className="flex-1 rounded-full bg-signal py-3.5 font-semibold text-white disabled:opacity-50">
          {busy ? "Envoi…" : "Envoyer"}
        </button>
      </div>
    </div>
  );
}
