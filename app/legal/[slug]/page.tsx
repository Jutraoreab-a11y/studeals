import Link from "next/link";
import { notFound } from "next/navigation";
import { LEGAL_DOCS } from "@/lib/legal-content";

export function generateStaticParams() {
  return Object.keys(LEGAL_DOCS).map((slug) => ({ slug }));
}

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = LEGAL_DOCS[slug];
  if (!doc) notFound();

  return (
    <article className="pb-10 pt-6 leading-relaxed">
      <h1 className="font-display text-3xl font-extrabold leading-tight">{doc.title}</h1>
      <p className="mt-1 text-sm text-ink-soft">Mise à jour : {doc.updated}</p>
      {doc.body}
      <nav className="mt-10 flex flex-wrap gap-x-4 gap-y-2 text-sm text-ink-soft">
        {Object.entries(LEGAL_DOCS).filter(([k]) => k !== slug).map(([k, d]) => (
          <Link key={k} href={`/legal/${k}`} className="underline">{d.title}</Link>
        ))}
      </nav>
    </article>
  );
}
