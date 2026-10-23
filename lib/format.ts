const eur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 2 });

export function euros(n: number | string) {
  const v = Number(n);
  return Number.isInteger(v) ? `${v} €` : eur.format(v);
}

export function timeAgo(iso: string) {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "à l'instant";
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  return `il y a ${Math.floor(s / 86400)} j`;
}

export function ageFrom(birth: string | Date) {
  const b = new Date(birth);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

export const LISTING_FILTERS = [
  { key: "all", label: "Tout" },
  { key: "furniture", label: "Meubles & Bureau" },
  { key: "items", label: "Objets" },
  { key: "room", label: "Colocation" },
] as const;

export const GIG_CATEGORIES = [
  { key: "groceries", label: "Courses" },
  { key: "laundry", label: "Laverie" },
  { key: "digital", label: "Numérique" },
  { key: "moving", label: "Déménagement" },
  { key: "other", label: "Autre" },
] as const;

export function gigCategoryLabel(key: string) {
  return GIG_CATEGORIES.find((c) => c.key === key)?.label ?? "Autre";
}
