import { Gate } from "@/components/Gate";
import { getSessionUser } from "@/lib/supabase/server";
import { TrustBadge } from "@/components/TrustBadge";
import { VerifyButton } from "./VerifyButton";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCity } from "@/lib/city-server";
import { LEGAL_VERSION } from "@/lib/legal";

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next = "/marketplace" } = await searchParams;
  const session = await getSessionUser();
  if (!session) return <Gate reason="login" next="/auth/verify" message="Connecte-toi d'abord : la vérification est rattachée à ton compte." />;
  const { profile } = session;

  // Rattache le profil à la ville choisie (indispensable pour les alertes SOS)
  if (!profile.city_id) {
    const city = await getCurrentCity();
    await (await createClient()).from("users").update({ city_id: city.id }).eq("id", profile.id);
  }
  const needsLegal = profile.legal_version !== LEGAL_VERSION;

  if (profile.is_verified) {
    return (
      <div className="pt-8">
        <TrustBadge verified size="md" />
        <h1 className="font-display mt-3 text-3xl font-extrabold">Tu as ton Badge de Confiance.</h1>
        <a href={next} className="mt-6 block rounded-full bg-ink py-4 text-center font-semibold text-white">Continuer</a>
      </div>
    );
  }

  return (
    <div className="pt-8">
      <h1 className="font-display text-3xl font-extrabold leading-tight">Badge de Confiance</h1>
      <p className="mt-3 text-ink-soft">
        Obligatoire pour vendre, acheter, proposer ou prendre une mission. On vérifie que tu es une vraie
        personne, et que tu as entre 18 et 25 ans.
      </p>
      <ol className="mt-6 space-y-3">
        <li className="rounded-2xl bg-white p-4"><b>Ta pièce d&apos;identité</b>, recto-verso, photographiée avec ton téléphone.</li>
        <li className="rounded-2xl bg-white p-4"><b>Un selfie</b>, comparé à la photo du document.</li>
        <li className="rounded-2xl bg-white p-4"><b>Validation</b>, en général en moins d&apos;une minute.</li>
      </ol>
      <p className="mt-4 text-xs text-ink-soft">
        La vérification est réalisée par Stripe Identity. Studeals ne stocke ni ta pièce d&apos;identité ni ton selfie,
        seulement le résultat et ta date de naissance.
      </p>
      <VerifyButton next={next} needsLegal={needsLegal} />
    </div>
  );
}
