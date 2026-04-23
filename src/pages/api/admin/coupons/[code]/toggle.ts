import type { APIRoute } from "astro";
import { json, withAdmin } from "../../../../../lib/api-utils";
import { getSupabaseAdmin } from "../../../../../lib/supabase-server";

export const POST: APIRoute = withAdmin(async ({ params }) => {
  const code = (params.code || "").toUpperCase();
  if (!code) return json({ error: "code requerido" }, 400);

  const supabase = getSupabaseAdmin();
  const { data: current, error: readErr } = await supabase
    .from("coupons")
    .select("is_active")
    .eq("code", code)
    .maybeSingle();
  if (readErr) return json({ error: readErr.message }, 500);
  if (!current) return json({ error: "Cupón no encontrado" }, 404);

  const { data, error } = await supabase
    .from("coupons")
    .update({ is_active: !current.is_active })
    .eq("code", code)
    .select("*")
    .maybeSingle();
  if (error) return json({ error: error.message }, 500);
  return json({ coupon: data });
});
