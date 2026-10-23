import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCity } from "@/lib/city-server";
import { euros, timeAgo, gigCategoryLabel } from "@/lib/format";
import { SosLive } from "./SosLive";
import type { Gig } from "@/types/database";

export default async function GigsPage() {
  const city = await getCurrentCity();
  const supabase = await createClient();
  const { data } = await supabase
    .from("gigs")
    .select("*")
    .eq("city_id", city.id)
    .eq("status", "open")
    .order("is_sos", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);
  const gigs = (data ?? []) as (Gig & { category: string })[];

  return (
    <div className="pt-4">
      <h1 className="font-display text-3xl font-extrabold">Coups de main à {city.name}</h1>
      <p className="mt-1 text-ink-soft">Courses, laverie, déménagement, petits jobs en ligne. Payé à la fin, via code.</p>

      <Link
        href="/gigs/new?sos=1"
        className="mt-5 flex items-center justify-between rounded-3xl bg-signal px-5 py-4 text-white shadow-[4px_4px_0_#1a1b4b]"
      >
        <span>
          <span className="font-display block text-2xl font-extrabold">Mode SOS</span>
          <span className="text-sm text-white/90">Besoin de quelqu&apos;un dans l&apos;heure ? Alerte tout le quartier.</span>
        </span>
        <span aria-hidden className="font-display text-4xl font-extrabold">!</span>
      </Link>

      <SosLive cityId={city.id} />

      <ul className="mt-6 space-y-3">
        {gigs.length === 0 && (
          <li className="py-10 text-center text-ink-soft">Aucune mission ouverte. Publie la tienne.</li>
        )}
        {gigs.map((g) => (
          <li key={g.id}>
            <Link
              href={`/gigs/${g.id}`}
              className={`flex items-center gap-4 rounded-2xl p-4 ${g.is_sos ? "border-2 border-signal bg-white" : "bg-white"}`}
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-ink-soft">
                  {g.is_sos ? <span className="text-signal">SOS </span> : null}
                  {gigCategoryLabel(g.category)}, {timeAgo(g.created_at)}
                </p>
                <p className="mt-0.5 truncate font-semibold">{g.title}</p>
              </div>
              <span className="font-display shrink-0 text-xl font-extrabold">{euros(g.reward_amount)}</span>
            </Link>
          </li>
        ))}
      </ul>

      <Link
        href="/gigs/new"
        className="fixed bottom-20 right-4 z-20 rounded-full bg-sticker px-6 py-4 font-display text-lg font-extrabold shadow-[3px_3px_0_#1a1b4b]"
      >
        + Demander
      </Link>
    </div>
  );
}
