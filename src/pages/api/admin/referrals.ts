import type { APIRoute } from "astro";
import { json, withAdmin } from "../../../lib/api-utils";
import { getSupabaseAdmin } from "../../../lib/supabase-server";

export const GET: APIRoute = withAdmin(async () => {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("referral_conversions")
    .select("*");
  if (error) return json({ error: error.message }, 500);
  return json({ referrals: data || [] });
});
