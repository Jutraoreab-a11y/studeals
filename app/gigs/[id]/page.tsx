import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient, getSessionUser } from "@/lib/supabase/server";
import { euros, timeAgo, gigCategoryLabel } from "@/lib/format";
import { Gate } from "@/components/Gate";
import { TrustBadge } from "@/components/TrustBadge";
import { PaymentSheet } from "@/components/PaymentSheet";
import { ApplyButton } from "./ApplyButton";
import { ReportButton } from "@/components/ReportButton";
import type { Gig } from "@/types/database";

export default async function GigPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("gigs").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const gig = data as Gig & { category: string };
  const session = await getSessionUser();
  const me = session?.profile.id;
  const isRequester = me === gig.requester_id;

  // Transaction liée (si la mission a été attribuée et payée)
  const { data: tx } = me
    ? await supabase.from("transactions").select("id").eq("reference_id", gig.id).in("status", ["held", "released"]).maybeSingle()
    : { data: null };

  let applicants: { worker_id: string; note: string | null; is_verified: boolean }[] = [];
  let alreadyApplied = false;
  if (me) {
    const { data: apps } = await supabase.from("gig_applications").select("worker_id, note").eq("gig_id", gig.id);
    alreadyApplied = !!apps?.some((a) => a.worker_id === me);
    if (isRequester && apps?.length) {
      const { data: profiles } = await supabase
        .from("public_profiles")
        .select("id, is_verified")
        .in("id", apps.map((a) => a.worker_id));
      applicants = apps.map((a) => ({ ...a, is_verified: !!profiles?.find((p) => p.id === a.worker_id)?.is_verified }));
    }
  }

  return (
    <article className="pt-4">
      <p className="text-sm font-semibold text-ink-soft">
        {gig.is_sos && <span className="text-signal">SOS </span>}
        {gigCategoryLabel(gig.category)}, {timeAgo(gig.created_at)}
      </p>
      <div className="mt-1 flex items-start justify-between gap-4">
        <h1 className="font-display text-3xl font-extrabold leading-tight">{gig.title}</h1>
        <span className="shrink-0 rounded-xl bg-sticker px-3 py-1 font-display text-2xl font-extrabold shadow-[3px_3px_0_#1a1b4b]">
          {euros(gig.reward_amount)}
        </span>
      </div>
      {gig.description && <p className="mt-4 whitespace-pre-line">{gig.description}</p>}

      <div className="mt-8 space-y-4">
        {!session ? (
          <Gate reason="login" next={`/gigs/${gig.id}`} />
        ) : !session.profile.is_verified ? (
          <Gate reason="verify" next={`/gigs/${gig.id}`} />
        ) : tx && (isRequester || me === gig.worker_id) ? (
          <Link href={`/purchases/${tx.id}`} className="block rounded-full bg-ink py-4 text-center font-semibold text-white">
            {isRequester ? "Voir mon code de validation" : "Saisir le code de fin de mission"}
          </Link>
        ) : isRequester ? (
          gig.status !== "open" ? (
            <p className="text-ink-soft">Mission attribuée, paiement en cours de confirmation.</p>
          ) : applicants.length === 0 ? (
            <p className="rounded-2xl bg-white p-4 text-ink-soft">Pas encore de volontaire. Les personnes intéressées apparaîtront ici.</p>
          ) : (
            <section>
              <h2 className="font-display text-xl font-bold">Volontaires ({applicants.length})</h2>
              <p className="text-sm text-ink-soft">Choisis quelqu&apos;un : la rémunération est bloquée jusqu&apos;à la fin de la mission.</p>
              <ul className="mt-3 space-y-3">
                {applicants.map((a) => (
                  <li key={a.worker_id} className="rounded-2xl bg-white p-4">
                    <div className="flex items-center justify-between">
                      <TrustBadge verified={a.is_verified} />
                      <Link href={`/messages/${a.worker_id}?gig=${gig.id}`} className="text-sm font-semibold underline">Écrire</Link>
                    </div>
                    {a.note && <p className="mt-2 text-sm">{a.note}</p>}
                    <div className="mt-3">
                      <PaymentSheet kind="gig" gigId={gig.id} workerId={a.worker_id} amountLabel={euros(gig.reward_amount)} />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )
        ) : gig.status === "open" ? (
          <>
            <ApplyButton gigId={gig.id} userId={me!} applied={alreadyApplied} />
            <Link href={`/messages/${gig.requester_id}?gig=${gig.id}`} className="block rounded-full border-2 border-ink py-4 text-center font-semibold">
              Poser une question
            </Link>
          </>
        ) : (
          <p className="text-ink-soft">Cette mission a déjà trouvé quelqu&apos;un.</p>
        )}
      </div>
      {session && !isRequester && (
        <div className="mt-6"><ReportButton targetType="gig" targetId={gig.id} label="Signaler la mission" /></div>
      )}
    </article>
  );
}
