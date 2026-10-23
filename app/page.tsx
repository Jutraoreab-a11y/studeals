import Link from "next/link";

const TAGS = [
  { price: "15 €", what: "Bureau IKEA, un pied qui grince", r: "-6deg", tone: "bg-sticker" },
  { price: "Libre", what: "Chambre 11 m², coloc à 3, Fives", r: "4deg", tone: "bg-white" },
  { price: "SOS 12 €", what: "Porter un frigo au 4e sans ascenseur", r: "-2deg", tone: "bg-signal text-white" },
  { price: "4 €", what: "Lampe de chevet, jamais servi", r: "7deg", tone: "bg-white" },
];

export default function Home() {
  return (
    <>
      <section className="pt-6 pb-10">
        <h1 className="font-display text-[2.6rem] leading-[0.95] font-extrabold tracking-tight">
          Ce que tu lâches, quelqu&apos;un de ton quartier le cherche.
        </h1>
        <p className="mt-4 max-w-[34ch] text-lg text-ink-soft">
          Seconde main, coloc et petits services entre 18-25 ans. Pas de pros, pas d&apos;agences,
          paiement bloqué jusqu&apos;à la remise en main propre.
        </p>

        <ul aria-label="Exemples d'annonces" className="mt-8 flex flex-col gap-3">
          {TAGS.map((t, i) => (
            <li
              key={t.what}
              style={{ ["--r" as string]: t.r, transform: `rotate(${t.r})`, animationDelay: `${i * 90}ms` }}
              className={`tag-drop flex items-baseline gap-3 self-start rounded-2xl ${t.tone} px-4 py-3 shadow-[3px_3px_0_#1a1b4b] ${
                i % 2 ? "ml-auto" : ""
              }`}
            >
              <span className="font-display text-2xl font-extrabold whitespace-nowrap">{t.price}</span>
              <span className="text-sm leading-snug">{t.what}</span>
            </li>
          ))}
        </ul>

        <div className="mt-10 flex gap-3">
          <Link href="/marketplace" className="flex-1 rounded-full bg-ink py-4 text-center font-semibold text-white">
            Voir les trouvailles
          </Link>
          <Link href="/marketplace/new" className="flex-1 rounded-full border-2 border-ink py-4 text-center font-semibold">
            Vendre en 30 s
          </Link>
        </div>
      </section>

      <section aria-labelledby="install" className="rounded-3xl bg-ink p-5 text-white">
        <h2 id="install" className="font-display text-2xl font-bold">Ajoute Studeals à ton écran d&apos;accueil</h2>
        <p className="mt-1 text-white/75">Pas besoin de store. 20 secondes, regarde :</p>
        <div className="mx-auto mt-5 aspect-[9/16] w-48 overflow-hidden rounded-[2rem] border-4 border-white/20 bg-black">
          <video
            className="h-full w-full object-cover"
            src="/pwa-install.mp4"
            poster="/pwa-install-poster.jpg"
            autoPlay
            muted
            loop
            playsInline
            aria-label="Tutoriel d'installation sur iPhone et Android"
          />
        </div>
      </section>

      <section className="py-10">
        <h2 className="font-display text-2xl font-bold">Comment on garde ça propre</h2>
        <dl className="mt-5 space-y-5">
          <div>
            <dt className="font-semibold">Zéro pro</dt>
            <dd className="text-ink-soft">Uniquement des particuliers de 18 à 25 ans. Les comptes revendeurs sont fermés.</dd>
          </div>
          <div>
            <dt className="font-semibold">100 % entre nous</dt>
            <dd className="text-ink-soft">Chaque membre passe la vérification d&apos;identité avant de vendre ou d&apos;acheter.</dd>
          </div>
          <div>
            <dt className="font-semibold">Ton argent est bloqué, pas perdu</dt>
            <dd className="text-ink-soft">
              Tu paies, on garde l&apos;argent. Le vendeur ne le reçoit qu&apos;en tapant le code à 4 chiffres que tu lui
              donnes en main propre.
            </dd>
          </div>
        </dl>
      </section>

      <footer className="flex flex-wrap gap-x-4 gap-y-2 border-t border-ink/10 py-6 text-sm text-ink-soft">
        <Link href="/legal/cgu" className="underline">CGU</Link>
        <Link href="/legal/cgv" className="underline">CGV</Link>
        <Link href="/legal/confidentialite" className="underline">Confidentialité</Link>
        <Link href="/legal/mentions" className="underline">Mentions légales</Link>
        <Link href="/partenaires" className="underline">Bars : devenir partenaire</Link>
      </footer>
    </>
  );
}
