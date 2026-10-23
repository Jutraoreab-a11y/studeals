"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const TYPES = [["bar", "Bar"], ["club", "Club"], ["rooftop", "Rooftop"], ["restaurant", "Restaurant"], ["other", "Autre"]] as const;

export function PartnerForm({ cities }: { cities: { id: string; name: string }[] }) {
  const [f, setF] = useState({
    city_id: cities[0]?.id ?? "", venue_name: "", venue_type: "bar", address: "",
    contact_name: "", email: "", phone: "", siret: "", offer: "",
  });
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setState("busy");
    setError(null);
    const { error } = await createClient().from("venue_applications").insert({
      ...f, phone: f.phone || null, siret: f.siret.replace(/\s/g, "") || null,
    });
    if (error) { setError("Vérifie l'email et le SIRET (14 chiffres)."); setState("idle"); return; }
    setState("done");
  }

  if (state === "done") {
    return <p className="mt-4 rounded-2xl bg-sticker p-4 font-semibold">Merci ! On te recontacte très vite.</p>;
  }

  const input = (k: keyof typeof f, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="block">
      <span className="text-sm font-semibold">{label}</span>
      <input value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} {...props}
        className="mt-1 w-full rounded-xl border-2 border-ink/15 bg-white px-3 py-2.5 focus:border-ink focus:outline-none" />
    </label>
  );

  const valid = f.venue_name && f.address && f.contact_name && f.email && f.offer;

  return (
    <div className="mt-4 space-y-3">
      <label className="block">
        <span className="text-sm font-semibold">Ville</span>
        <select value={f.city_id} onChange={(e) => setF({ ...f, city_id: e.target.value })}
          className="mt-1 w-full rounded-xl border-2 border-ink/15 bg-white px-3 py-2.5">
          {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </label>
      {input("venue_name", "Nom de l'établissement")}
      <div className="flex flex-wrap gap-2">
        {TYPES.map(([k, l]) => (
          <button key={k} type="button" aria-pressed={f.venue_type === k} onClick={() => setF({ ...f, venue_type: k })}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${f.venue_type === k ? "bg-ink text-white" : "bg-paper"}`}>{l}</button>
        ))}
      </div>
      {input("address", "Adresse")}
      {input("contact_name", "Ton nom")}
      {input("email", "Email", { type: "email", autoComplete: "email" })}
      {input("phone", "Téléphone (facultatif)", { type: "tel" })}
      {input("siret", "SIRET (facultatif)", { inputMode: "numeric" })}
      <label className="block">
        <span className="text-sm font-semibold">Ton offre pour les membres</span>
        <textarea value={f.offer} onChange={(e) => setF({ ...f, offer: e.target.value })} rows={2} maxLength={500}
          placeholder="Ex. : −50 % sur la 1re pinte avant 21 h"
          className="mt-1 w-full rounded-xl border-2 border-ink/15 bg-white px-3 py-2.5 focus:border-ink focus:outline-none" />
      </label>
      {error && <p role="alert" className="text-sm text-signal">{error}</p>}
      <button onClick={submit} disabled={!valid || state === "busy"} className="w-full rounded-full bg-ink py-4 font-semibold text-white disabled:opacity-50">
        {state === "busy" ? "Envoi…" : "Envoyer ma candidature"}
      </button>
    </div>
  );
}
