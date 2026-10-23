"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function ApplyButton({ gigId, userId, applied }: { gigId: string; userId: string; applied: boolean }) {
  const supabase = createClient();
  const [done, setDone] = useState(applied);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function apply() {
    setBusy(true);
    const { error } = await supabase.from("gig_applications").insert({ gig_id: gigId, worker_id: userId, note: note || null });
    setBusy(false);
    if (error) return setError("Impossible de te proposer. As-tu activé tes paiements dans ton profil ?");
    setDone(true);
  }

  async function withdraw() {
    setBusy(true);
    await supabase.from("gig_applications").delete().eq("gig_id", gigId).eq("worker_id", userId);
    setBusy(false);
    setDone(false);
  }

  if (done) {
    return (
      <div className="rounded-2xl bg-trust/15 p-4">
        <p className="font-semibold">Tu t&apos;es proposé·e.</p>
        <p className="text-sm">Tu seras prévenu·e si la personne te choisit. Pour être payé·e, ton IBAN et tes infos fiscales doivent être renseignés dans ton profil.</p>
        <button onClick={withdraw} disabled={busy} className="mt-2 text-sm underline">Retirer ma proposition</button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={280}
        rows={2}
        placeholder="Un mot pour te présenter (facultatif)"
        className="w-full rounded-2xl border-2 border-ink/15 bg-white px-4 py-3 focus:border-ink focus:outline-none"
      />
      <button onClick={apply} disabled={busy} className="w-full rounded-full bg-ink py-4 font-semibold text-white disabled:opacity-60">
        {busy ? "Envoi…" : "Je peux le faire"}
      </button>
      {error && <p role="alert" className="text-sm text-signal">{error}</p>}
    </div>
  );
}
