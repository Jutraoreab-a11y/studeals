import "server-only";
import { getSessionUser } from "@/lib/supabase/server";

/** Retourne le profil admin ou null (à utiliser dans chaque route /api/admin/*). */
export async function requireAdmin() {
  const session = await getSessionUser();
  if (!session?.profile.is_admin) return null;
  return session.profile;
}
