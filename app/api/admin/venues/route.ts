import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { jsonError } from "@/lib/api";

const Body = z.discriminatedUnion("op", [
  z.object({ op: z.literal("approve"), applicationId: z.string().uuid() }),
  z.object({ op: z.literal("reject"), applicationId: z.string().uuid() }),
  z.object({ op: z.literal("toggle"), venueId: z.string().uuid(), active: z.boolean() }),
  z.object({ op: z.literal("add_deal"), venueId: z.string().uuid(), label: z.string().min(3).max(120), validOn: z.string().max(60).optional() }),
  z.object({ op: z.literal("delete_deal"), dealId: z.string().uuid() }),
]);

export async function POST(req: Request) {
  if (!(await requireAdmin())) return jsonError("Accès refusé.", 403);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Requête invalide.");
  const b = parsed.data;

  switch (b.op) {
    case "approve": {
      const { data: app } = await supabaseAdmin.from("venue_applications").select("*").eq("id", b.applicationId).single();
      if (!app || app.status !== "pending") return jsonError("Candidature déjà traitée.", 409);
      const { data: venue } = await supabaseAdmin
        .from("venues")
        .insert({ city_id: app.city_id, name: app.venue_name, type: app.venue_type, address: app.address, contact_email: app.email })
        .select("id").single();
      if (venue && app.offer) await supabaseAdmin.from("venue_deals").insert({ venue_id: venue.id, label: app.offer });
      await supabaseAdmin.from("venue_applications").update({ status: "approved" }).eq("id", app.id);
      break;
    }
    case "reject":
      await supabaseAdmin.from("venue_applications").update({ status: "rejected" }).eq("id", b.applicationId);
      break;
    case "toggle":
      await supabaseAdmin.from("venues").update({ is_active: b.active }).eq("id", b.venueId);
      break;
    case "add_deal":
      await supabaseAdmin.from("venue_deals").insert({ venue_id: b.venueId, label: b.label, valid_on: b.validOn ?? null });
      break;
    case "delete_deal":
      await supabaseAdmin.from("venue_deals").delete().eq("id", b.dealId);
      break;
  }
  return NextResponse.json({ ok: true });
}
