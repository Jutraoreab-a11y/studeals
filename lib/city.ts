export const CITIES = [
  { slug: "lille", name: "Lille" },
  { slug: "reims", name: "Reims" },
  { slug: "paris", name: "Paris / IDF" },
] as const;

export type CitySlug = (typeof CITIES)[number]["slug"];
export const CITY_COOKIE = "studeals_city";

export function isCitySlug(v: string | undefined): v is CitySlug {
  return CITIES.some((c) => c.slug === v);
}
