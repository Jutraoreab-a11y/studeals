"use client";
import { useState } from "react";

export function VipButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setBusy(true);
    const res = await fetch("/api/subscription/checkout", { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      setBusy(false);
      return;
    }
    window.location.href = data.url;
  }

  return (
    <div>
      <button onClick={go} disabled={busy} className="w-full rounded-full bg-sticker py-4 font-semibold text-ink">
        {busy ? "Ouverture…" : "Passer Studeals+ pour 4,99 €/mois"}
      </button>
      {error && <p role="alert" className="mt-2 text-sm text-signal">{error}</p>}
    </div>
  );
}
