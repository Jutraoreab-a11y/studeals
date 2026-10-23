import Link from "next/link";

export function Chips({
  items,
  active,
  hrefFor,
}: {
  items: readonly { key: string; label: string }[];
  active: string;
  hrefFor: (key: string) => string;
}) {
  return (
    <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
      {items.map((i) => (
        <Link
          key={i.key}
          href={hrefFor(i.key)}
          aria-current={i.key === active ? "true" : undefined}
          className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${
            i.key === active ? "bg-ink text-white" : "bg-white text-ink"
          }`}
        >
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
