/** Bloc de paramètres : titre discret + carte blanche découpée en lignes. */
export function Section({ title, children, note }: { title: string; children: React.ReactNode; note?: React.ReactNode }) {
  return (
    <section>
      <h2 className="mx-1 mb-2 mt-7 text-[15px] font-semibold text-ink-soft">{title}</h2>
      <div className="divide-y divide-ink/10 rounded-2xl bg-white px-4">{children}</div>
      {note && <p className="mx-1 mt-2 text-xs text-ink-soft">{note}</p>}
    </section>
  );
}

export function Row({ label, sub, action, children }: {
  label: React.ReactNode; sub?: React.ReactNode; action?: React.ReactNode; children?: React.ReactNode;
}) {
  return (
    <div className="py-3.5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold">{label}</p>
          {sub && <div className="break-words text-sm text-ink-soft">{sub}</div>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}

export const linkBtn = "text-sm font-semibold underline disabled:opacity-50";
export const field = "w-full rounded-xl border-2 border-transparent bg-paper px-3.5 py-2.5 focus:border-ink focus:outline-none";
export const primary = "rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-50";
