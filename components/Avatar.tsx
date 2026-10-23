const TONES = ["#ffe14d", "#ff9ec0", "#9fe7cf", "#c9c3ff"];

/** Photo de profil, ou initiale sur fond coloré. Pastille verte = Badge de Confiance. */
export function Avatar({
  name, url, verified, size = 36,
}: { name: string; url: string | null; verified: boolean; size?: number }) {
  const tone = TONES[(name.charCodeAt(0) || 0) % TONES.length];
  const dot = Math.round(size * 0.3);
  return (
    <span
      aria-hidden
      className="relative inline-grid shrink-0 place-items-center rounded-full font-display font-extrabold text-[#1a1b4b]"
      style={{ width: size, height: size, background: url ? undefined : tone, fontSize: size * 0.44 }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full rounded-full object-cover" />
      ) : (
        (name[0] ?? "?").toUpperCase()
      )}
      {verified && (
        <span
          className="absolute -bottom-px -right-px rounded-full border-2 border-paper bg-trust"
          style={{ width: dot, height: dot }}
        />
      )}
    </span>
  );
}
