"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function DealForm({ venueId }: { venueId: string }) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [validOn, setValidOn] = useState("");

  async function add() {
    await fetch("/api/admin/venues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "add_deal", venueId, label, validOn: validOn || undefined }),
    });
    setLabel(""); setValidOn("");
    router.refresh();
  }

  return (
    <div className="mt-2 flex gap-2">
      <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Nouvelle réduction"
        className="min-w-0 flex-1 rounded-full bg-paper px-3 py-2 text-sm" />
      <input value={validOn} onChange={(e) => setValidOn(e.target.value)} placeholder="Quand"
        className="w-24 rounded-full bg-paper px-3 py-2 text-sm" />
      <button onClick={add} disabled={label.length < 3} className="rounded-full bg-ink px-3 text-sm font-semibold text-white disabled:opacity-50">+</button>
    </div>
  );
}
