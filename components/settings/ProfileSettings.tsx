"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CITIES, type CitySlug } from "@/lib/city";
import { useSetCity } from "@/lib/use-set-city";
import { Avatar } from "@/components/Avatar";
import { useLogin } from "@/components/LoginProvider";
import { Row, Section, field, linkBtn, primary } from "./Section";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

export function ProfileSettings({ userId, name, displayName, avatarUrl, verified, city }: {
  userId: string; name: string; displayName: string | null; avatarUrl: string | null; verified: boolean; city: CitySlug;
}) {
  const router = useRouter();
  const { toast } = useLogin();
  const { setCity } = useSetCity();
  const fileRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(displayName ?? "");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function uploadAvatar(file: File) {
    if (!file.type.startsWith("image/")) return toast("Format refusé", "Choisis une image (JPG, PNG, WebP).");
    if (file.size > MAX_AVATAR_BYTES) return toast("Image trop lourde", "5 Mo maximum.");
    setBusy("avatar");
    const supabase = createClient();
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${userId}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { contentType: file.type });
    if (upErr) { setBusy(null); return toast("Envoi impossible", "Réessaie avec une autre image."); }
    const url = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
    await supabase.from("users").update({ avatar_url: url }).eq("id", userId);
    setBusy(null);
    router.refresh();
    toast("Photo mise à jour");
  }

  async function removeAvatar() {
    setBusy("avatar");
    await createClient().from("users").update({ avatar_url: null }).eq("id", userId);
    setBusy(null);
    router.refresh();
  }

  async function saveName() {
    const v = value.trim();
    if (v.length < 2 || v.length > 20) return setError("Entre 2 et 20 caractères.");
    setBusy("name");
    const { error } = await createClient().from("users").update({ display_name: v }).eq("id", userId);
    setBusy(null);
    if (error) return setError("Enregistrement impossible.");
    setEditing(false);
    setError(null);
    router.refresh();
    toast("Prénom enregistré", `Tu apparais maintenant comme ${v}.`);
  }

  return (
    <Section title="Profil">
      <Row
        label={<span className="flex items-center gap-3"><Avatar name={name} url={avatarUrl} verified={verified} size={52} /> Photo</span>}
        action={
          <span className="flex gap-3">
            {avatarUrl && <button onClick={removeAvatar} disabled={!!busy} className={linkBtn}>Retirer</button>}
            <button onClick={() => fileRef.current?.click()} disabled={!!busy} className={linkBtn}>
              {busy === "avatar" ? "Envoi…" : "Changer"}
            </button>
          </span>
        }
      />
      <input
        ref={fileRef} type="file" accept="image/*" className="sr-only" aria-label="Choisir une photo de profil"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); e.target.value = ""; }}
      />

      <Row
        label="Prénom affiché"
        sub={name}
        action={!editing && <button onClick={() => setEditing(true)} className={linkBtn}>Modifier</button>}
      >
        {editing && (
          <div className="space-y-2">
            <input value={value} onChange={(e) => setValue(e.target.value)} maxLength={20} autoFocus aria-label="Prénom affiché" className={field} />
            {error && <p role="alert" className="text-sm text-signal">{error}</p>}
            <div className="flex items-center gap-4">
              <button onClick={saveName} disabled={busy === "name"} className={primary}>Enregistrer</button>
              <button onClick={() => { setEditing(false); setError(null); }} className={linkBtn}>Annuler</button>
            </div>
          </div>
        )}
      </Row>

      <Row label="Ville" sub="Ton fil d'annonces et les alertes SOS que tu reçois">
        <div className="flex flex-wrap gap-2">
          {CITIES.map((c) => (
            <button
              key={c.slug}
              aria-pressed={c.slug === city}
              onClick={() => c.slug !== city && setCity(c.slug)}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${c.slug === city ? "bg-ink text-white" : "bg-paper"}`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </Row>
    </Section>
  );
}
