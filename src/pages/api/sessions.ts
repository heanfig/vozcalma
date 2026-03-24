import type { APIRoute } from "astro";
import { getSupabaseAdmin } from "../../lib/supabase-server";

export const GET: APIRoute = async (context) => {
  const { userId } = context.locals.auth();
  if (!userId) {
    return new Response(JSON.stringify({ error: "No autorizado" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = getSupabaseAdmin();
  const { data: sessions, error } = await supabase
    .from("sessions")
    .select("id, title, created_at")
    .eq("clerk_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ sessions: sessions || [] }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
