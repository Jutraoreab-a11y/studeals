import { createClient } from "@/lib/supabase/server";
import { PartnerForm } from "./PartnerForm";

export const metadata = { title: "Devenir bar partenaire — Studeals" };

export default async function PartnersPage() {
  const supabase = await createClient();
  const { data: cities } = await supabase.from("cities").select("id, name").order("name");

  return (
    <div className="pt-6">
      <h1 className="font-display text-4xl font-extrabold leading-none">Remplis ton bar les soirs creux.</h1>
      <p className="mt-3 text-lg text-ink-soft">
        Studeals montre à des milliers d&apos;étudiants de ta ville où sortir ce soir. Tu proposes une réduction,
        on t&apos;envoie du monde.
      </p>

      <dl className="mt-8 space-y-5">
        <div>
          <dt className="font-semibold">Gratuit pour toi</dt>
          <dd className="text-ink-soft">Aucun abonnement, aucune commission. Ta seule contrepartie : une offre réservée aux membres Studeals+.</dd>
        </div>
        <div>
          <dt className="font-semibold">Tu sais combien vont venir</dt>
          <dd className="text-ink-soft">Les étudiants annoncent « J&apos;y vais ce soir ». On t&apos;envoie le récap chaque semaine.</dd>
        </div>
        <div>
          <dt className="font-semibold">Tu gardes la main</dt>
          <dd className="text-ink-soft">Tu changes ton offre quand tu veux, tu arrêtes quand tu veux, sans préavis.</dd>
        </div>
      </dl>

      <section className="mt-10 rounded-3xl bg-white p-5">
        <h2 className="font-display text-2xl font-bold">Candidater</h2>
        <p className="mt-1 text-sm text-ink-soft">On te rappelle sous 48 h pour valider ensemble l&apos;offre.</p>
        <PartnerForm cities={cities ?? []} />
      </section>
    </div>
  );
}
