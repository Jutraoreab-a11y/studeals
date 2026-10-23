"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Option = { label: string; body: Record<string, unknown>; tone?: "danger" | "primary"; needsNote?: boolean };

/** Boutons d'action admin. Les décisions qui touchent un membre exigent un motif écrit. */
export function AdminAction({ endpoint, options, noteKey = "decision" }: { endpoint: string; options: Option[]; noteKey?: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const anyNote = options.some((o) => o.needsNote !== false);

  async function run(o: Option) {
    setBusy(true);
    setError(null);
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...o.body, ...(o.needsNote !== false ? { [noteKey]: note } : {}) }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Erreur");
    setNote("");
    router.refresh();
  }

  return (
    <div className="mt-3 space-y-2">
      {anyNote && (
        <textarea
          value={note} onChange={(e) => setNote(e.target.value)} rows={2}
          placeholder="Motif de la décision (envoyé aux personnes concernées)"
          className="w-full rounded-xl border-2 border-ink/15 bg-white px-3 py-2 text-sm focus:border-ink focus:outline-none"
        />
      )}
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.label} onClick={() => run(o)} disabled={busy}
            className={`rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-50 ${
              o.tone === "danger" ? "bg-signal text-white" : o.tone === "primary" ? "bg-ink text-white" : "bg-paper"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      {error && <p role="alert" className="text-sm text-signal">{error}</p>}
    </div>
  );
}
