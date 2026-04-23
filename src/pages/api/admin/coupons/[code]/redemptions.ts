import type { APIRoute } from "astro";
import { json, withAdmin } from "../../../../../lib/api-utils";
import { getSupabaseAdmin } from "../../../../../lib/supabase-server";

export const GET: APIRoute = withAdmin(async ({ params }) => {
  const code = (params.code || "").toUpperCase();
  if (!code) return json({ error: "code requerido" }, 400);

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("coupon_redemptions")
    .select("id, session_id, redeemed_at, discount_cents_applied")
    .eq("coupon_code", code)
    .order("redeemed_at", { ascending: false })
    .limit(500);
  if (error) return json({ error: error.message }, 500);
  return json({ redemptions: data || [] });
});
