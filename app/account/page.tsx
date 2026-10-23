import Link from "next/link";
import { createClient, getSessionUser } from "@/lib/supabase/server";
import { getCurrentCity } from "@/lib/city-server";
import { euros, timeAgo, ageFrom } from "@/lib/format";
import { displayName } from "@/lib/profile";
import { TrustBadge } from "@/components/TrustBadge";
import { Avatar } from "@/components/Avatar";
import { Gate } from "@/components/Gate";
import { AlertForm } from "./AlertForm";
import type { Listing, Transaction } from "@/types/database";

export default async function AccountPage() {
  const session = await getSessionUser();
  if (!session) {
    return (
      <>
        <h1 className="font-display pt-4 text-3xl font-extrabold">Moi</h1>
        <Gate reason="login" next="/account" message="Retrouve tes ventes, tes achats, tes messages et tes alertes. Tu restes sur cette page." />
      </>
    );
  }
  const { profile } = session;
  const supabase = await createClient();
  const city = await getCurrentCity();

  const [{ data: listings }, { data: txs }, { data: notifs }, { data: alerts }] = await Promise.all([
    supabase.from("listings").select("*").eq("seller_id", profile.id).order("created_at", { ascending: false }).limit(20),
    supabase.from("transactions").select("*").in("type", ["listing", "gig"]).neq("status", "pending").order("created_at", { ascending: false }).limit(20),
    supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(10),
    supabase.from("alerts").select("*").order("keyword"),
  ]);
  const name = displayName(profile);

  return (
    <div className="space-y-8 pt-4">
      <section className="flex items-center gap-4">
        <Avatar name={name} url={profile.avatar_url} verified={profile.is_verified} size={60} />
        <div className="min-w-0 flex-1">
          <h1 className="font-display truncate text-3xl font-extrabold">{name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-soft">
            <TrustBadge verified={profile.is_verified} />
            <span>
              {city.name}
              {profile.birth_date ? `, ${ageFrom(profile.birth_date)} ans` : ""}
            </span>
          </div>
        </div>
        <Link href="/settings" aria-label="Paramètres" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white">
          <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
          </svg>
        </Link>
      </section>

      {!profile.is_verified && (
        <Link href="/auth/verify" className="block rounded-2xl bg-sticker p-4 font-semibold shadow-[3px_3px_0_#1a1b4b]">
          Obtenir mon Badge de Confiance pour vendre et acheter
        </Link>
      )}

      {profile.is_admin && (
        <Link href="/admin" className="flex items-center justify-between rounded-2xl bg-ink p-4 font-semibold text-white">
          Espace admin <span aria-hidden>›</span>
        </Link>
      )}

      {!!notifs?.length && (
        <section>
          <h2 className="font-display text-xl font-bold">Notifications</h2>
          <ul className="mt-3 space-y-2">
            {notifs.map((n) => (
              <li key={n.id}>
                <Link href={n.href ?? "#"} className={`block rounded-2xl bg-white p-4 ${n.read_at ? "text-ink-soft" : "font-semibold"}`}>
                  {n.title}
                  <span className="block text-xs font-normal text-ink-soft">{timeAgo(n.created_at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="font-display text-xl font-bold">Mes ventes et achats</h2>
        {!txs?.length ? (
          <p className="mt-2 text-ink-soft">Rien pour l&apos;instant.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {(txs as Transaction[]).map((t) => (
              <li key={t.id}>
                <Link href={`/purchases/${t.id}`} className="flex items-center justify-between rounded-2xl bg-white p-4">
                  <span>
                    <span className="font-semibold">{t.buyer_id === profile.id ? "Achat" : "Vente"}</span>
                    <span className="block text-sm text-ink-soft">
                      {t.status === "held" ? "Remise à faire" : t.status === "released" ? "Terminé" : t.status === "disputed" ? "Litige en cours" : "Remboursé"}
                    </span>
                  </span>
                  <span className="font-display text-lg font-bold">{euros(t.amount)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="font-display text-xl font-bold">Mes annonces</h2>
        {!listings?.length ? (
          <Link href="/marketplace/new" className="mt-2 block text-ink-soft underline">Publier ma première annonce</Link>
        ) : (
          <ul className="mt-3 space-y-2">
            {(listings as Listing[]).map((l) => (
              <li key={l.id}>
                <Link href={`/marketplace/${l.id}`} className="flex items-center justify-between rounded-2xl bg-white p-4">
                  <span className="truncate pr-3">{l.title}</span>
                  <span className="shrink-0 text-sm text-ink-soft">
                    {l.status === "active" ? "En ligne" : l.status === "reserved" ? "Réservé" : l.status === "removed" ? "Retirée" : "Vendu"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="font-display text-xl font-bold">Mes alertes à {city.name}</h2>
        <p className="text-sm text-ink-soft">Sois prévenu·e dès qu&apos;une annonce correspond.</p>
        <AlertForm cityId={city.id} userId={profile.id} alerts={alerts ?? []} />
      </section>

      <footer className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-ink-soft">
        <Link href="/legal/cgu" className="underline">CGU</Link>
        <Link href="/legal/cgv" className="underline">CGV Studeals+</Link>
        <Link href="/legal/confidentialite" className="underline">Confidentialité</Link>
        <Link href="/legal/mentions" className="underline">Mentions légales</Link>
        <Link href="/partenaires" className="underline">Bars partenaires</Link>
      </footer>
    </div>
  );
}
