import type { APIRoute } from "astro";
import { getSupabaseAdmin } from "../../lib/supabase-server";
import { json, requireAuth } from "../../lib/api-utils";
import { SCRIPT_PREFIX, extractScript } from "../../lib/constants";

export const GET: APIRoute = async (context) => {
  const auth = requireAuth(context);
  if (auth instanceof Response) return auth;

  const supabase = getSupabaseAdmin();
  const { data: sessions, error: sessionsError } = await supabase
    .from("sessions")
    .select("id, title, created_at")
    .eq("clerk_user_id", auth)
    .order("created_at", { ascending: false })
    .limit(200);

  if (sessionsError) return json({ error: sessionsError.message }, 500);

  const ids = (sessions || []).map((s) => s.id);
  if (ids.length === 0) return json({ items: [] });

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
      const scriptText = extractScript(scriptRaw);
      return {
        sessionId: s.id,
        title: s.title || "Meditación personalizada",
        createdAt: bySession.get(s.id)?.created_at || s.created_at,
        preview: scriptText.slice(0, 140),
      };
    });

  return json({ items });
};
