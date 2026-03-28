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
import { json, requireAuth } from "../../lib/api-utils";
import { SCRIPT_PREFIX } from "../../lib/constants";

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
  const auth = requireAuth(context);
  if (auth instanceof Response) return auth;

  let body: Body;
  try {
    body = (await context.request.json()) as Body;
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }

  const text = (body.message || "").trim();
  const rawDisplay = (body.displayName || "").trim().slice(0, 80);
  const firstToken = rawDisplay.split(/\s+/)[0] || "";
  const safeDisplayName = /^usuario$/i.test(firstToken) ? "" : firstToken;
  if (!text || text.length > 12000) {
    return json({ error: "Mensaje inválido" }, 400);
  }

  const supabase = getSupabaseAdmin();

  let sessionId = body.sessionId || null;
  if (!sessionId) {
    const { data: s, error: e1 } = await supabase
      .from("sessions")
      .insert({ clerk_user_id: auth, title: null })
      .select("id")
      .single();
    if (e1 || !s) {
      return json({ error: "No se pudo crear la sesión", detail: e1?.message }, 500);
    }
    sessionId = s.id;
  } else {
    const { data: check } = await supabase
      .from("sessions")
      .select("id")
      .eq("id", sessionId)
      .eq("clerk_user_id", auth)
      .maybeSingle();
    if (!check) return json({ error: "Sesión no encontrada" }, 404);
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
      return json({ error: msg }, 502);
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
  await supabase
    .from("meditation_artifacts")
    .upsert(artifactPayload, { onConflict: "session_id" });

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

  return json({
    sessionId,
    message: assistantText,
    scriptReady,
    scriptText: generatedScript ?? undefined,
    uiStep: nextStep?.key ?? "completed",
    quickOptions: nextStep?.quickOptions ?? [],
  });
};
