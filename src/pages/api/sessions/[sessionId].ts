import type { APIRoute } from "astro";
import { getSupabaseAdmin } from "../../../lib/supabase-server";
import {
  applyAnswer,
  getCurrentStep,
  type IntakeData,
} from "../../../lib/meditation/intake";
import { json, requireAuth } from "../../../lib/api-utils";
import { SCRIPT_PREFIX } from "../../../lib/constants";

type ArtifactRow = {
  intake_json: IntakeData | null;
  script_text: string | null;
};

export const GET: APIRoute = async (context) => {
  const auth = requireAuth(context);
  if (auth instanceof Response) return auth;

  const sessionId = context.params.sessionId;
  if (!sessionId) return json({ error: "Sesión inválida" }, 400);

  const supabase = getSupabaseAdmin();
  const { data: session } = await supabase
    .from("sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("clerk_user_id", auth)
    .maybeSingle();
  if (!session) return json({ error: "Sesión no encontrada" }, 404);

  const { data: messages, error: messagesError } = await supabase
    .from("messages")
    .select("id, role, content, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  if (messagesError) return json({ error: messagesError.message }, 500);

  const { data: artifact } = await supabase
    .from("meditation_artifacts")
    .select("intake_json, script_text")
    .eq("session_id", sessionId)
    .maybeSingle<ArtifactRow>();
  const fallbackScript = (messages || []).find(
    (m) => m.role === "system" && String(m.content || "").startsWith(SCRIPT_PREFIX),
  );

  const fallbackIntake = (messages || [])
    .filter((m) => m.role === "user")
    .reduce((acc, m) => applyAnswer(acc, m.content), {} as IntakeData);
  const intake = ((artifact?.intake_json || fallbackIntake) as IntakeData) || {};
  const nextStep = getCurrentStep(intake);

  return json({
    sessionId,
    messages: (messages || []).filter((m) => m.role !== "system"),
    scriptReady: !!artifact?.script_text || !!fallbackScript,
    uiStep: nextStep?.key ?? "completed",
    quickOptions: nextStep?.quickOptions ?? [],
  });
};

export const PATCH: APIRoute = async (context) => {
  const auth = requireAuth(context);
  if (auth instanceof Response) return auth;

  const sessionId = context.params.sessionId;
  const body = (await context.request.json().catch(() => ({}))) as { title?: string };
  const title = (body.title || "").trim().slice(0, 100);
  if (!sessionId || !title) return json({ error: "Datos inválidos" }, 400);

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("sessions")
    .update({ title })
    .eq("id", sessionId)
    .eq("clerk_user_id", auth);
  if (error) return json({ error: error.message }, 500);

  return json({ ok: true });
};

export const DELETE: APIRoute = async (context) => {
  const auth = requireAuth(context);
  if (auth instanceof Response) return auth;

  const sessionId = context.params.sessionId;
  if (!sessionId) return json({ error: "Sesión inválida" }, 400);

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("sessions")
    .delete()
    .eq("id", sessionId)
    .eq("clerk_user_id", auth);
  if (error) return json({ error: error.message }, 500);

  return json({ ok: true });
};
