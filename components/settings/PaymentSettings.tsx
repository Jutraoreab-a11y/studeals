"use client";
import Link from "next/link";
import { useState } from "react";
import { useLogin } from "@/components/LoginProvider";
import { TrustBadge } from "@/components/TrustBadge";
import { Row, Section, linkBtn } from "./Section";

export function VerificationSettings({ verified, age }: { verified: boolean; age: number | null }) {
  return (
    <Section title="Vérification">
      <Row
        label="Badge de Confiance"
        sub={verified ? "Pièce d'identité et selfie vérifiés par Stripe Identity" : "Obligatoire pour vendre, acheter et faire des missions"}
        action={verified ? <TrustBadge verified /> : <Link href="/auth/verify" className={linkBtn}>Vérifier</Link>}
      />
      {verified && age !== null && <Row label="Âge" sub={`${age} ans, lu sur ta pièce d'identité`} />}
    </Section>
  );
}

export function PaymentSettings({ verified, payoutsEnabled, premium, children }: {
  verified: boolean; payoutsEnabled: boolean; premium: boolean; children?: React.ReactNode;
}) {
  const { toast } = useLogin();
  const [busy, setBusy] = useState<string | null>(null);

  async function go(key: string, endpoint: string) {
    setBusy(key);
    const res = await fetch(endpoint, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.url) { window.location.href = data.url; return; }
    setBusy(null);
    toast("Action impossible", data.error);
  }

  return (
    <Section title="Paiements" note="Ton IBAN est saisi sur la page sécurisée de Stripe : Studeals ne le voit jamais en entier.">
      <Row
        label="Compte bancaire"
        sub={!verified ? "Disponible après la vérification d'identité"
          : payoutsEnabled ? "Activé : tes ventes et missions arrivent sur ton compte" : "Ajoute ton IBAN pour être payé·e"}
        action={verified && (
          <button onClick={() => go("connect", "/api/connect/onboard")} disabled={!!busy} className={linkBtn}>
            {busy === "connect" ? "Ouverture…" : payoutsEnabled ? "Modifier" : "Ajouter"}
          </button>
        )}
      />
      <Row
        label="Studeals+"
        sub={premium ? "Actif, 4,99 €/mois. Résiliable à tout moment." : "Affluence des bars et réductions partenaires, 4,99 €/mois"}
        action={
          <button onClick={() => go("vip", premium ? "/api/subscription/portal" : "/api/subscription/checkout")} disabled={!!busy} className={linkBtn}>
            {busy === "vip" ? "Ouverture…" : premium ? "Gérer ou résilier" : "S'abonner"}
          </button>
        }
      />
      {children}
    </Section>
  );
}
