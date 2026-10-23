import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { LEGAL_VERSION } from "@/lib/legal";
import { jsonError } from "@/lib/api";

/** Trace horodatée de l'acceptation des CGU (preuve du consentement). */
export async function POST() {
  const session = await getSessionUser();
  if (!session) return jsonError("Connecte-toi.", 401);
  await supabaseAdmin
    .from("users")
    .update({ legal_accepted_at: new Date().toISOString(), legal_version: LEGAL_VERSION })
    .eq("id", session.profile.id);
  return NextResponse.json({ ok: true });
}
