import type { APIRoute } from "astro";
import { randomBytes } from "node:crypto";
import { completeChat, type ChatMessage } from "../../../../lib/openrouter";
import { getSupabaseAdmin } from "../../../../lib/supabase-server";
import { MEDITATION_SYSTEM_PROMPT } from "../../../../lib/system-prompt";
import { synthesizeSpeech } from "../../../../lib/elevenlabs";

type Body = {
  /** Guion ya listo (tras revisión humana) */
  scriptText?: string;
  /** Texto libre para generar guion con el mismo sistema que el chat */
  rawInput?: string;
};

const BUCKET = "meditation-audio";

export const POST: APIRoute = async ({ request }) => {
  const secret = import.meta.env.ADMIN_API_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return new Response(JSON.stringify({ error: "No autorizado" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return new Response(JSON.stringify({ error: "JSON inválido" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  let script = (body.scriptText || "").trim();
  if (!script && body.rawInput?.trim()) {
    const messages: ChatMessage[] = [
      { role: "system", content: MEDITATION_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Genera solo el guion final de meditación en español, terminando con ---FIN_GUIÓN---. Contexto: ${body.rawInput.trim()}`,
      },
    ];
    try {
      script = await completeChat(messages);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error LLM";
      return new Response(JSON.stringify({ error: msg }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  if (!script || script.length > 100000) {
    return new Response(JSON.stringify({ error: "Guion inválido" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const gui = script.includes("---FIN_GUIÓN---")
    ? script.split("---FIN_GUIÓN---")[0].trim()
    : script;

  let audio: ArrayBuffer;
  try {
    audio = await synthesizeSpeech(gui);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error TTS";
    return new Response(JSON.stringify({ error: msg }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  const token = randomBytes(18).toString("hex");
  const path = `public/${token}.mp3`;
  const supabase = getSupabaseAdmin();

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, Buffer.from(audio), {
      contentType: "audio/mpeg",
      upsert: false,
    });

  if (upErr) {
    return new Response(
      JSON.stringify({
        error:
          "No se pudo subir el audio. Crea el bucket público 'meditation-audio' en Supabase Storage.",
        detail: upErr.message,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(path);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  const { error: insErr } = await supabase.from("play_links").insert({
    token,
    audio_url: publicUrl,
    expires_at: expiresAt.toISOString(),
    source: "admin",
  });

  if (insErr) {
    return new Response(JSON.stringify({ error: insErr.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const base =
    import.meta.env.PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://vozcalma.app";
  const playUrl = `${base}/p/${token}`;

  return new Response(JSON.stringify({ playUrl, token, expiresAt: expiresAt.toISOString() }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
