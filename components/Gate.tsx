import Link from "next/link";
import { LoginButton } from "@/components/LoginButton";

/** Invitation quand la connexion ou le Badge de Confiance manque. La connexion se fait sans quitter la page. */
export function Gate({ reason, next, message }: { reason: "login" | "verify"; next: string; message?: string }) {
  const login = reason === "login";
  return (
    <div className="mt-6 rounded-3xl bg-white p-6">
      <h2 className="font-display text-2xl font-bold">
        {login ? "Connecte-toi pour continuer" : "Obtiens ton Badge de Confiance"}
      </h2>
      <p className="mt-2 text-ink-soft">
        {message ??
          (login
            ? "Un code par email ou SMS, ou ton mot de passe. Tu restes sur cette page."
            : "Une photo de ta pièce d'identité et un selfie. Ça prend 2 minutes et ça protège tout le monde.")}
      </p>
      <div className="mt-5">
        {login ? (
          <LoginButton />
        ) : (
          <Link href={`/auth/verify?next=${encodeURIComponent(next)}`} className="block rounded-full bg-ink py-4 text-center font-semibold text-white">
            Vérifier mon identité
          </Link>
        )}
      </div>
    </div>
  );
}
