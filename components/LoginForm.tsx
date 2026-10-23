"use client";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { normalizePhone } from "@/lib/profile";

type Channel = "email" | "phone";

/**
 * Connexion / inscription sans quitter la page :
 *  - code à 6 chiffres par email ou SMS (crée le compte s'il n'existe pas) ;
 *  - ou mot de passe, pour qui en a créé un dans Paramètres.
 */
export function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const supabase = useRef(createClient()).current;
  const [channel, setChannel] = useState<Channel>("email");
  const [usePassword, setUsePassword] = useState(false);
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"ask" | "code">("ask");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const firstInput = useRef<HTMLInputElement>(null);

  useEffect(() => { firstInput.current?.focus(); }, [step, channel]);
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const isEmail = channel === "email";
  const target = isEmail ? { email: id.trim().toLowerCase() } : { phone: normalizePhone(id) };

  function validId() {
    return isEmail ? /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(id.trim()) : id.replace(/\D/g, "").length >= 9;
  }

  async function sendCode() {
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({ ...target, options: { shouldCreateUser: true } } as Parameters<typeof supabase.auth.signInWithOtp>[0]);
    setBusy(false);
    if (error) {
      setError(error.status === 429 ? "Trop de demandes. Réessaie dans une minute." : "Envoi impossible. Vérifie ce que tu as saisi.");
      return;
    }
    setStep("code");
    setCode("");
    setCooldown(30);
  }

  async function verifyCode() {
    setBusy(true);
    setError(null);
    const { error } = isEmail
      ? await supabase.auth.verifyOtp({ email: target.email!, token: code, type: "email" })
      : await supabase.auth.verifyOtp({ phone: target.phone!, token: code, type: "sms" });
    setBusy(false);
    if (error) return setError("Code incorrect ou expiré.");
    onSuccess();
  }

  async function signInWithPassword() {
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ ...target, password } as Parameters<typeof supabase.auth.signInWithPassword>[0]);
    setBusy(false);
    if (error) return setError("Identifiants incorrects. Pas encore de mot de passe ? Reçois plutôt un code.");
    onSuccess();
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (step === "code") return verifyCode();
    if (!validId()) return setError(isEmail ? "Entre une adresse email valide." : "Entre un numéro de téléphone valide.");
    if (usePassword) return signInWithPassword();
    return sendCode();
  }

  const input =
    "mt-1 w-full rounded-2xl border-2 border-transparent bg-paper px-4 py-3.5 text-lg focus:border-ink focus:outline-none";

  if (step === "code") {
    return (
      <form onSubmit={submit} className="mt-4 space-y-4">
        <p className="text-ink-soft">
          Code envoyé à <b className="text-ink">{id.trim()}</b>.
        </p>
        <input
          ref={firstInput}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          aria-label="Code à 6 chiffres"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          className="font-display w-full rounded-2xl border-2 border-ink bg-white py-4 text-center text-3xl tracking-[0.35em]"
        />
        {error && <p role="alert" className="text-sm text-signal">{error}</p>}
        <button disabled={busy || code.length < 6} className="w-full rounded-full bg-ink py-4 font-semibold text-white disabled:opacity-50">
          {busy ? "Vérification…" : "Me connecter"}
        </button>
        <div className="flex justify-between text-sm">
          <button type="button" onClick={() => { setStep("ask"); setError(null); }} className="underline">
            Modifier {isEmail ? "l'email" : "le numéro"}
          </button>
          <button type="button" onClick={sendCode} disabled={cooldown > 0 || busy} className="underline disabled:no-underline disabled:opacity-50">
            {cooldown > 0 ? `Renvoyer (${cooldown} s)` : "Renvoyer le code"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-4">
      <div role="tablist" aria-label="Me connecter avec" className="flex rounded-full bg-paper p-1">
        {(["email", "phone"] as const).map((c) => (
          <button
            key={c}
            type="button"
            role="tab"
            aria-selected={channel === c}
            onClick={() => { setChannel(c); setId(""); setError(null); }}
            className={`flex-1 rounded-full py-2 text-sm font-semibold ${channel === c ? "bg-ink text-white" : ""}`}
          >
            {c === "email" ? "Email" : "Téléphone"}
          </button>
        ))}
      </div>

      <label className="block">
        <span className="font-semibold">{isEmail ? "Ton email" : "Ton numéro"}</span>
        <input
          ref={firstInput}
          type={isEmail ? "email" : "tel"}
          inputMode={isEmail ? "email" : "tel"}
          autoComplete={isEmail ? "email" : "tel"}
          placeholder={isEmail ? "prenom@mail.fr" : "06 12 34 56 78"}
          value={id}
          onChange={(e) => setId(e.target.value)}
          className={input}
        />
      </label>

      {usePassword && (
        <label className="block">
          <span className="font-semibold">Mot de passe</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={input}
          />
        </label>
      )}

      {error && <p role="alert" className="text-sm text-signal">{error}</p>}

      <button disabled={busy || !id || (usePassword && !password)} className="w-full rounded-full bg-ink py-4 font-semibold text-white disabled:opacity-50">
        {busy ? "Un instant…" : usePassword ? "Me connecter" : isEmail ? "Recevoir un code par email" : "Recevoir un code par SMS"}
      </button>

      <button type="button" onClick={() => { setUsePassword(!usePassword); setError(null); }} className="mx-auto block text-sm underline">
        {usePassword ? "Recevoir un code à la place" : "Utiliser mon mot de passe"}
      </button>
      {usePassword && (
        <p className="text-center text-xs text-ink-soft">
          Mot de passe oublié ? Connecte-toi avec un code, puis change-le dans Paramètres.
        </p>
      )}

      <p className="text-xs text-ink-soft">
        Pas encore de compte ? Ce formulaire le crée. Studeals est réservé aux 18-25 ans : ton âge est vérifié avec ta
        pièce d&apos;identité.
      </p>
    </form>
  );
}
