"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Tax = {
  first_name: string; last_name: string; birth_date: string; address: string;
  postal_code: string; city: string; tax_id: string;
};

/** Infos fiscales DAC7 : obligatoires au-delà de 30 ventes ou 2 000 € sur l'année. */
export function TaxInfoForm({ userId, initial, salesCount, gross, servicesCount }: {
  userId: string; initial: Tax | null; salesCount: number; gross: number; servicesCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<Tax>(initial ?? { first_name: "", last_name: "", birth_date: "", address: "", postal_code: "", city: "", tax_id: "" });
  const [state, setState] = useState<"idle" | "busy" | "saved">(initial ? "saved" : "idle");
  const [error, setError] = useState<string | null>(null);
  const near = salesCount >= 20 || gross >= 1500;
  const over = salesCount >= 30 || gross > 2000 || servicesCount > 0;

  async function save() {
    setState("busy");
    setError(null);
    const { error } = await createClient()
      .from("seller_tax_info")
      .upsert({ user_id: userId, ...f, tax_id: f.tax_id.replace(/\s/g, ""), updated_at: new Date().toISOString() });
    if (error) { setError("Vérifie les champs (numéro fiscal : 13 chiffres)."); setState("idle"); return; }
    setState("saved");
    setOpen(false);
  }

  const field = (k: keyof Tax, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="block">
      <span className="text-sm font-semibold">{label}</span>
      <input
        value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} {...props}
        className="mt-1 w-full rounded-xl border-2 border-ink/15 bg-white px-3 py-2.5 focus:border-ink focus:outline-none"
      />
    </label>
  );

  return (
    <div className="rounded-2xl bg-white p-4">
      <p className="font-semibold">Infos fiscales (DAC7)</p>
      <p className="mt-1 text-sm text-ink-soft">
        Cette année : {salesCount} vente{salesCount > 1 ? "s" : ""} ({gross.toFixed(0)} €), {servicesCount} mission
        {servicesCount > 1 ? "s" : ""} payée{servicesCount > 1 ? "s" : ""}. La loi (DAC7) oblige Studeals à transmettre
        au fisc les vendeurs qui dépassent 30 ventes ou 2 000 € sur l&apos;année, et tous ceux qui sont payés pour des
        missions. Ça ne veut pas dire que tu dois payer des impôts : revendre tes propres affaires d&apos;occasion est en
        général exonéré. Les revenus de missions, eux, sont à déclarer.
      </p>
      {over && state !== "saved" && (
        <p className="mt-2 rounded-xl bg-signal/10 p-3 text-sm font-semibold">Seuil atteint : renseigne tes infos pour continuer à vendre.</p>
      )}
      {near && !over && state !== "saved" && (
        <p className="mt-2 rounded-xl bg-sticker/50 p-3 text-sm">Tu approches du seuil : autant remplir tes infos maintenant.</p>
      )}
      {state === "saved" && !open && <p className="mt-2 text-sm font-semibold text-[#0b7a5e]">Infos enregistrées.</p>}
      {!open ? (
        <button onClick={() => setOpen(true)} className="mt-3 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white">
          {state === "saved" ? "Modifier" : "Renseigner"}
        </button>
      ) : (
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {field("first_name", "Prénom", { autoComplete: "given-name" })}
            {field("last_name", "Nom", { autoComplete: "family-name" })}
          </div>
          {field("birth_date", "Date de naissance", { type: "date" })}
          {field("address", "Adresse", { autoComplete: "street-address" })}
          <div className="grid grid-cols-[1fr_2fr] gap-2">
            {field("postal_code", "Code postal", { inputMode: "numeric", autoComplete: "postal-code" })}
            {field("city", "Ville", { autoComplete: "address-level2" })}
          </div>
          {field("tax_id", "Numéro fiscal (13 chiffres)", { inputMode: "numeric" })}
          <p className="text-xs text-ink-soft">Il figure en haut de ton avis d&apos;impôt ou sur impots.gouv.fr. Utilisé uniquement pour la déclaration DAC7.</p>
          {error && <p role="alert" className="text-sm text-signal">{error}</p>}
          <button onClick={save} disabled={state === "busy"} className="w-full rounded-full bg-ink py-3 font-semibold text-white">
            {state === "busy" ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      )}
    </div>
  );
}
