import type { UserProfile } from "@/types/database";

/** Nom à afficher : prénom choisi, sinon début de l'email, sinon « Moi ». */
export function displayName(p: Pick<UserProfile, "display_name" | "email">) {
  if (p.display_name) return p.display_name;
  const local = p.email?.split("@")[0]?.split(/[._+-]/)[0];
  return local ? local.charAt(0).toUpperCase() + local.slice(1) : "Moi";
}

/** Données minimales passées aux composants client de l'en-tête. */
export type HeaderUser = {
  name: string;
  email: string | null;
  avatarUrl: string | null;
  verified: boolean;
  isAdmin: boolean;
  unread: number;
};

export function maskPhone(phone: string | null) {
  if (!phone) return null;
  // Supabase enregistre le numéro sans « + » (33612345678)
  let d = phone.replace(/[^\d+]/g, "");
  if (!d.startsWith("+")) d = `+${d}`;
  if (d.startsWith("+33") && d.length === 12) return `+33 ${d[3]} •• •• •• ${d.slice(-2)}`;
  return d.length > 6 ? `${d.slice(0, 4)} •• •• ${d.slice(-2)}` : d;
}

/** 06 12 34 56 78 → +33612345678 (format attendu par Supabase). */
export function normalizePhone(v: string) {
  const d = v.replace(/\D/g, "");
  if (v.trim().startsWith("+")) return `+${d}`;
  return d.startsWith("0") ? `+33${d.slice(1)}` : `+${d}`;
}

export const PASSWORD_RULE = /^(?=.*\d).{8,72}$/;
