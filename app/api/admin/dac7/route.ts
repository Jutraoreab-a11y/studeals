import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin";
import { jsonError } from "@/lib/api";

/** Export CSV DAC7 de l'année (vendeurs à déclarer + infos fiscales). */
export async function GET(req: Request) {
  if (!(await requireAdmin())) return jsonError("Accès refusé.", 403);
  const year = Number(new URL(req.url).searchParams.get("year") ?? new Date().getFullYear() - 1);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("dac7_report", { p_year: year });
  if (error) return jsonError(error.message, 500);

  const rows = (data ?? []) as Record<string, unknown>[];
  const cols = [
    "seller_id", "email", "reportable", "has_tax_info", "goods_count", "goods_amount", "services_count", "services_amount", "fees",
    "q1", "q2", "q3", "q4", "first_name", "last_name", "birth_date", "address", "postal_code", "city", "country", "tax_id",
  ];
  const cell = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [cols.join(";"), ...rows.map((r) => cols.map((c) => cell(r[c])).join(";"))].join("\n");

  return new Response("\uFEFF" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="studeals-dac7-${year}.csv"`,
    },
  });
}
