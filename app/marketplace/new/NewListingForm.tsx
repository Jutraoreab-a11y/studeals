"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const KINDS = [
  { key: "furniture_office", label: "Meuble / bureau" },
  { key: "items", label: "Objet" },
  { key: "room", label: "Chambre en coloc" },
] as const;

const MAX_PHOTOS = 5;

export function NewListingForm({ cityId, userId }: { cityId: string; userId: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [kind, setKind] = useState<(typeof KINDS)[number]["key"]>("furniture_office");
  const [files, setFiles] = useState<File[]>([]);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isRoom = kind === "room";

  function locate() {
    navigator.geolocation.getCurrentPosition(
      (p) => setCoords({ lat: +p.coords.latitude.toFixed(3), lng: +p.coords.longitude.toFixed(3) }), // ~100 m : pas d'adresse exacte
      () => setError("Localisation refusée. L'annonce sera visible dans toute la ville."),
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }

  async function upload(): Promise<string[]> {
    const urls: string[] = [];
    for (const file of files) {
      const path = `${userId}/${crypto.randomUUID()}.${file.name.split(".").pop() ?? "jpg"}`;
      const { error } = await supabase.storage.from("listings").upload(path, file, { contentType: file.type });
      if (error) throw error;
      urls.push(supabase.storage.from("listings").getPublicUrl(path).data.publicUrl);
    }
    return urls;
  }

  async function publish() {
    setBusy(true);
    setError(null);
    try {
      const images = await upload();
      const { data, error } = await supabase
        .from("listings")
        .insert({
          seller_id: userId,
          city_id: cityId,
          title: title.trim(),
          description: description.trim() || null,
          price: Number(price.replace(",", ".")),
          category: isRoom ? "room_match" : "goods",
          subcategory: isRoom ? null : kind,
          is_urgent: !isRoom && urgent,
          images,
          lat: coords?.lat ?? null,
          lng: coords?.lng ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;
      router.replace(`/marketplace/${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Publication impossible.");
      setBusy(false);
    }
  }

  const valid = title.trim().length >= 3 && price !== "" && !Number.isNaN(Number(price.replace(",", ".")));

  return (
    <div className="mt-5 space-y-5">
      <fieldset>
        <legend className="font-semibold">C&apos;est quoi ?</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {KINDS.map((k) => (
            <button
              key={k.key}
              type="button"
              aria-pressed={kind === k.key}
              onClick={() => setKind(k.key)}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${kind === k.key ? "bg-ink text-white" : "bg-white"}`}
            >
              {k.label}
            </button>
          ))}
        </div>
      </fieldset>

      {isRoom && (
        <p className="rounded-2xl bg-sticker/60 p-4 text-sm">
          Tu signales une chambre libre ou tu cherches un·e coloc. Studeals ne fait que la mise en relation : le bail
          se régularise directement avec le propriétaire. Interdit : sous-louer sans accord, ou faire payer la
          reprise du bail.
        </p>
      )}

      <div>
        <span className="font-semibold">Photos</span>
        <div className="mt-2 flex gap-2 overflow-x-auto">
          {files.map((f, i) => (
            <div key={i} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={URL.createObjectURL(f)} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                aria-label="Retirer la photo"
                onClick={() => setFiles(files.filter((_, j) => j !== i))}
                className="absolute right-1 top-1 h-6 w-6 rounded-full bg-ink text-xs text-white"
              >
                ×
              </button>
            </div>
          ))}
          {files.length < MAX_PHOTOS && (
            <label className="flex h-24 w-24 shrink-0 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-ink/30 bg-white text-3xl">
              +
              <input
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                className="sr-only"
                onChange={(e) => setFiles([...files, ...Array.from(e.target.files ?? [])].slice(0, MAX_PHOTOS))}
              />
            </label>
          )}
        </div>
      </div>

      <label className="block">
        <span className="font-semibold">Titre</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={80}
          placeholder={isRoom ? "Chambre 12 m² dans coloc à 3" : "Bureau blanc 120 cm"}
          className="mt-1 w-full rounded-2xl border-2 border-ink/15 bg-white px-4 py-3.5 focus:border-ink focus:outline-none"
        />
      </label>

      <label className="block">
        <span className="font-semibold">{isRoom ? "Loyer mensuel (€)" : "Prix (€)"}</span>
        <input
          inputMode="decimal"
          value={price}
          onChange={(e) => setPrice(e.target.value.replace(/[^\d.,]/g, ""))}
          placeholder="0 = à donner"
          className="font-display mt-1 w-full rounded-2xl border-2 border-ink/15 bg-white px-4 py-3.5 text-2xl font-bold focus:border-ink focus:outline-none"
        />
      </label>

      <label className="block">
        <span className="font-semibold">Détails <span className="font-normal text-ink-soft">(facultatif)</span></span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder={isRoom ? "Quartier, date de dispo, ambiance de la coloc…" : "État, dimensions, dispo pour la remise…"}
          className="mt-1 w-full rounded-2xl border-2 border-ink/15 bg-white px-4 py-3 focus:border-ink focus:outline-none"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={locate}
          className={`rounded-full px-4 py-2 text-sm font-semibold ${coords ? "bg-trust/20" : "bg-white"}`}
        >
          {coords ? "Position ajoutée" : "Ajouter ma position"}
        </button>
        {!isRoom && (
          <button
            type="button"
            aria-pressed={urgent}
            onClick={() => setUrgent(!urgent)}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${urgent ? "bg-signal text-white" : "bg-white"}`}
          >
            À liquider d&apos;urgence
          </button>
        )}
      </div>

      {error && <p role="alert" className="text-sm text-signal">{error}</p>}

      <button
        onClick={publish}
        disabled={!valid || busy}
        className="w-full rounded-full bg-ink py-4 font-semibold text-white disabled:opacity-50"
      >
        {busy ? "Publication…" : "Publier"}
      </button>
    </div>
  );
}
