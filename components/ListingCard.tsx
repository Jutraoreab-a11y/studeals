import Link from "next/link";
import { euros } from "@/lib/format";
import type { Listing } from "@/types/database";

export function ListingCard({ listing }: { listing: Listing }) {
  const img = listing.images[0];
  const isRoom = listing.category === "room_match";
  return (
    <Link href={`/marketplace/${listing.id}`} className="group block">
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-white">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center text-ink-soft text-sm">Sans photo</div>
        )}
        {listing.is_urgent && (
          <span className="absolute left-2 top-2 rotate-[-4deg] rounded-md bg-signal px-2 py-0.5 text-xs font-bold text-white">
            À liquider
          </span>
        )}
        <span className="absolute bottom-2 right-2 rounded-lg bg-sticker px-2 py-0.5 font-display font-extrabold shadow-[2px_2px_0_#1a1b4b]">
          {euros(listing.price)}
          {isRoom && <span className="text-xs font-semibold">/mois</span>}
        </span>
      </div>
      <p className="mt-2 line-clamp-2 text-sm font-medium leading-snug">{listing.title}</p>
    </Link>
  );
}
