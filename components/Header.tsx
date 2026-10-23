"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CITIES, type CitySlug } from "@/lib/city";
import { useSetCity } from "@/lib/use-set-city";
import { createClient } from "@/lib/supabase/client";
import type { HeaderUser } from "@/lib/profile";
import { Avatar } from "@/components/Avatar";
import { TrustBadge } from "@/components/TrustBadge";
import { useLogin } from "@/components/LoginProvider";

const cityLabel = (slug: string) => CITIES.find((c) => c.slug === slug)?.name ?? "Lille";

export function Header({ city, user }: { city: CitySlug; user: HeaderUser | null }) {
  const [menu, setMenu] = useState<"city" | "account" | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const path = usePathname();
  const router = useRouter();
  const { setCity, pending } = useSetCity();
  const { openLogin, toast } = useLogin();

  useEffect(() => setMenu(null), [path]);
  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setMenu(null); };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(null);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [menu]);

  async function logout() {
    setMenu(null);
    await createClient().auth.signOut();
    router.refresh(); // on reste sur la page
    toast("Déconnecté·e", "À bientôt sur Studeals.");
  }

  const icon = "relative grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white";
  const item = "flex w-full items-center rounded-xl px-3.5 py-3 text-left font-semibold hover:bg-paper";

  return (
    <header className="sticky top-0 z-30 bg-paper/90 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div ref={ref} className="relative mx-auto flex max-w-xl items-center justify-between gap-2 px-4 py-2.5">
        <Link href="/" className="font-display shrink-0 text-xl font-extrabold tracking-tight">studeals</Link>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setMenu(menu === "city" ? null : "city")}
            aria-haspopup="menu"
            aria-expanded={menu === "city"}
            aria-label={`Ville : ${cityLabel(city)}. Changer`}
            disabled={pending}
            className="flex h-9 items-center gap-1 rounded-full bg-white px-3 text-sm font-semibold"
          >
            {city === "paris" ? "Paris" : cityLabel(city)}
            <svg aria-hidden viewBox="0 0 12 12" className="h-2.5 w-2.5"><path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" /></svg>
          </button>

          {user ? (
            <>
              <Link href="/messages" aria-label={user.unread ? `Messages, ${user.unread} non lus` : "Messages"} className={icon}>
                <svg aria-hidden viewBox="0 0 24 24" className="h-[19px] w-[19px] fill-none stroke-current" strokeWidth="2" strokeLinejoin="round"><path d="M4 5h16v11H8l-4 4z" /></svg>
                {user.unread > 0 && <span className="absolute right-0.5 top-0.5 h-2.5 w-2.5 rounded-full bg-signal" />}
              </Link>
              <Link href="/settings" aria-label="Paramètres" className={icon}>
                <svg aria-hidden viewBox="0 0 24 24" className="h-[19px] w-[19px] fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
                </svg>
              </Link>
              <button
                onClick={() => setMenu(menu === "account" ? null : "account")}
                aria-haspopup="menu"
                aria-expanded={menu === "account"}
                aria-label="Mon compte"
                className="rounded-full"
              >
                <Avatar name={user.name} url={user.avatarUrl} verified={user.verified} />
              </button>
            </>
          ) : (
            <button onClick={() => openLogin()} className="h-9 rounded-full bg-ink px-3.5 text-sm font-semibold text-white">
              Se connecter
            </button>
          )}
        </div>

        {menu === "city" && (
          <div role="menu" aria-label="Choisir ta ville" className="absolute right-4 top-[calc(100%-2px)] w-60 rounded-2xl bg-white p-2 shadow-[0_14px_36px_#0b0c2a40]">
            {CITIES.map((c) => (
              <button
                key={c.slug}
                role="menuitemradio"
                aria-checked={c.slug === city}
                onClick={() => { setMenu(null); if (c.slug !== city) setCity(c.slug); }}
                className={item}
              >
                {c.name}
                {c.slug === city && <span aria-hidden className="ml-auto">✓</span>}
              </button>
            ))}
          </div>
        )}

        {menu === "account" && user && (
          <div role="menu" aria-label="Mon compte" className="absolute right-4 top-[calc(100%-2px)] w-[min(300px,calc(100vw-32px))] rounded-2xl bg-white p-2 shadow-[0_14px_36px_#0b0c2a40]">
            <div className="flex items-center gap-3 px-2.5 pb-3 pt-2">
              <Avatar name={user.name} url={user.avatarUrl} verified={user.verified} size={52} />
              <div className="min-w-0">
                <p className="truncate font-semibold">{user.name}</p>
                {user.email && <p className="truncate text-xs text-ink-soft">{user.email}</p>}
                <div className="mt-1">
                  {user.verified ? <TrustBadge verified /> : <span className="text-xs font-bold text-signal">Identité non vérifiée</span>}
                </div>
              </div>
            </div>
            <hr className="mx-1.5 my-1 border-ink/10" />
            <Link role="menuitem" href="/account" className={item}>Mon profil</Link>
            <Link role="menuitem" href="/messages" className={item}>
              Messages{user.unread > 0 && <span className="ml-auto rounded-full bg-signal px-2 py-0.5 text-xs font-bold text-white">{user.unread}</span>}
            </Link>
            <Link role="menuitem" href="/settings" className={item}>Paramètres</Link>
            {!user.verified && <Link role="menuitem" href="/auth/verify" className={`${item} text-signal`}>Obtenir mon Badge de Confiance</Link>}
            {user.isAdmin && <Link role="menuitem" href="/admin" className={item}>Espace admin</Link>}
            <hr className="mx-1.5 my-1 border-ink/10" />
            <button role="menuitem" onClick={logout} className={item}>Se déconnecter</button>
          </div>
        )}
      </div>
    </header>
  );
}
