"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { CITY_COOKIE, type CitySlug } from "@/lib/city";
import { createClient } from "@/lib/supabase/client";

/** Change la ville (cookie + profil) et rafraîchit la page courante sans la quitter. */
export function useSetCity() {
  const router = useRouter();
  const [pending, start] = useTransition();

  async function setCity(slug: CitySlug) {
    document.cookie = `${CITY_COOKIE}=${slug}; path=/; max-age=31536000; samesite=lax`;
    start(() => router.refresh());
    // La ville du profil sert à recevoir les alertes SOS du bon quartier.
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: city } = await supabase.from("cities").select("id").eq("slug", slug).single();
    if (city) await supabase.from("users").update({ city_id: city.id }).eq("id", user.id);
  }

  return { setCity, pending };
}
