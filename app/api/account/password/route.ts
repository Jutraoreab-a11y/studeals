import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient as createPlainClient } from "@supabase/supabase-js";
import { createClient, getSessionUser } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { PASSWORD_RULE } from "@/lib/profile";
import { jsonError } from "@/lib/api";

const Body = z.object({
  current: z.string().max(72).optional(),
  next: z.string().regex(PASSWORD_RULE),
});

/**
 * Crée ou change le mot de passe.
 * S'il en existe déjà un, l'ancien est vérifié côté serveur avant tout changement.
 */
export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session) return jsonError("Connecte-toi.", 401);
  const { profile } = session;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("8 caractères minimum, dont au moins un chiffre.");
  const { current, next } = parsed.data;

  if (profile.password_set_at) {
    if (!current) return jsonError("Entre ton mot de passe actuel.");
    const login = profile.email ? { email: profile.email } : profile.phone ? { phone: profile.phone } : null;
    if (!login) return jsonError("Ajoute d'abord un email ou un téléphone.");
    // Client jetable : vérifie l'ancien mot de passe sans toucher à la session du navigateur.
    const probe = createPlainClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await probe.auth.signInWithPassword({ ...login, password: current } as Parameters<typeof probe.auth.signInWithPassword>[0]);
    if (error) return jsonError("Mot de passe actuel incorrect.", 400);
    await probe.auth.signOut({ scope: "local" }); // ferme uniquement la session de vérification
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) {
    if (error.message.toLowerCase().includes("same")) return jsonError("Choisis un mot de passe différent de l'actuel.");
    return jsonError("Enregistrement impossible. Reconnecte-toi puis réessaie.", 400);
  }

  await supabaseAdmin.from("users").update({ password_set_at: new Date().toISOString() }).eq("id", profile.id);
  return NextResponse.json({ ok: true });
}
