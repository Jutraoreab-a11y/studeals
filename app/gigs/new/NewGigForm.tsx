"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GIG_CATEGORIES } from "@/lib/format";

export function NewGigForm({ cityId, userId, defaultSos }: { cityId: string; userId: string; defaultSos: boolean }) {
  const supabase = createClient();
  const router = useRouter();
  const [category, setCategory] = useState<string>("moving");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reward, setReward] = useState("");
  const [sos, setSos] = useState(defaultSos);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function publish() {
    setBusy(true);
    setError(null);
    const { data, error } = await supabase
      .from("gigs")
      .insert({
        requester_id: userId,
        city_id: cityId,
        category,
        title: title.trim(),
        description: description.trim() || null,
        reward_amount: Number(reward.replace(",", ".")),
        is_sos: sos,
      })
      .select("id")
      .single();
    if (error) { setError(error.message); setBusy(false); return; }
    router.replace(`/gigs/${data.id}`);
  }

  const amount = Number(reward.replace(",", "."));
  const valid = title.trim().length >= 3 && amount > 0;

  return (
    <div className="mt-5 space-y-5">
      <fieldset>
        <legend className="font-semibold">Type</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {GIG_CATEGORIES.map((c) => (
            <button
              key={c.key}
              type="button"
              aria-pressed={category === c.key}
              onClick={() => setCategory(c.key)}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${category === c.key ? "bg-ink text-white" : "bg-white"}`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className="font-semibold">Ce dont tu as besoin</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={80}
          placeholder="Monter un canapé au 3e"
          className="mt-1 w-full rounded-2xl border-2 border-ink/15 bg-white px-4 py-3.5 focus:border-ink focus:outline-none"
        />
      </label>

      <label className="block">
        <span className="font-semibold">Détails</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Quand, quartier, durée estimée…"
          className="mt-1 w-full rounded-2xl border-2 border-ink/15 bg-white px-4 py-3 focus:border-ink focus:outline-none"
        />
      </label>

      <label className="block">
        <span className="font-semibold">Rémunération (€)</span>
        <input
          inputMode="decimal"
          value={reward}
          onChange={(e) => setReward(e.target.value.replace(/[^\d.,]/g, ""))}
          className="font-display mt-1 w-full rounded-2xl border-2 border-ink/15 bg-white px-4 py-3.5 text-2xl font-bold focus:border-ink focus:outline-none"
        />
      </label>

      <button
        type="button"
        aria-pressed={sos}
        onClick={() => setSos(!sos)}
        className={`w-full rounded-2xl p-4 text-left ${sos ? "bg-signal text-white" : "bg-white"}`}
      >
        <span className="font-semibold">Mode SOS {sos ? "activé" : "désactivé"}</span>
        <span className={`block text-sm ${sos ? "text-white/90" : "text-ink-soft"}`}>
          Ta demande passe en haut de la liste et s&apos;affiche en direct chez tout le monde dans ta ville.
        </span>
      </button>

      {error && <p role="alert" className="text-sm text-signal">{error}</p>}

      <button
        onClick={publish}
        disabled={!valid || busy}
        className="w-full rounded-full bg-ink py-4 font-semibold text-white disabled:opacity-50"
      >
        {busy ? "Publication…" : sos ? "Lancer l'alerte" : "Publier"}
      </button>
    </div>
  );
}
