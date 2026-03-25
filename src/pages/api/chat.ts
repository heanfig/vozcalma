/**
 * Orquestación LLM + Supabase en Node (Astro server). Un solo deploy y secretos unificados.
 * Tareas batch o export JSONL: scripts/ con cron o ejecución manual; no flujo crítico en n8n.
 */
import type { APIRoute } from "astro";
import { getSupabaseAdmin } from "../../lib/supabase-server";
import {
  applyAnswer,
  getCurrentStep,
  getCurrentStepIndex,
  isIntakeComplete,
  type IntakeData,
} from "../../lib/meditation/intake";
import { fetchKnowledgeStyleHints } from "../../lib/meditation/knowledge-retrieval";
import { buildMeditationPlan } from "../../lib/meditation/planner";
import { generateMeditationScript } from "../../lib/meditation/script-writer";
import { prepareScriptForTts } from "../../lib/meditation/script-post";
import { saveMeditationScriptReviewFile } from "../../lib/meditation/save-script-review";

type Body = {
  sessionId?: string | null;
  message: string;
  displayName?: string;
};

type ArtifactRow = {
  intake_json: IntakeData | null;
  plan_json: unknown | null;
  script_text: string | null;
  audio_status: "pending" | "ready" | "failed" | null;
};

const SCRIPT_PREFIX = "SCRIPT::";

function rebuildIntakeFromUserHistory(
  userHistory: Array<{ role: string; content: string }>,
): IntakeData {
  let intake: IntakeData = {};
  for (const m of userHistory) {
    intake = applyAnswer(intake, m.content);
  }
  return intake;
}

export const POST: APIRoute = async (context) => {
  const { userId } = context.locals.auth();
  if (!userId) {
    return new Response(JSON.stringify({ error: "No autorizado" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: Body;
  try {
    body = (await context.request.json()) as Body;
  } catch {
    return new Response(JSON.stringify({ error: "JSON inválido" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const text = (body.message || "").trim();
  const rawDisplay = (body.displayName || "").trim().slice(0, 80);
  const firstToken = rawDisplay.split(/\s+/)[0] || "";
  const safeDisplayName = /^usuario$/i.test(firstToken) ? "" : firstToken;
  if (!text || text.length > 12000) {
    return new Response(JSON.stringify({ error: "Mensaje inválido" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = getSupabaseAdmin();

  let sessionId = body.sessionId || null;
  if (!sessionId) {
    const { data: s, error: e1 } = await supabase
      .from("sessions")
      .insert({ clerk_user_id: userId, title: null })
      .select("id")
      .single();
    if (e1 || !s) {
      return new Response(
        JSON.stringify({ error: "No se pudo crear la sesión", detail: e1?.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
    sessionId = s.id;
  } else {
    const { data: check } = await supabase
      .from("sessions")
      .select("id")
      .eq("id", sessionId)
      .eq("clerk_user_id", userId)
      .maybeSingle();
    if (!check) {
      return new Response(JSON.stringify({ error: "Sesión no encontrada" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  await supabase.from("messages").insert({
    session_id: sessionId,
    role: "user",
    content: text,
  });

  const { data: history } = await supabase
    .from("messages")
    .select("role, content")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  const { data: artifact, error: artifactError } = await supabase
    .from("meditation_artifacts")
    .select("intake_json, plan_json, script_text, audio_status")
    .eq("session_id", sessionId)
    .maybeSingle<ArtifactRow>();

  const userHistory = (history || []).filter((m) => m.role === "user");
  const fallbackPreviousIntake = rebuildIntakeFromUserHistory(
    userHistory.slice(0, Math.max(0, userHistory.length - 1)),
  );
  const fallbackUpdatedIntake = rebuildIntakeFromUserHistory(userHistory);

  const previousIntake = artifactError
    ? fallbackPreviousIntake
    : ((artifact?.intake_json || {}) as IntakeData);
  if (!previousIntake.name && safeDisplayName) {
    previousIntake.name = safeDisplayName;
  }
  const previousStepIndex = getCurrentStepIndex(previousIntake);
  let updatedIntake = artifactError
    ? fallbackUpdatedIntake
    : applyAnswer(previousIntake, text);
  if (!updatedIntake.name?.trim() && safeDisplayName) {
    updatedIntake = { ...updatedIntake, name: safeDisplayName };
  }
  const nextStep = getCurrentStep(updatedIntake);
  const intakeComplete = isIntakeComplete(updatedIntake);
  let assistantText = "";
  let scriptReady = false;
  let generatedScript: string | null = null;
  let generatedPlan: unknown = artifact?.plan_json ?? null;

  if (intakeComplete) {
    try {
      const plan = buildMeditationPlan(updatedIntake);
      generatedPlan = plan;
      const { styleHints } = await fetchKnowledgeStyleHints(
        supabase,
        updatedIntake,
      );
      const rawScript = await generateMeditationScript(updatedIntake, plan, {
        styleHints,
      });
      scriptReady = rawScript.includes("---FIN_GUIÓN---");
      const nameForTts = (updatedIntake.name || safeDisplayName || "").trim();
      generatedScript = prepareScriptForTts(rawScript, nameForTts);
      if (sessionId) {
        void saveMeditationScriptReviewFile({
          sessionId,
          scriptText: generatedScript,
        }).catch(() => {});
      }
      assistantText =
        "Gracias por abrirte conmigo. Estoy preparando tu meditación personalizada y en unos segundos tendrás el audio listo.";
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error al generar meditación";
      return new Response(JSON.stringify({ error: msg }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }
  } else {
    const callName = (previousIntake.name || safeDisplayName || "").trim();
    const intro =
      previousStepIndex === 0
        ? callName && !/^usuario$/i.test(callName)
          ? `Gracias por compartirlo, ${callName}. Vamos a respirar juntos y profundizar con calma para crear una meditación amorosa y transformadora.\n\n`
          : "Gracias por compartirlo. Vamos a respirar juntos y profundizar con calma para crear una meditación amorosa y transformadora.\n\n"
        : "";
    assistantText = intro + (nextStep?.question || "Contame un poco más para personalizar tu sesión.");
  }

  await supabase.from("messages").insert({
    session_id: sessionId,
    role: "assistant",
    content: assistantText,
  });

  if (generatedScript) {
    await supabase.from("messages").insert({
      session_id: sessionId,
      role: "system",
      content: `${SCRIPT_PREFIX}${generatedScript}`,
    });
  }

  const artifactPayload = {
    session_id: sessionId,
    intake_json: updatedIntake,
    plan_json: generatedPlan,
    script_text: generatedScript ?? artifact?.script_text ?? null,
    audio_status: scriptReady ? "pending" : (artifact?.audio_status ?? "pending"),
    updated_at: new Date().toISOString(),
  };
  const { error: artifactUpsertError } = await supabase
    .from("meditation_artifacts")
    .upsert(artifactPayload, {
      onConflict: "session_id",
    });

  if (artifactUpsertError) {
    // Keep flow resilient if optional artifacts table is unavailable.
  }

  if (!artifact?.intake_json?.name && updatedIntake.name) {
    await supabase
      .from("sessions")
      .update({ title: `Meditación de ${updatedIntake.name}` })
      .eq("id", sessionId);
  } else if (!artifact?.intake_json?.emotion && updatedIntake.emotion) {
    await supabase
      .from("sessions")
      .update({ title: `Sesión: ${updatedIntake.emotion}` })
      .eq("id", sessionId);
  }

  return new Response(
    JSON.stringify({
      sessionId,
      message: assistantText,
      scriptReady,
      scriptText: generatedScript ?? undefined,
      uiStep: nextStep?.key ?? "completed",
      quickOptions: nextStep?.quickOptions ?? [],
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};
