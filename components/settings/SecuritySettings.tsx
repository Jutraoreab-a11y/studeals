"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { maskPhone, normalizePhone, PASSWORD_RULE } from "@/lib/profile";
import { useLogin } from "@/components/LoginProvider";
import { Row, Section, field, linkBtn, primary } from "./Section";

type Edit = null | "email" | "phone" | "password";

export function SecuritySettings({ email, phone, passwordSetAt }: {
  email: string | null; phone: string | null; passwordSetAt: string | null;
}) {
  const router = useRouter();
  const { toast } = useLogin();
  const [edit, setEdit] = useState<Edit>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [phoneStep, setPhoneStep] = useState<"ask" | "code">("ask");
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });

  const hasPassword = !!passwordSetAt;

  function open(e: Edit) {
    setEdit(e); setError(null); setNewEmail(""); setNewPhone(""); setPhoneCode(""); setPhoneStep("ask");
    setPw({ current: "", next: "", confirm: "" });
  }

  async function changeEmail() {
    const v = newEmail.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) return setError("Entre une adresse email valide.");
    setBusy(true);
    const { error } = await createClient().auth.updateUser(
      { email: v },
      { emailRedirectTo: `${location.origin}/auth/callback?next=/settings` },
    );
    setBusy(false);
    if (error) return setError(error.message.includes("already") ? "Cette adresse est déjà utilisée." : "Changement impossible pour le moment.");
    setEdit(null);
    toast("Lien envoyé", `Clique sur le lien reçu à ${v} pour confirmer.`);
  }

  async function sendPhoneCode() {
    if (newPhone.replace(/\D/g, "").length < 9) return setError("Entre un numéro valide.");
    setBusy(true);
    const { error } = await createClient().auth.updateUser({ phone: normalizePhone(newPhone) });
    setBusy(false);
    if (error) return setError(error.message.includes("already") ? "Ce numéro est déjà utilisé." : "Envoi du code impossible.");
    setError(null);
    setPhoneStep("code");
  }

  async function confirmPhone() {
    setBusy(true);
    const { error } = await createClient().auth.verifyOtp({ phone: normalizePhone(newPhone), token: phoneCode, type: "phone_change" });
    setBusy(false);
    if (error) return setError("Code incorrect ou expiré.");
    setEdit(null);
    router.refresh();
    toast("Numéro mis à jour");
  }

  async function savePassword() {
    if (hasPassword && !pw.current) return setError("Entre ton mot de passe actuel.");
    if (!PASSWORD_RULE.test(pw.next)) return setError("8 caractères minimum, dont au moins un chiffre.");
    if (pw.next !== pw.confirm) return setError("Les deux mots de passe ne correspondent pas.");
    setBusy(true);
    const res = await fetch("/api/account/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current: hasPassword ? pw.current : undefined, next: pw.next }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Enregistrement impossible.");
    setEdit(null);
    router.refresh();
    toast(hasPassword ? "Mot de passe modifié" : "Mot de passe créé", "Tu peux aussi toujours te connecter par code.");
  }

  async function signOutOthers() {
    setBusy(true);
    const { error } = await createClient().auth.signOut({ scope: "others" });
    setBusy(false);
    toast(error ? "Action impossible" : "Autres appareils déconnectés", error ? undefined : "Seul cet appareil reste connecté.");
  }

  const actions = (onSave: () => void, label = "Enregistrer") => (
    <div className="flex items-center gap-4">
      <button onClick={onSave} disabled={busy} className={primary}>{busy ? "Un instant…" : label}</button>
      <button onClick={() => open(null)} className={linkBtn}>Annuler</button>
    </div>
  );
  const err = error && <p role="alert" className="text-sm text-signal">{error}</p>;

  return (
    <Section title="Connexion et sécurité">
      <Row
        label="Email"
        sub={email ?? "Aucun : ajoute-en un pour recevoir les reçus et décisions"}
        action={edit !== "email" && <button onClick={() => open("email")} className={linkBtn}>{email ? "Modifier" : "Ajouter"}</button>}
      >
        {edit === "email" && (
          <div className="space-y-2">
            <input type="email" autoComplete="email" placeholder="nouvelle@adresse.fr" aria-label="Nouvel email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className={field} autoFocus />
            <p className="text-xs text-ink-soft">On envoie un lien de confirmation à la nouvelle adresse.</p>
            {err}
            {actions(changeEmail, "Envoyer le lien")}
          </div>
        )}
      </Row>

      <Row
        label="Téléphone"
        sub={maskPhone(phone) ?? "Aucun"}
        action={edit !== "phone" && <button onClick={() => open("phone")} className={linkBtn}>{phone ? "Modifier" : "Ajouter"}</button>}
      >
        {edit === "phone" && (
          <div className="space-y-2">
            {phoneStep === "ask" ? (
              <>
                <input type="tel" autoComplete="tel" placeholder="06 12 34 56 78" aria-label="Nouveau numéro" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} className={field} autoFocus />
                <p className="text-xs text-ink-soft">On envoie un code par SMS au nouveau numéro.</p>
                {err}
                {actions(sendPhoneCode, "Envoyer le code")}
              </>
            ) : (
              <>
                <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="Code à 6 chiffres" aria-label="Code reçu par SMS" value={phoneCode} onChange={(e) => setPhoneCode(e.target.value.replace(/\D/g, ""))} className={field} autoFocus />
                {err}
                {actions(confirmPhone, "Confirmer")}
              </>
            )}
          </div>
        )}
      </Row>

      <Row
        label="Mot de passe"
        sub={hasPassword
          ? `Défini le ${new Date(passwordSetAt!).toLocaleDateString("fr-FR")}. Tu peux aussi te connecter par code.`
          : "Aucun : tu te connectes avec un code par email ou SMS"}
        action={edit !== "password" && <button onClick={() => open("password")} className={linkBtn}>{hasPassword ? "Modifier" : "Créer"}</button>}
      >
        {edit === "password" && (
          <div className="space-y-2">
            {hasPassword && (
              <input type="password" autoComplete="current-password" placeholder="Mot de passe actuel" aria-label="Mot de passe actuel" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} className={field} autoFocus />
            )}
            <input type="password" autoComplete="new-password" placeholder="Nouveau mot de passe" aria-label="Nouveau mot de passe" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} className={field} autoFocus={!hasPassword} />
            <input type="password" autoComplete="new-password" placeholder="Confirmer" aria-label="Confirmer le mot de passe" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} className={field} />
            <p className="text-xs text-ink-soft">8 caractères minimum, dont au moins un chiffre.</p>
            {err}
            {actions(savePassword)}
          </div>
        )}
      </Row>

      <Row
        label="Autres appareils"
        sub="Déconnecte Studeals partout sauf ici"
        action={<button onClick={signOutOthers} disabled={busy} className={linkBtn}>Déconnecter</button>}
      />
    </Section>
  );
}
