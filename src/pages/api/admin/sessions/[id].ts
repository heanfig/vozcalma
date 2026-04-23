import type { APIRoute } from "astro";
import { json, withAdmin } from "../../../../lib/api-utils";
import { getSupabaseAdmin } from "../../../../lib/supabase-server";

export const GET: APIRoute = withAdmin(async ({ params }) => {
  const id = params.id;
  if (!id) return json({ error: "id requerido" }, 400);

  const supabase = getSupabaseAdmin();

  const [sessionRes, costsRes, playLinksRes, redemptionsRes] = await Promise.all([
    supabase.from("onboarding_sessions").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("meditation_costs")
      .select("*")
      .eq("session_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("play_links")
      .select("token, audio_url, expires_at, source, created_at")
      .eq("session_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("coupon_redemptions")
      .select("*")
      .eq("session_id", id),
  ]);

  if (sessionRes.error) return json({ error: sessionRes.error.message }, 500);
  if (!sessionRes.data) return json({ error: "Sesión no encontrada" }, 404);

  return json({
    session: sessionRes.data,
    costs: costsRes.data || [],
    play_links: playLinksRes.data || [],
    coupon_redemptions: redemptionsRes.data || [],
  });
});
