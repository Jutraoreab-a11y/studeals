import { createClient, getSessionUser } from "@/lib/supabase/server";
import { getCurrentCity } from "@/lib/city-server";
import { VipButton } from "@/components/VipButton";
import { LoginButton } from "@/components/LoginButton";
import { CheckinButton } from "./CheckinButton";

function weather(total: number) {
  if (total >= 60) return { label: "Ça déborde", hint: "Grosse soirée en ville, réserve ou arrive tôt.", level: 3 };
  if (total >= 20) return { label: "Ça bouge", hint: "Les bars se remplissent, bonne ambiance partout.", level: 2 };
  if (total > 0) return { label: "Ça frémit", hint: "Quelques groupes de sortie, rien de bondé.", level: 1 };
  return { label: "Calme plat", hint: "Personne n'a encore annoncé sa soirée. Lance la tendance.", level: 0 };
}

export default async function NightlifePage({ searchParams }: { searchParams: Promise<{ vip?: string }> }) {
  const { vip } = await searchParams;
  const city = await getCurrentCity();
  const supabase = await createClient();
  const session = await getSessionUser();
  const premium = !!session?.profile.is_premium;

  const [{ data: total }, { data: venues }, { data: dealCounts }, { data: mine }] = await Promise.all([
    supabase.rpc("nightlife_city_total", { p_city: city.id }),
    supabase.from("venues").select("id, name, type, address").eq("city_id", city.id).eq("is_active", true).order("name"),
    supabase.rpc("venue_deal_counts", { p_city: city.id }),
    session
      ? supabase.from("nightlife_checkins").select("venue_id").eq("date", new Date().toISOString().slice(0, 10))
      : Promise.resolve({ data: [] as { venue_id: string }[] }),
  ]);

  // Détails VIP (RLS + fonction : vides si non-premium)
  const [{ data: heat }, { data: deals }] = premium
    ? await Promise.all([
        supabase.rpc("nightlife_weather", { p_city: city.id }),
        supabase.from("venue_deals").select("venue_id, label, valid_on"),
      ])
    : [{ data: [] }, { data: [] }];

  const w = weather(Number(total ?? 0));
  const myVenues = new Set((mine ?? []).map((c: { venue_id: string }) => c.venue_id));
  const heatBy = new Map<string, number>(
    ((heat ?? []) as { venue_id: string; checkins: number }[]).map((h) => [h.venue_id, Number(h.checkins)]),
  );
  const dealCountBy = new Map<string, number>(
    ((dealCounts ?? []) as { venue_id: string; deals: number }[]).map((d) => [d.venue_id, Number(d.deals)]),
  );

  return (
    <div className="pt-4">
      {vip === "welcome" && (
        <p role="status" className="mb-4 rounded-2xl bg-sticker p-4 font-semibold">Bienvenue dans Studeals+. Tout est débloqué.</p>
      )}

      <section aria-label="Météo des soirées" className="rounded-3xl bg-ink p-5 text-white">
        <p className="text-sm text-white/70">Ce soir à {city.name}</p>
        <p className="font-display mt-1 text-4xl font-extrabold">{w.label}</p>
        <div className="mt-3 flex gap-1.5" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span key={i} className={`h-2 flex-1 rounded-full ${i < w.level ? "bg-sticker" : "bg-white/15"}`} />
          ))}
        </div>
        <p className="mt-3 text-sm text-white/80">{w.hint}</p>
        <p className="mt-1 text-xs text-white/50">{Number(total ?? 0)} personnes ont annoncé leur soirée. Anonyme.</p>
      </section>

      <h2 className="font-display mt-8 text-2xl font-bold">Bars partenaires</h2>
      {!venues?.length && (
        <div className="mt-3 rounded-2xl bg-white p-5">
          <p className="font-semibold">Pas encore de bar partenaire à {city.name}.</p>
          <p className="mt-1 text-sm text-ink-soft">Tu connais un bar qui devrait être là ? Envoie-lui cette page.</p>
          <a href="/partenaires" className="mt-3 inline-block rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white">Devenir partenaire</a>
        </div>
      )}
      <ul className="mt-3 space-y-3">
        {(venues ?? []).map((v) => {
          const venueDeals = (deals ?? []).filter((d: { venue_id: string }) => d.venue_id === v.id) as { label: string; valid_on: string | null }[];
          const nbDeals = dealCountBy.get(v.id) ?? 0;
          return (
            <li key={v.id} className="rounded-2xl bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{v.name}</p>
                  <p className="text-sm text-ink-soft">{v.address}</p>
                </div>
                {session && <CheckinButton venueId={v.id} userId={session.profile.id} going={myVenues.has(v.id)} />}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-xl bg-paper p-3">
                  <p className="text-ink-soft">Affluence</p>
                  {premium ? (
                    <p className="font-display text-lg font-bold">{heatBy.get(v.id) ?? 0} y vont</p>
                  ) : (
                    <p aria-label="Réservé à Studeals+" className="font-display select-none text-lg font-bold blur-sm">12 y vont</p>
                  )}
                </div>
                <div className="rounded-xl bg-paper p-3">
                  <p className="text-ink-soft">Réductions</p>
                  {premium ? (
                    venueDeals.length ? (
                      venueDeals.map((d, i) => <p key={i} className="font-semibold">{d.label}{d.valid_on ? `, ${d.valid_on}` : ""}</p>)
                    ) : <p>Aucune ce soir</p>
                  ) : (
                    <p className="font-semibold">{nbDeals ? `${nbDeals} réduction${nbDeals > 1 ? "s" : ""} cachée${nbDeals > 1 ? "s" : ""}` : "Bientôt"}</p>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {!premium && !!venues?.length && (
        <section className="sticky bottom-16 mt-6 rounded-3xl bg-white p-5 shadow-[0_-8px_24px_#1a1b4b14]">
          <p className="font-display text-xl font-bold">Vois où sont les autres avant de sortir</p>
          <p className="mb-4 mt-1 text-sm text-ink-soft">
            Affluence bar par bar et réductions partenaires. Résiliable à tout moment.
          </p>
          {session ? <VipButton /> : <LoginButton reason="Connecte-toi pour passer Studeals+." />}
        </section>
      )}
    </div>
  );
}
