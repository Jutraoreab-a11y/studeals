"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LoginForm } from "@/components/LoginForm";

type Ctx = {
  /** Ouvre la fenêtre de connexion par-dessus la page courante. */
  openLogin: (reason?: string) => void;
  /** Petit message en bas de l'écran. */
  toast: (title: string, body?: string) => void;
};

const LoginContext = createContext<Ctx>({ openLogin: () => {}, toast: () => {} });
export const useLogin = () => useContext(LoginContext);

export function LoginProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string | undefined>();
  const [toastMsg, setToastMsg] = useState<{ title: string; body?: string } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const toast = useCallback((title: string, body?: string) => {
    setToastMsg({ title, body });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), 4500);
  }, []);

  const openLogin = useCallback((r?: string) => { setReason(r); setOpen(true); }, []);

  // Connexion / déconnexion dans un autre onglet : la page courante se met à jour.
  useEffect(() => {
    const { data } = createClient().auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") router.refresh();
    });
    return () => data.subscription.unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open]);

  function onSuccess() {
    setOpen(false);
    router.refresh(); // on reste sur la page : l'en-tête affiche maintenant le profil
    toast("Connecté·e", "Content de te revoir !");
  }

  return (
    <LoginContext.Provider value={{ openLogin, toast }}>
      {children}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="login-title"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:rounded-3xl"
          >
            <div className="flex items-center justify-between">
              <h2 id="login-title" className="font-display text-2xl font-extrabold">Connexion</h2>
              <button onClick={() => setOpen(false)} aria-label="Fermer" className="px-1 text-3xl leading-none">×</button>
            </div>
            {reason && <p className="mt-1 text-sm text-ink-soft">{reason}</p>}
            <LoginForm onSuccess={onSuccess} />
          </div>
        </div>
      )}

      {toastMsg && (
        <div
          role="status"
          className="fixed inset-x-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-[60] mx-auto max-w-md rounded-2xl bg-[#1a1b4b] px-4 py-3 text-white shadow-xl"
        >
          <p className="text-sm font-bold text-sticker">{toastMsg.title}</p>
          {toastMsg.body && <p className="mt-0.5 font-semibold">{toastMsg.body}</p>}
        </div>
      )}
    </LoginContext.Provider>
  );
}
