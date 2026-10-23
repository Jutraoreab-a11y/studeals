"use client";
import { useState } from "react";
import { REPORT_REASONS } from "@/lib/legal";

/** Bouton « Signaler » (annonce, mission, profil, message). */
export function ReportButton({ targetType, targetId, label = "Signaler" }: {
  targetType: "listing" | "gig" | "user" | "message"; targetId: string; label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setState("busy");
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetType, targetId, reason, details: details || undefined }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); setState("idle"); return; }
    setState("done");
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="text-sm text-ink-soft underline">{label}</button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={() => setOpen(false)}>
          <div
            role="dialog" aria-modal="true" aria-label="Signaler"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
          >
            {state === "done" ? (
              <>
                <p className="font-display text-xl font-bold">Merci, c&apos;est envoyé.</p>
                <p className="mt-1 text-ink-soft">L&apos;équipe Studeals examine chaque signalement. Au bout de 3 signalements, le contenu est masqué en attendant.</p>
                <button onClick={() => setOpen(false)} className="mt-4 w-full rounded-full bg-ink py-3.5 font-semibold text-white">Fermer</button>
              </>
            ) : (
              <>
                <p className="font-display text-xl font-bold">Quel est le problème ?</p>
                <div className="mt-3 space-y-2">
                  {REPORT_REASONS.map((r) => (
                    <label key={r.key} className={`flex items-center gap-3 rounded-2xl p-3 ${reason === r.key ? "bg-ink text-white" : "bg-paper"}`}>
                      <input type="radio" name="reason" className="sr-only" checked={reason === r.key} onChange={() => setReason(r.key)} />
                      {r.label}
                    </label>
                  ))}
                </div>
                <textarea
                  value={details} onChange={(e) => setDetails(e.target.value)} maxLength={1000} rows={2}
                  placeholder="Précisions (facultatif)"
                  className="mt-3 w-full rounded-2xl border-2 border-ink/15 px-4 py-3 focus:border-ink focus:outline-none"
                />
                {error && <p role="alert" className="mt-2 text-sm text-signal">{error}</p>}
                <button onClick={send} disabled={!reason || state === "busy"} className="mt-3 w-full rounded-full bg-ink py-3.5 font-semibold text-white disabled:opacity-50">
                  {state === "busy" ? "Envoi…" : "Envoyer le signalement"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
