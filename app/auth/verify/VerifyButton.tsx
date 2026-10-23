"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { stripePromise } from "@/lib/stripe-client";

export function VerifyButton({ next, needsLegal }: { next: string; needsLegal: boolean }) {
  const router = useRouter();
  const [accepted, setAccepted] = useState(!needsLegal);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setMsg(null);
    if (needsLegal) await fetch("/api/legal/accept", { method: "POST" });
    const res = await fetch("/api/identity/session", { method: "POST" });
    const data = await res.json();
    if (!res.ok) { setMsg(data.error); setBusy(false); return; }

    const stripe = await stripePromise;
    const { error } = await stripe!.verifyIdentity(data.clientSecret);
    setBusy(false);
    if (error) { setMsg("Vérification interrompue. Tu peux recommencer."); return; }
    setMsg("Documents envoyés. Ton badge apparaît dès que la vérification est validée.");
    setTimeout(() => { router.push(next); router.refresh(); }, 2500);
  }

  return (
    <div className="mt-6 space-y-4">
      {needsLegal && (
        <label className="flex items-start gap-3 rounded-2xl bg-white p-4 text-sm">
          <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[#1a1b4b]" />
          <span>
            J&apos;ai 18 à 25 ans, je suis un particulier, et j&apos;accepte les{" "}
            <Link href="/legal/cgu" className="underline">CGU</Link> et la{" "}
            <Link href="/legal/confidentialite" className="underline">politique de confidentialité</Link>.
          </span>
        </label>
      )}
      <button onClick={start} disabled={busy || !accepted} className="w-full rounded-full bg-ink py-4 font-semibold text-white disabled:opacity-50">
        {busy ? "Ouverture…" : "Commencer la vérification"}
      </button>
      {msg && <p role="status" className="text-sm">{msg}</p>}
    </div>
  );
}
