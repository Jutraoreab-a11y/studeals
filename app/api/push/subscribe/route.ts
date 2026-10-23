import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { jsonError } from "@/lib/api";

const Body = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string(), auth: z.string() }),
});

export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session) return jsonError("Connecte-toi.", 401);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Abonnement invalide.");

  await supabaseAdmin.from("push_subscriptions").upsert(
    { user_id: session.profile.id, endpoint: parsed.data.endpoint, p256dh: parsed.data.keys.p256dh, auth: parsed.data.keys.auth },
    { onConflict: "endpoint" },
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await getSessionUser();
  if (!session) return jsonError("Connecte-toi.", 401);
  const { endpoint } = (await req.json().catch(() => ({}))) as { endpoint?: string };
  if (endpoint) {
    await supabaseAdmin.from("push_subscriptions").delete().eq("endpoint", endpoint).eq("user_id", session.profile.id);
  }
  return NextResponse.json({ ok: true });
}
