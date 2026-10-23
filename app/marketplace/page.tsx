import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCity } from "@/lib/city-server";
import { LISTING_FILTERS } from "@/lib/format";
import { Chips } from "@/components/Chips";
import { ListingCard } from "@/components/ListingCard";
import type { Listing } from "@/types/database";

type Filter = (typeof LISTING_FILTERS)[number]["key"];

export default async function MarketplacePage({ searchParams }: { searchParams: Promise<{ f?: string; q?: string }> }) {
  const { f = "all", q } = await searchParams;
  const filter = (LISTING_FILTERS.some((x) => x.key === f) ? f : "all") as Filter;
  const city = await getCurrentCity();
  const supabase = await createClient();

  let query = supabase
    .from("listings")
    .select("*")
    .eq("city_id", city.id)
    .eq("status", "active")
    .order("is_urgent", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(60);

  if (filter === "room") query = query.eq("category", "room_match");
  if (filter === "furniture") query = query.eq("category", "goods").eq("subcategory", "furniture_office");
  if (filter === "items") query = query.eq("category", "goods").eq("subcategory", "items");
  if (q) query = query.ilike("title", `%${q}%`);

  const { data } = await query;
  const listings = (data ?? []) as Listing[];

  return (
    <div className="pt-4">
      <div className="flex items-end justify-between">
        <h1 className="font-display text-3xl font-extrabold">Trouvailles à {city.name}</h1>
      </div>

      <form className="mt-4" role="search">
        <input
          name="q"
          defaultValue={q}
          placeholder="Bureau, micro-ondes, chambre…"
          aria-label="Rechercher"
          className="w-full rounded-full bg-white px-5 py-3.5 focus:outline-2 focus:outline-ink"
        />
        {filter !== "all" && <input type="hidden" name="f" value={filter} />}
      </form>

      <div className="mt-4">
        <Chips
          items={LISTING_FILTERS}
          active={filter}
          hrefFor={(k) => `/marketplace?f=${k}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
        />
      </div>

      {filter === "room" && (
        <p className="mt-4 rounded-2xl bg-white p-4 text-sm">
          Mise en relation uniquement. Le bail se signe directement avec le propriétaire : aucune sous-location
          ni reprise de bail payante sur Studeals.
        </p>
      )}

      {listings.length === 0 ? (
        <div className="mt-12 text-center">
          <p className="font-display text-xl font-bold">Rien ici pour l&apos;instant.</p>
          <p className="mt-1 text-ink-soft">Sois la première annonce de ta ville dans cette catégorie.</p>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-5">
          {listings.map((l) => <ListingCard key={l.id} listing={l} />)}
        </div>
      )}

      <p className="mt-8 text-xs text-ink-soft">
        Classement : annonces « À liquider » d&apos;abord, puis les plus récentes. Aucune mise en avant payante.
        Toutes les annonces sont publiées par des particuliers vérifiés.{" "}
        <Link href="/legal/cgu#classement" className="underline">En savoir plus</Link>
      </p>

      <Link
        href="/marketplace/new"
        className="fixed bottom-20 right-4 z-20 rounded-full bg-sticker px-6 py-4 font-display text-lg font-extrabold shadow-[3px_3px_0_#1a1b4b]"
      >
        + Vendre
      </Link>
    </div>
  );
}
