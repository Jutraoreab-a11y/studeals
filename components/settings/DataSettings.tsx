"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLogin } from "@/components/LoginProvider";
import { Row, Section, field, linkBtn } from "./Section";

export function DataSettings() {
  const router = useRouter();
  const { toast } = useLogin();
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function deleteAccount() {
    if (typed.trim() !== "SUPPRIMER") return setError("Tape SUPPRIMER en majuscules.");
    setBusy(true);
    const res = await fetch("/api/account/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: typed.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setBusy(false); return setError(data.error ?? "Suppression impossible."); }
    await createClient().auth.signOut({ scope: "local" });
    router.replace("/");
    router.refresh();
    toast("Compte supprimé", "Merci d'avoir utilisé Studeals.");
  }

  return (
    <Section title="Données et confidentialité">
      <Row
        label="Télécharger mes données"
        sub="Profil, annonces, transactions et messages, au format JSON"
        action={<a href="/api/account/export" className={linkBtn}>Télécharger</a>}
      />
      <Row
        label="Documents légaux"
        sub={
          <span className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-ink">
            <Link href="/legal/cgu" className="underline">CGU</Link>
            <Link href="/legal/cgv" className="underline">CGV</Link>
            <Link href="/legal/confidentialite" className="underline">Confidentialité</Link>
            <Link href="/legal/mentions" className="underline">Mentions légales</Link>
          </span>
        }
      />
      <Row
        label="Supprimer mon compte"
        sub="Tes annonces sont retirées et tu es déconnecté·e partout"
        action={!confirming && <button onClick={() => setConfirming(true)} className={`${linkBtn} text-signal`}>Supprimer</button>}
      >
        {confirming && (
          <div className="space-y-2">
            <p className="text-sm text-ink-soft">
              Impossible tant qu&apos;une vente, un achat ou un litige est en cours. Les données de paiement et fiscales
              restent conservées le temps imposé par la loi (10 ans).
            </p>
            <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Tape SUPPRIMER" aria-label="Tape SUPPRIMER pour confirmer" autoComplete="off" className={field} />
            {error && <p role="alert" className="text-sm text-signal">{error}</p>}
            <div className="flex items-center gap-4">
              <button onClick={deleteAccount} disabled={busy} className="rounded-full bg-signal px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {busy ? "Suppression…" : "Supprimer définitivement"}
              </button>
              <button onClick={() => { setConfirming(false); setTyped(""); setError(null); }} className={linkBtn}>Annuler</button>
            </div>
          </div>
        )}
      </Row>
    </Section>
  );
}

export function LogoutButton() {
  const router = useRouter();
  const { toast } = useLogin();
  return (
    <button
      onClick={async () => { await createClient().auth.signOut(); router.replace("/"); router.refresh(); toast("Déconnecté·e", "À bientôt sur Studeals."); }}
      className="mt-8 w-full rounded-full border-2 border-ink py-3.5 font-semibold"
    >
      Se déconnecter
    </button>
  );
}
