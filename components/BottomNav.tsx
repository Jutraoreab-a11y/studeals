"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/marketplace", label: "Trouvailles", match: ["/marketplace"] },
  { href: "/gigs", label: "Coups de main", match: ["/gigs"] },
  { href: "/nightlife", label: "Ce soir", match: ["/nightlife", "/partenaires"] },
  { href: "/account", label: "Moi", match: ["/account", "/settings", "/messages", "/purchases", "/auth/verify", "/admin"] },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/10 bg-white pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto grid max-w-xl grid-cols-4">
        {ITEMS.map((item) => {
          const active = item.match.some((m) => path.startsWith(m));
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-14 items-center justify-center text-[13px] font-semibold ${
                  active ? "text-ink" : "text-ink-soft"
                }`}
              >
                <span className={active ? "border-b-2 border-sticker pb-0.5" : ""}>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
