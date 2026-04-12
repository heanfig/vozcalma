import type { APIRoute } from "astro";
import { randomBytes } from "node:crypto";
import { completeChat, type ChatMessage } from "../../../../lib/openrouter";
import { getSupabaseAdmin } from "../../../../lib/supabase-server";
import { MEDITATION_SYSTEM_PROMPT } from "../../../../lib/system-prompt";
import { synthesizeLongSpeech } from "../../../../lib/elevenlabs";
import { json } from "../../../../lib/api-utils";
import { SCRIPT_END_MARKER } from "../../../../lib/constants";
import { mixVoiceWithBackground } from "../../../../lib/audio-mixer";

type Body = {
  /** Guion ya listo (tras revisión humana) */
  scriptText?: string;
  /** Texto libre para generar guion con el mismo sistema que el chat */
  rawInput?: string;
};

const BUCKET = "meditation-audio";

export const POST: APIRoute = async ({ request }) => {
  const secret = (import.meta.env.ADMIN_API_SECRET || process.env.ADMIN_API_SECRET);
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return json({ error: "No autorizado" }, 401);
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }

  let script = (body.scriptText || "").trim();
  if (!script && body.rawInput?.trim()) {
    const messages: ChatMessage[] = [
      { role: "system", content: MEDITATION_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Genera solo el guion final de meditación en español, terminando con ${SCRIPT_END_MARKER}. Contexto: ${body.rawInput.trim()}`,
      },
    ];
    try {
      script = await completeChat(messages);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error LLM";
      return json({ error: msg }, 502);
    }
  }

  if (!script || script.length > 100000) {
    return json({ error: "Guion inválido" }, 400);
  }

  const gui = script.includes(SCRIPT_END_MARKER)
    ? script.split(SCRIPT_END_MARKER)[0].trim()
    : script;

  let voiceBuf: ArrayBuffer;
  try {
    voiceBuf = await synthesizeLongSpeech(gui);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error TTS";
    return json({ error: msg }, 502);
  }

  let finalAudio: Buffer;
  try {
    finalAudio = await mixVoiceWithBackground(voiceBuf);
  } catch {
    finalAudio = Buffer.from(voiceBuf);
  }

  const token = randomBytes(18).toString("hex");
  const path = `public/${token}.mp3`;
  const supabase = getSupabaseAdmin();

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, finalAudio, {
      contentType: "audio/mpeg",
      upsert: false,
    });

  if (upErr) {
    return json(
      {
        error: "No se pudo subir el audio. Crea el bucket público 'meditation-audio' en Supabase Storage.",
        detail: upErr.message,
      },
      500,
    );
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(path);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 90);

  const { error: insErr } = await supabase.from("play_links").insert({
    token,
    audio_url: publicUrl,
    expires_at: expiresAt.toISOString(),
    source: "admin",
  });

  if (insErr) return json({ error: insErr.message }, 500);

  const base =
    ((import.meta.env.PUBLIC_SITE_URL || process.env.PUBLIC_SITE_URL || "") as string)?.replace(/\/$/, "") ||
    "https://vozcalma.app";
  const playUrl = `${base}/p/${token}`;

  return json({ playUrl, token, expiresAt: expiresAt.toISOString() });
};
