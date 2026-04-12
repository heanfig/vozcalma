/**
 * GET /api/onboarding/status?sessionId=<id>
 *
 * Endpoint de polling para ver el estado de una sesión async.
 * Útil si el cliente quiere saber si la meditación async ya terminó.
 */
import type { APIRoute } from "astro";
import { json } from "../../../lib/api-utils";
import { getSupabaseAdmin } from "../../../lib/supabase-server";

export const GET: APIRoute = async ({ url }) => {
  const sessionId = url.searchParams.get("sessionId");
  if (!sessionId) {
    return json({ error: "sessionId requerido" }, 400);
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("onboarding_sessions")
    .select("id, audio_url, script_text, status, error_message")
    .eq("id", sessionId)
    .maybeSingle();

  if (error) {
    return json({ error: error.message }, 500);
  }

  if (!data) {
    return json({ status: "not_found" }, 404);
  }

  // Si la columna `status` no existe (migración no aplicada), caemos al fallback
  // de "audio_url → ready / sin audio_url → pending"
  const status = (data as { status?: string }).status ?? (data.audio_url ? "ready" : "pending");

  return json({
    status,
    audioUrl: data.audio_url,
    scriptText: data.script_text,
    errorMessage: (data as { error_message?: string }).error_message ?? null,
  });
};
