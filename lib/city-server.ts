import "server-only";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { CITY_COOKIE, isCitySlug } from "@/lib/city";
import type { City } from "@/types/database";

/** Ville courante (cookie) résolue en ligne `cities`. */
export async function getCurrentCity(): Promise<City> {
  const raw = (await cookies()).get(CITY_COOKIE)?.value;
  const slug = isCitySlug(raw) ? raw : "lille";
  const supabase = await createClient();
  const { data } = await supabase.from("cities").select("*").eq("slug", slug).single();
  if (!data) throw new Error(`Ville introuvable : ${slug}. As-tu lancé la migration ?`);
  return data as City;
}
