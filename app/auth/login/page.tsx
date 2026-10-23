import { LoginPageForm } from "./LoginPageForm";

/**
 * Page de secours (lien expiré, accès direct). Partout ailleurs,
 * la connexion s'ouvre par-dessus la page courante via l'en-tête.
 */
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next = "/marketplace", error } = await searchParams;
  return (
    <div className="mx-auto max-w-md pt-8">
      <h1 className="font-display text-4xl font-extrabold leading-none">Salut.</h1>
      <p className="mt-2 text-ink-soft">Un code par email ou SMS, ou ton mot de passe.</p>
      {error && <p role="alert" className="mt-4 rounded-xl bg-signal/10 p-3 text-sm">Le lien a expiré. Demande un nouveau code.</p>}
      <div className="mt-4 rounded-3xl bg-white p-5">
        <LoginPageForm next={next.startsWith("/") ? next : "/marketplace"} />
      </div>
    </div>
  );
}
