"use client";
import { useState } from "react";

/** Côté vendeur / worker : saisie du code pour libérer le paiement. */
export function ValidateCodeForm({ transactionId }: { transactionId: string }) {
  const [code, setCode] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setState("busy");
    setError(null);
    const res = await fetch("/api/escrow/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transactionId, code }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      setState("idle");
      return;
    }
    setState("done");
  }

  if (state === "done") {
    return <p className="rounded-2xl bg-trust/15 p-4 font-semibold">Paiement libéré. Le virement arrive sur ton compte.</p>;
  }

  return (
    <div className="space-y-3">
      <label htmlFor="code" className="block font-semibold">Code donné par l&apos;acheteur</label>
      <input
        id="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="\d{4}"
        maxLength={4}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
        className="font-display w-full rounded-2xl border-2 border-ink bg-white py-4 text-center text-4xl tracking-[0.4em]"
      />
      <button
        onClick={submit}
        disabled={code.length !== 4 || state === "busy"}
        className="w-full rounded-full bg-ink py-4 font-semibold text-white disabled:opacity-50"
      >
        {state === "busy" ? "Vérification…" : "Valider la remise"}
      </button>
      {error && <p role="alert" className="text-sm text-signal">{error}</p>}
    </div>
  );
}
