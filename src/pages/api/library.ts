import type { APIRoute } from "astro";
import { getSupabaseAdmin } from "../../lib/supabase-server";

const SCRIPT_PREFIX = "SCRIPT::";

export const GET: APIRoute = async (context) => {
  const { userId } = context.locals.auth();
  if (!userId) {
    return new Response(JSON.stringify({ error: "No autorizado" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = getSupabaseAdmin();
  const { data: sessions, error: sessionsError } = await supabase
    .from("sessions")
    .select("id, title, created_at")
    .eq("clerk_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (sessionsError) {
    return new Response(JSON.stringify({ error: sessionsError.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const ids = (sessions || []).map((s) => s.id);
  if (ids.length === 0) {
    return new Response(JSON.stringify({ items: [] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: systemMessages } = await supabase
    .from("messages")
    .select("session_id, content, created_at")
    .in("session_id", ids)
    .eq("role", "system")
    .order("created_at", { ascending: false });

  const bySession = new Map<string, { content: string; created_at: string }>();
  for (const row of systemMessages || []) {
    if (!String(row.content || "").startsWith(SCRIPT_PREFIX)) continue;
    if (!bySession.has(row.session_id)) {
      bySession.set(row.session_id, {
        content: row.content,
        created_at: row.created_at,
      });
    }
  }

  const items = (sessions || [])
    .filter((s) => bySession.has(s.id))
    .map((s) => {
      const scriptRaw = bySession.get(s.id)?.content || "";
      const scriptText = scriptRaw.replace(SCRIPT_PREFIX, "").split("---FIN_GUIÓN---")[0].trim();
      return {
        sessionId: s.id,
        title: s.title || "Meditación personalizada",
        createdAt: bySession.get(s.id)?.created_at || s.created_at,
        preview: scriptText.slice(0, 140),
      };
    });

  return new Response(JSON.stringify({ items }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
