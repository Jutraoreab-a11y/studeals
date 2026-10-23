import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { Gate } from "@/components/Gate";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient, getSessionUser } from "@/lib/supabase/server";
import { euros, timeAgo } from "@/lib/format";
import { DISPUTE_REASONS, REPORT_REASONS } from "@/lib/legal";
import { AdminAction } from "./AdminAction";
import { DealForm } from "./DealForm";

const TABS = [
  { key: "disputes", label: "Litiges" },
  { key: "reports", label: "Signalements" },
  { key: "venues", label: "Bars" },
  { key: "dac7", label: "DAC7" },
] as const;

export const metadata = { title: "Admin — Studeals", robots: { index: false } };

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ tab?: string; year?: string }> }) {
  if (!(await getSessionUser())) return <Gate reason="login" next="/admin" />;
  if (!(await requireAdmin())) notFound();
  const { tab = "disputes", year } = await searchParams;

  const [{ count: nDisputes }, { count: nReports }, { count: nApps }] = await Promise.all([
    supabaseAdmin.from("disputes").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabaseAdmin.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabaseAdmin.from("venue_applications").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);
  const badge: Record<string, number> = { disputes: nDisputes ?? 0, reports: nReports ?? 0, venues: nApps ?? 0 };

  return (
    <div className="pt-4">
      <h1 className="font-display text-3xl font-extrabold">Admin</h1>
      <nav className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4">
        {TABS.map((t) => (
          <Link key={t.key} href={`/admin?tab=${t.key}`} aria-current={tab === t.key ? "page" : undefined}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${tab === t.key ? "bg-ink text-white" : "bg-white"}`}>
            {t.label}{badge[t.key] ? ` (${badge[t.key]})` : ""}
          </Link>
        ))}
      </nav>
      <div className="mt-6">
        {tab === "disputes" && <Disputes />}
        {tab === "reports" && <Reports />}
        {tab === "venues" && <Venues />}
        {tab === "dac7" && <Dac7 year={Number(year ?? new Date().getFullYear() - 1)} />}
      </div>
    </div>
  );
}

async function Disputes() {
  const { data } = await supabaseAdmin
    .from("disputes")
    .select("*, transactions(id, type, amount, buyer_id, seller_id, reference_id)")
    .eq("status", "open")
    .order("created_at");
  if (!data?.length) return <p className="text-ink-soft">Aucun litige ouvert.</p>;

  return (
    <ul className="space-y-4">
      {data.map((d) => {
        const tx = d.transactions as { id: string; type: string; amount: number; buyer_id: string; seller_id: string; reference_id: string };
        const opener = d.opened_by === tx.buyer_id ? "l'acheteur" : "le vendeur";
        return (
          <li key={d.id} className="rounded-2xl bg-white p-4">
            <div className="flex justify-between gap-3">
              <p className="font-semibold">{DISPUTE_REASONS.find((r) => r.key === d.reason)?.label}</p>
              <span className="font-display font-bold">{euros(tx.amount)}</span>
            </div>
            <p className="text-sm text-ink-soft">Ouvert par {opener}, {timeAgo(d.created_at)}</p>
            {d.details && <p className="mt-2 whitespace-pre-line rounded-xl bg-paper p-3 text-sm">{d.details}</p>}
            <div className="mt-2 flex gap-4 text-sm">
              <Link className="underline" href={tx.type === "listing" ? `/marketplace/${tx.reference_id}` : `/gigs/${tx.reference_id}`}>Voir l&apos;annonce</Link>
              <span className="text-ink-soft">Acheteur {tx.buyer_id.slice(0, 8)} · Vendeur {tx.seller_id.slice(0, 8)}</span>
            </div>
            <AdminAction
              endpoint={`/api/admin/disputes/${d.id}`}
              noteKey="note"
              options={[
                { label: "Rembourser l'acheteur", body: { action: "refund", relist: false }, tone: "danger" },
                { label: "Rembourser et remettre en ligne", body: { action: "refund", relist: true } },
                { label: "Payer le vendeur", body: { action: "release" }, tone: "primary" },
                { label: "Litige infondé", body: { action: "reject" } },
              ]}
            />
          </li>
        );
      })}
    </ul>
  );
}

async function Reports() {
  const { data } = await supabaseAdmin.from("reports").select("*").eq("status", "open").order("created_at");
  if (!data?.length) return <p className="text-ink-soft">Aucun signalement en attente.</p>;

  // Regroupe par contenu signalé
  const groups = new Map<string, typeof data>();
  for (const r of data) {
    const k = `${r.target_type}:${r.target_id}`;
    groups.set(k, [...(groups.get(k) ?? []), r]);
  }
  const href = (t: string, id: string) =>
    t === "listing" ? `/marketplace/${id}` : t === "gig" ? `/gigs/${id}` : t === "user" ? `/messages/${id}` : null;
  const label: Record<string, string> = { listing: "Annonce", gig: "Mission", user: "Profil", message: "Message" };

  return (
    <ul className="space-y-4">
      {[...groups.values()].map((rs) => {
        const first = rs[0];
        const link = href(first.target_type, first.target_id);
        return (
          <li key={first.id} className="rounded-2xl bg-white p-4">
            <div className="flex justify-between">
              <p className="font-semibold">{label[first.target_type]} signalé{rs.length > 1 ? ` ${rs.length} fois` : ""}</p>
              {link && <Link href={link} className="text-sm underline">Voir</Link>}
            </div>
            <ul className="mt-2 space-y-1 text-sm">
              {rs.map((r) => (
                <li key={r.id}>
                  <b>{REPORT_REASONS.find((x) => x.key === r.reason)?.label}</b>
                  {r.details ? ` : ${r.details}` : ""} <span className="text-ink-soft">({timeAgo(r.created_at)})</span>
                </li>
              ))}
            </ul>
            <AdminAction
              endpoint={`/api/admin/reports/${first.id}`}
              options={[
                { label: "Classer sans suite", body: { action: "dismiss" } },
                { label: "Retirer le contenu", body: { action: "remove" }, tone: "primary" },
                { label: "Bannir l'auteur", body: { action: "ban" }, tone: "danger" },
              ]}
            />
          </li>
        );
      })}
    </ul>
  );
}

async function Venues() {
  const [{ data: apps }, { data: venues }, { data: deals }, { data: cities }] = await Promise.all([
    supabaseAdmin.from("venue_applications").select("*").eq("status", "pending").order("created_at"),
    supabaseAdmin.from("venues").select("*").order("name"),
    supabaseAdmin.from("venue_deals").select("*"),
    supabaseAdmin.from("cities").select("id, name"),
  ]);
  const cityName = (id: string) => cities?.find((c) => c.id === id)?.name ?? "";

  return (
    <div className="space-y-8">
      <section>
        <h2 className="font-display text-xl font-bold">Candidatures</h2>
        <p className="text-sm text-ink-soft">
          Formulaire public : <Link href="/partenaires" className="underline">/partenaires</Link>. Valide après un appel et un accord écrit.
        </p>
        {!apps?.length ? <p className="mt-2 text-ink-soft">Aucune candidature.</p> : (
          <ul className="mt-3 space-y-3">
            {apps.map((a) => (
              <li key={a.id} className="rounded-2xl bg-white p-4 text-sm">
                <p className="text-base font-semibold">{a.venue_name} <span className="font-normal text-ink-soft">({a.venue_type}, {cityName(a.city_id)})</span></p>
                <p>{a.address}</p>
                <p>{a.contact_name}, {a.email}{a.phone ? `, ${a.phone}` : ""}{a.siret ? `, SIRET ${a.siret}` : ""}</p>
                <p className="mt-2 rounded-xl bg-paper p-2"><b>Offre :</b> {a.offer}</p>
                <AdminAction endpoint="/api/admin/venues" options={[
                  { label: "Valider", body: { op: "approve", applicationId: a.id }, tone: "primary", needsNote: false },
                  { label: "Refuser", body: { op: "reject", applicationId: a.id }, needsNote: false },
                ]} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="font-display text-xl font-bold">Partenaires</h2>
        {!venues?.length ? <p className="mt-2 text-ink-soft">Aucun partenaire pour l&apos;instant.</p> : (
          <ul className="mt-3 space-y-3">
            {venues.map((v) => (
              <li key={v.id} className={`rounded-2xl bg-white p-4 text-sm ${v.is_active ? "" : "opacity-60"}`}>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-base font-semibold">{v.name} <span className="font-normal text-ink-soft">({cityName(v.city_id)})</span></p>
                  <AdminAction endpoint="/api/admin/venues" options={[
                    { label: v.is_active ? "Désactiver" : "Réactiver", body: { op: "toggle", venueId: v.id, active: !v.is_active }, needsNote: false },
                  ]} />
                </div>
                <ul className="mt-1 space-y-1">
                  {(deals ?? []).filter((d) => d.venue_id === v.id).map((d) => (
                    <li key={d.id} className="flex items-center justify-between rounded-xl bg-paper px-3 py-1.5">
                      <span>{d.label}{d.valid_on ? `, ${d.valid_on}` : ""}</span>
                      <AdminAction endpoint="/api/admin/venues" options={[{ label: "×", body: { op: "delete_deal", dealId: d.id }, needsNote: false }]} />
                    </li>
                  ))}
                </ul>
                <DealForm venueId={v.id} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

async function Dac7({ year }: { year: number }) {
  const supabase = await createClient(); // la fonction vérifie is_admin()
  const { data } = await supabase.rpc("dac7_report", { p_year: year });
  const rows = (data ?? []) as {
    seller_id: string; email: string; goods_count: number; goods_amount: number;
    services_count: number; services_amount: number; reportable: boolean; has_tax_info: boolean;
  }[];
  const reportable = rows.filter((r) => r.reportable);
  const missing = reportable.filter((r) => !r.has_tax_info);

  return (
    <div>
      <div className="flex items-center gap-2">
        {[year - 1, year, year + 1].filter((y) => y <= new Date().getFullYear()).map((y) => (
          <Link key={y} href={`/admin?tab=dac7&year=${y}`} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${y === year ? "bg-ink text-white" : "bg-white"}`}>{y}</Link>
        ))}
      </div>
      <p className="mt-4">
        <b>{reportable.length}</b> vendeur{reportable.length > 1 ? "s" : ""} à déclarer pour {year}, dont{" "}
        <b className={missing.length ? "text-signal" : ""}>{missing.length} sans infos fiscales</b>.
      </p>
      <p className="mt-1 text-sm text-ink-soft">
        Déclaration à transmettre à la DGFiP avant le 31 janvier {year + 1}, et récapitulatif à envoyer à chaque vendeur
        à la même date. Biens : seuil de 30 ventes ou 2 000 €. Missions : sans seuil.
      </p>
      <a href={`/api/admin/dac7?year=${year}`} className="mt-4 inline-block rounded-full bg-ink px-5 py-3 font-semibold text-white">Exporter le CSV</a>
      <ul className="mt-6 space-y-2 text-sm">
        {reportable.map((r) => (
          <li key={r.seller_id} className="flex items-center justify-between rounded-xl bg-white p-3">
            <span className="truncate pr-2">{r.email}</span>
            <span className="shrink-0 text-right">
              {r.goods_count} ventes ({euros(r.goods_amount)}), {r.services_count} missions ({euros(r.services_amount)})
              {!r.has_tax_info && <b className="ml-2 text-signal">infos manquantes</b>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
