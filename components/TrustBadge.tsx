export function TrustBadge({ verified, size = "sm" }: { verified: boolean; size?: "sm" | "md" }) {
  if (!verified) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-trust/15 font-semibold text-[#0b7a5e] ${
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"
      }`}
    >
      <svg aria-hidden viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-current">
        <path d="M8 0l2 2.2 3-.2.3 3L16 7l-1.8 2.3.3 3-3 .4L8 16l-2.4-2.3-3-.4.3-3L0 7l2.7-2 .3-3 3 .2z" />
        <path d="M5 8l2 2 4-4" stroke="#fff" strokeWidth="1.6" fill="none" />
      </svg>
      Vérifié
    </span>
  );
}
