/**
 * Pipeline de generación de meditaciones — extraído de api/onboarding/generate.ts
 * para poder ser reutilizado tanto en modo síncrono (HTTP) como asíncrono (background worker).
 *
 * Flujo:
 * 1. Si type === "quick" y categoría != "Situaciones específicas":
 *    → try pre-gen filesystem → si hit, upload directamente
 *    → si miss, fall-through a LLM
 * 2. LLM path: buildPrompt → completeChat → prepareScriptForTts → synthesizeLongSpeech → mixVoiceWithBackground
 * 3. Upload a Supabase Storage + create play_link
 *
 * Concurrencia: limitada a 5 jobs simultáneos por proceso.
 */
import { getSupabaseAdmin } from "../supabase-server";
import { completeChat, type ChatMessage, type CompleteChatResult } from "../openrouter";
import { fetchGenerationCost } from "../openrouter-usage";
import { estimateTtsCostUsd } from "../pricing";
import { prepareScriptForTts } from "./script-post";
import { synthesizeWithPauses, spokenChars } from "../elevenlabs";
import { buildPrompt, type OnboardingType } from "../../components/onboarding/onboarding-data";
import { mixVoiceWithBackground } from "../audio-mixer";
import { pickPreGenMeditation } from "../pre-gen-meditations";
import {
  saveMeditationScriptReviewFile,
  saveMeditationAudioFile,
} from "./save-script-review";

const BUCKET = "meditation-audio";

// ============================================================================
// Concurrencia: semáforo simple
// ============================================================================
let activeJobs = 0;
const MAX_CONCURRENT = 5;
const waitQueue: Array<() => void> = [];

async function acquireSlot(): Promise<void> {
  if (activeJobs < MAX_CONCURRENT) {
    activeJobs++;
    return;
  }
  await new Promise<void>((resolve) => {
    waitQueue.push(resolve);
  });
  activeJobs++;
}

function releaseSlot(): void {
  activeJobs--;
  const next = waitQueue.shift();
  if (next) next();
}

// ============================================================================
// Types
// ============================================================================

export interface GenerateParams {
  type: OnboardingType;
  answers: Record<string, string>;
  /** Session ID existente (para reutilizar una row en onboarding_sessions) */
  existingSessionId?: string | null;
}

export interface GenerateResult {
  sessionId: string;
  audioUrl: string;
  scriptText: string;
  playUrl: string;
  /** "pregen" si vino de filesystem, "llm" si se generó con LLM */
  source: "pregen" | "llm";
}

// ============================================================================
// Pipeline principal
// ============================================================================

export async function generateMeditation(
  params: GenerateParams,
): Promise<GenerateResult> {
  await acquireSlot();
  try {
    return await runPipeline(params);
  } finally {
    releaseSlot();
  }
}

async function runPipeline(params: GenerateParams): Promise<GenerateResult> {
  const { type, answers, existingSessionId } = params;
  const supabase = getSupabaseAdmin();
  const t0 = Date.now();

  // ------------------------------------------------------------
  // 1. Intentar pre-gen (solo para quick flow, no "Situaciones específicas")
  // ------------------------------------------------------------
  let audioBuffer: Buffer | null = null;
  let source: "pregen" | "llm" = "llm";
  let cleanScript = "";
  let llmUsage: CompleteChatResult | null = null;

  if (type === "quick" && answers.categoria) {
    const preGen = await pickPreGenMeditation(answers.categoria);
    if (preGen) {
      audioBuffer = preGen.buffer;
      source = "pregen";
      cleanScript = ""; // Pre-gen no tiene script asociado
    }
  }

  // ------------------------------------------------------------
  // 2. Si no hay pre-gen, generar con LLM + TTS + mix
  // ------------------------------------------------------------
  if (!audioBuffer) {
    const { system, user } = buildPrompt(type, answers);
    const messages: ChatMessage[] = [
      { role: "system", content: system },
      { role: "user", content: user },
    ];

    const maxTokens = type === "deep" ? 6500 : 3500;
    llmUsage = await completeChat(messages, { maxTokens });
    const rawScript = llmUsage.text;

    const firstName = answers.nombre?.trim() || "";
    cleanScript = prepareScriptForTts(rawScript, firstName);

    const voiceBuf = await synthesizeWithPauses(cleanScript);

    try {
      audioBuffer = await mixVoiceWithBackground(voiceBuf);
    } catch {
      audioBuffer = Buffer.from(voiceBuf);
    }

    // Fire-and-forget: guardar en filesystem para review
    const tempSessionId = crypto.randomUUID().slice(0, 8);
    void saveMeditationScriptReviewFile({ sessionId: tempSessionId, scriptText: cleanScript }).catch(
      (err) => console.error("[generate-pipeline] saveMeditationScriptReviewFile failed:", err),
    );
    void saveMeditationAudioFile({ sessionId: tempSessionId, audioBuffer }).catch((err) =>
      console.error("[generate-pipeline] saveMeditationAudioFile failed:", err),
    );
  }

  // ------------------------------------------------------------
  // 3. Upload a Supabase Storage
  // ------------------------------------------------------------
  const token = crypto.randomUUID().replace(/-/g, "").slice(0, 24);
  const path = `onboarding/${token}.mp3`;

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, new Uint8Array(audioBuffer), {
      contentType: "audio/mpeg",
      upsert: false,
    });
  if (upErr) {
    throw new Error(`No se pudo subir el audio: ${upErr.message}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(path);

  // ------------------------------------------------------------
  // 4. Persistir sesión en onboarding_sessions
  // ------------------------------------------------------------
  let sessionId = existingSessionId || null;
  if (sessionId) {
    await supabase
      .from("onboarding_sessions")
      .update({
        intake_json: answers,
        script_text: cleanScript || null,
        audio_url: publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId);
  } else {
    const { data: row, error: insErr } = await supabase
      .from("onboarding_sessions")
      .insert({
        type,
        intake_json: answers,
        script_text: cleanScript || null,
        audio_url: publicUrl,
        is_paid: false,
      })
      .select("id")
      .single();
    if (insErr || !row) {
      throw new Error(`No se pudo guardar la sesión: ${insErr?.message || "unknown"}`);
    }
    sessionId = row.id;
  }

  // ------------------------------------------------------------
  // 5. Crear play_link compartible (fire-and-forget)
  // ------------------------------------------------------------
  const playToken = crypto.randomUUID().replace(/-/g, "").slice(0, 24);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 90);

  void supabase
    .from("play_links")
    .insert({
      token: playToken,
      audio_url: publicUrl,
      expires_at: expiresAt.toISOString(),
      source: source === "pregen" ? "onboarding-pregen" : "onboarding",
      session_id: sessionId,
    })
    .then(() => {})
    .catch((err) => console.error("[generate-pipeline] play_links insert failed:", err));

  // ------------------------------------------------------------
  // 6. Persistir costos (fire-and-forget). LLM cost real llega con delay vía
  //    fetchGenerationCost; por ahora insertamos tokens + TTS estimado.
  // ------------------------------------------------------------
  // Contar solo chars HABLADOS (sin marcadores ||PAUSE:Xs||) para no inflar el costo TTS.
  const ttsChars = source === "pregen" ? 0 : spokenChars(cleanScript);
  const ttsCostUsd = source === "pregen" ? 0 : estimateTtsCostUsd(ttsChars);
  const generationId = llmUsage?.generationId;

  void supabase
    .from("meditation_costs")
    .insert({
      session_id: sessionId,
      llm_model: llmUsage?.model,
      llm_generation_id: generationId,
      llm_prompt_tokens: llmUsage?.promptTokens,
      llm_completion_tokens: llmUsage?.completionTokens,
      llm_total_tokens: llmUsage?.totalTokens,
      llm_cost_usd: source === "pregen" ? 0 : null,
      tts_chars: ttsChars,
      tts_cost_usd: ttsCostUsd,
      duration_ms: Date.now() - t0,
      source,
    })
    .then(() => {})
    .catch((err) => console.error("[generate-pipeline] meditation_costs insert failed:", err));

  // Backfill del costo real de OpenRouter cuando esté disponible (~1-5s delay).
  if (generationId) {
    void (async () => {
      // pequeño retraso para dar tiempo a que OpenRouter registre la transacción
      await new Promise((r) => setTimeout(r, 3000));
      const realCost = await fetchGenerationCost(generationId);
      if (realCost != null) {
        await supabase
          .from("meditation_costs")
          .update({ llm_cost_usd: realCost })
          .eq("llm_generation_id", generationId);
      }
    })().catch((err) =>
      console.error("[generate-pipeline] OpenRouter cost backfill failed:", err),
    );
  }

  const siteUrl =
    ((import.meta.env.PUBLIC_SITE_URL || process.env.PUBLIC_SITE_URL || "") as string).replace(/\/$/, "") ||
    "https://vozcalma.app";
  const playUrl = `${siteUrl}/p/${playToken}`;

  return {
    sessionId: sessionId!,
    audioUrl: publicUrl,
    scriptText: cleanScript,
    playUrl,
    source,
  };
}
