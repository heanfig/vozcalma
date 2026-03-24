import type { APIRoute } from "astro";
import { getSupabaseAdmin } from "../../../lib/supabase-server";
import {
  applyAnswer,
  getCurrentStep,
  type IntakeData,
} from "../../../lib/meditation/intake";

type ArtifactRow = {
  intake_json: IntakeData | null;
  script_text: string | null;
};
const SCRIPT_PREFIX = "SCRIPT::";

export const GET: APIRoute = async (context) => {
  const { userId } = context.locals.auth();
  if (!userId) {
    return new Response(JSON.stringify({ error: "No autorizado" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const sessionId = context.params.sessionId;
  if (!sessionId) {
    return new Response(JSON.stringify({ error: "Sesión inválida" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = getSupabaseAdmin();
  const { data: session } = await supabase
    .from("sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("clerk_user_id", userId)
    .maybeSingle();
  if (!session) {
    return new Response(JSON.stringify({ error: "Sesión no encontrada" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: messages, error: messagesError } = await supabase
    .from("messages")
    .select("id, role, content, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  if (messagesError) {
    return new Response(JSON.stringify({ error: messagesError.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

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

  return new Response(
    JSON.stringify({
      sessionId,
      messages: (messages || []).filter((m) => m.role !== "system"),
      scriptReady: !!artifact?.script_text || !!fallbackScript,
      uiStep: nextStep?.key ?? "completed",
      quickOptions: nextStep?.quickOptions ?? [],
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
};

export const PATCH: APIRoute = async (context) => {
  const { userId } = context.locals.auth();
  if (!userId) {
    return new Response(JSON.stringify({ error: "No autorizado" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  const sessionId = context.params.sessionId;
  const body = (await context.request.json().catch(() => ({}))) as { title?: string };
  const title = (body.title || "").trim().slice(0, 100);
  if (!sessionId || !title) {
    return new Response(JSON.stringify({ error: "Datos inválidos" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("sessions")
    .update({ title })
    .eq("id", sessionId)
    .eq("clerk_user_id", userId);
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

export const DELETE: APIRoute = async (context) => {
  const { userId } = context.locals.auth();
  if (!userId) {
    return new Response(JSON.stringify({ error: "No autorizado" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  const sessionId = context.params.sessionId;
  if (!sessionId) {
    return new Response(JSON.stringify({ error: "Sesión inválida" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("sessions")
    .delete()
    .eq("id", sessionId)
    .eq("clerk_user_id", userId);
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
