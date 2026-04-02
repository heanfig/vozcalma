import type { APIRoute } from "astro";
import { getSupabaseAdmin } from "../../../lib/supabase-server";
import { completeChat, type ChatMessage } from "../../../lib/openrouter";
import { prepareScriptForTts } from "../../../lib/meditation/script-post";
import { synthesizeSpeech } from "../../../lib/elevenlabs";
import { buildPrompt, type OnboardingType } from "../../../components/onboarding/onboarding-data";
import { json } from "../../../lib/api-utils";
import { mixVoiceWithBackground } from "../../../lib/audio-mixer";
import { saveMeditationScriptReviewFile, saveMeditationAudioFile } from "../../../lib/meditation/save-script-review";

const BUCKET = "meditation-audio";

export const POST: APIRoute = async ({ request }) => {
  let body: {
    type?: string;
    answers?: Record<string, string>;
    sessionId?: string | null;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }

  const type = body.type as OnboardingType | undefined;
  if (!type || (type !== "quick" && type !== "deep")) {
    return json({ error: "Tipo inválido" }, 400);
  }

  const answers = body.answers ?? {};
  if (!answers.nombre?.trim()) {
    return json({ error: "Falta el nombre" }, 400);
  }

  const supabase = getSupabaseAdmin();

  // If a sessionId was provided, check if it exists and is already paid
  let existingPaid = false;
  if (body.sessionId) {
    const { data: existing } = await supabase
      .from("onboarding_sessions")
      .select("id, is_paid, audio_url, script_text")
      .eq("id", body.sessionId)
      .maybeSingle();
    if (existing) {
      existingPaid = !!existing.is_paid;
      if (existing.audio_url) {
        return json({
          sessionId: existing.id,
          audioUrl: existing.audio_url,
          isPaid: existingPaid,
          scriptText: existing.script_text ?? "",
        });
      }
    }
  }

  // --- Generate script via LLM ---
  const { system, user } = buildPrompt(type, answers);
  const messages: ChatMessage[] = [
    { role: "system", content: system },
    { role: "user", content: user },
  ];

  let rawScript: string;
  try {
    const maxTokens = type === "deep" ? 6000 : 3200;
    rawScript = await completeChat(messages, { maxTokens });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error LLM";
    return json({ error: msg }, 502);
  }

  const firstName = answers.nombre?.trim() || "";
  const cleanScript = prepareScriptForTts(rawScript, firstName);

  // --- TTS ---
  let voiceBuf: ArrayBuffer;
  try {
    voiceBuf = await synthesizeSpeech(cleanScript);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error TTS";
    return json({ error: msg }, 502);
  }

  // --- Mezclar voz + música de fondo ---
  let finalAudio: Buffer;
  try {
    finalAudio = await mixVoiceWithBackground(voiceBuf);
  } catch {
    // Fallback: si la mezcla falla, usar solo la voz
    finalAudio = Buffer.from(voiceBuf);
  }

  // --- Guardar script + audio en filesystem ---
  const tempSessionId = crypto.randomUUID().slice(0, 8);
  void saveMeditationScriptReviewFile({ sessionId: tempSessionId, scriptText: cleanScript }).catch(() => {});
  void saveMeditationAudioFile({ sessionId: tempSessionId, audioBuffer: finalAudio }).catch(() => {});

  // --- Upload to Supabase Storage ---
  const token = crypto.randomUUID().replace(/-/g, "").slice(0, 24);
  const path = `onboarding/${token}.mp3`;

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, new Uint8Array(finalAudio), {
      contentType: "audio/mpeg",
      upsert: false,
    });

  if (upErr) {
    return json(
      {
        error: "No se pudo subir el audio. Verifica que el bucket 'meditation-audio' existe.",
        detail: upErr.message,
      },
      500,
    );
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(path);

  // --- Persist session ---
  let sessionId = body.sessionId || null;
  if (sessionId) {
    await supabase
      .from("onboarding_sessions")
      .update({
        intake_json: answers,
        script_text: cleanScript,
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
        script_text: cleanScript,
        audio_url: publicUrl,
        is_paid: false,
      })
      .select("id, is_paid")
      .single();
    if (insErr || !row) {
      return json(
        { error: "No se pudo guardar la sesión", detail: insErr?.message },
        500,
      );
    }
    sessionId = row.id;
    existingPaid = !!row.is_paid;
  }

  // --- Create shareable play link (fire-and-forget) ---
  const playToken = crypto.randomUUID().replace(/-/g, "").slice(0, 24);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  void supabase.from("play_links").insert({
    token: playToken,
    audio_url: publicUrl,
    expires_at: expiresAt.toISOString(),
    source: "onboarding",
  }).then(() => {}).catch(() => {});

  const base =
    ((import.meta.env.PUBLIC_SITE_URL || process.env.PUBLIC_SITE_URL || "") as string)?.replace(/\/$/, "") ||
    "https://vozcalma.app";
  const playUrl = `${base}/p/${playToken}`;

  return json({
    sessionId,
    audioUrl: publicUrl,
    isPaid: existingPaid,
    scriptText: cleanScript,
    playUrl,
  });
};

