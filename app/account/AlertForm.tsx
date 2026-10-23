"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Alert = { id: string; keyword: string; max_price: number | null };

export function AlertForm({ cityId, userId, alerts }: { cityId: string; userId: string; alerts: Alert[] }) {
  const supabase = createClient();
  const router = useRouter();
  const [keyword, setKeyword] = useState("");
  const [max, setMax] = useState("");

  async function add() {
    if (keyword.trim().length < 2) return;
    await supabase.from("alerts").insert({
      user_id: userId, city_id: cityId, keyword: keyword.trim(), max_price: max ? Number(max) : null,
    });
    setKeyword(""); setMax("");
    router.refresh();
  }

  async function remove(id: string) {
    await supabase.from("alerts").delete().eq("id", id);
    router.refresh();
  }

  return (
    <div className="mt-3 space-y-3">
      <ul className="flex flex-wrap gap-2">
        {alerts.map((a) => (
          <li key={a.id} className="flex items-center gap-2 rounded-full bg-white py-1.5 pl-4 pr-1.5 text-sm">
            {a.keyword}{a.max_price ? `, max ${a.max_price} €` : ""}
            <button onClick={() => remove(a.id)} aria-label={`Supprimer l'alerte ${a.keyword}`} className="h-6 w-6 rounded-full bg-paper">×</button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Mot-clé" aria-label="Mot-clé"
          className="min-w-0 flex-1 rounded-full bg-white px-4 py-3" />
        <input value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ""))} placeholder="Max €" inputMode="numeric" aria-label="Prix maximum"
          className="w-24 rounded-full bg-white px-4 py-3" />
        <button onClick={add} className="rounded-full bg-ink px-4 font-semibold text-white">Ajouter</button>
      </div>
    </div>
  );
}
