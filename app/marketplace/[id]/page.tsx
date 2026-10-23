import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient, getSessionUser } from "@/lib/supabase/server";
import { euros, timeAgo } from "@/lib/format";
import { TrustBadge } from "@/components/TrustBadge";
import { PaymentSheet } from "@/components/PaymentSheet";
import { Gate } from "@/components/Gate";
import { OwnerActions } from "./OwnerActions";
import { ReportButton } from "@/components/ReportButton";
import type { Listing } from "@/types/database";

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("listings").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const listing = data as Listing;
  if (listing.status === "removed") notFound();

  const [{ data: seller }, session] = await Promise.all([
    supabase.from("public_profiles").select("id, avatar_url, is_verified").eq("id", listing.seller_id).single(),
    getSessionUser(),
  ]);

  const isOwner = session?.profile.id === listing.seller_id;
  const isRoom = listing.category === "room_match";

  return (
    <article className="pt-2">
      <div className="-mx-4 flex snap-x snap-mandatory overflow-x-auto">
        {(listing.images.length ? listing.images : [null]).map((src, i) => (
          <div key={i} className="aspect-square w-full shrink-0 snap-center bg-white">
            {src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={src} alt={`${listing.title}, photo ${i + 1}`} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-ink-soft">Sans photo</div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-start justify-between gap-4">
        <h1 className="font-display text-2xl font-extrabold leading-tight">{listing.title}</h1>
        <span className="shrink-0 rounded-xl bg-sticker px-3 py-1 font-display text-2xl font-extrabold shadow-[3px_3px_0_#1a1b4b]">
          {euros(listing.price)}
          {isRoom && <span className="text-sm">/mois</span>}
        </span>
      </div>

      <div className="mt-2 flex items-center gap-2 text-sm text-ink-soft">
        <span>{timeAgo(listing.created_at)}</span>
        {seller && <TrustBadge verified={seller.is_verified} />}
        {listing.is_urgent && <span className="font-semibold text-signal">À liquider</span>}
        {listing.status === "reserved" && <span className="font-semibold">Réservé</span>}
      </div>

      {listing.description && <p className="mt-4 whitespace-pre-line">{listing.description}</p>}

      {isRoom && (
        <p className="mt-5 rounded-2xl bg-white p-4 text-sm">
          Mise en relation uniquement. Visite, dossier et bail se font directement avec le propriétaire ou
          l&apos;agence du logement. Ne paie jamais de « frais de reprise » ni d&apos;acompte à un autre locataire.
        </p>
      )}

      <div className="mt-6 space-y-3">
        {isOwner ? (
          <OwnerActions listingId={listing.id} status={listing.status} />
        ) : !session ? (
          <Gate reason="login" next={`/marketplace/${listing.id}`} />
        ) : !session.profile.is_verified ? (
          <Gate reason="verify" next={`/marketplace/${listing.id}`} />
        ) : (
          <>
            {!isRoom && listing.status === "active" && (
              <PaymentSheet kind="listing" listingId={listing.id} amountLabel={euros(listing.price)} />
            )}
            <Link
              href={`/messages/${listing.seller_id}?listing=${listing.id}`}
              className="block rounded-full border-2 border-ink py-4 text-center font-semibold"
            >
              {isRoom ? "Contacter pour la chambre" : "Écrire au vendeur"}
            </Link>
          </>
        )}
      </div>

      {!isRoom && (
        <p className="mt-6 text-xs text-ink-soft">
          Vente entre particuliers : le vendeur n&apos;est pas un professionnel, le droit de la consommation
          (garantie légale de conformité, droit de rétractation) ne s&apos;applique pas. Ton paiement reste protégé par
          le séquestre Studeals et la procédure de litige.
        </p>
      )}
      {!isOwner && session && (
        <div className="mt-4 flex gap-4">
          <ReportButton targetType="listing" targetId={listing.id} label="Signaler l'annonce" />
          <ReportButton targetType="user" targetId={listing.seller_id} label="Signaler le vendeur" />
        </div>
      )}
    </article>
  );
}
