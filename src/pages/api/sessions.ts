import type { APIRoute } from "astro";
import { getSupabaseAdmin } from "../../lib/supabase-server";
import { json, requireAuth } from "../../lib/api-utils";

export const GET: APIRoute = async (context) => {
  const auth = requireAuth(context);
  if (auth instanceof Response) return auth;

  const supabase = getSupabaseAdmin();
  const { data: sessions, error } = await supabase
    .from("sessions")
    .select("id, title, created_at")
    .eq("clerk_user_id", auth)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return json({ error: error.message }, 500);

  return json({ sessions: sessions || [] });
};
