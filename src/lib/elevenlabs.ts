/** Plan gratuito: las voces "premade" (biblioteca) no están permitidas por API; hay que usar Voice Design u otra voz propia. */
import { concatenateMp3Buffers } from "./audio-mixer";

let cachedNonPremadeVoiceId: string | null = null;

/** Tamaño máximo en chars por request a ElevenLabs (eleven_multilingual_v2). */
const ELEVENLABS_CHUNK_SIZE = 4800;

async function resolveVoiceId(apiKey: string): Promise<string> {
  const fromEnv = (import.meta.env.ELEVENLABS_VOICE_ID || process.env.ELEVENLABS_VOICE_ID || "").trim();
  if (fromEnv) return fromEnv;
  if (cachedNonPremadeVoiceId) return cachedNonPremadeVoiceId;

  const res = await fetch("https://api.elevenlabs.io/v1/voices", {
    headers: { "xi-api-key": apiKey },
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(
      `ElevenLabs list voices ${res.status}: ${errText.slice(0, 400)}`,
    );
  }
  const data = (await res.json()) as {
    voices?: Array<{ voice_id: string; category?: string }>;
  };
  const voices = data.voices ?? [];
  const nonPremade = voices.filter(
    (v) => (v.category ?? "").toLowerCase() !== "premade",
  );
  const picked = nonPremade[0];
  if (!picked) {
    throw new Error(
      "ElevenLabs (plan gratuito): las voces de biblioteca no se pueden usar por API. Creá una voz en Voice Design (elevenlabs.io) y definí ELEVENLABS_VOICE_ID con su ID, o actualizá el plan.",
    );
  }
  cachedNonPremadeVoiceId = picked.voice_id;
  return cachedNonPremadeVoiceId;
}

/** Genera audio MP3 a partir de texto (servidor). */
export async function synthesizeSpeech(text: string): Promise<ArrayBuffer> {
  const apiKey = import.meta.env.ELEVENLABS_API_KEY || process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY no configurada");
  }

  const voiceId = await resolveVoiceId(apiKey);

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability: 0.52,
        similarity_boost: 0.72,
        style: 0.28,
        use_speaker_boost: true,
        speed: 0.72,
      },
    }),
  });

  let res2 = res;
  if (!res2.ok && res2.status === 400) {
    res2 = await fetch(url, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.52,
          similarity_boost: 0.72,
          style: 0.28,
          use_speaker_boost: true,
        },
      }),
    });
  }

  if (!res2.ok) {
    const errText = await res2.text();
    let extra = "";
    try {
      const j = JSON.parse(errText) as {
        detail?: { message?: string; code?: string };
      };
      if (j.detail?.code === "paid_plan_required") {
        extra =
          " En plan gratuito no podés usar voces de biblioteca por API: creá una voz en Voice Design y poné ELEVENLABS_VOICE_ID, o subí de plan.";
      }
    } catch {
      /* ignore */
    }
    throw new Error(`ElevenLabs ${res2.status}: ${errText.slice(0, 500)}${extra}`);
  }

  return res2.arrayBuffer();
}

/**
 * Divide un script en chunks que respetan los boundaries de pausas de respiración.
 *
 * Algoritmo:
 * 1. Split por bloques de pausa (líneas con solo "..." o "…")
 * 2. Agrupa bloques consecutivos hasta aproximarse al maxSize
 * 3. Si un bloque individual excede maxSize, se split por oraciones (.!?)
 * 4. Nunca corta mid-sentence
 *
 * @param text - Script completo a dividir
 * @param maxSize - Tamaño máximo por chunk (default ELEVENLABS_CHUNK_SIZE)
 * @returns Array de chunks respetando las pausas
 */
export function chunkScriptForTts(text: string, maxSize = ELEVENLABS_CHUNK_SIZE): string[] {
  const cleaned = text.trim();
  if (cleaned.length <= maxSize) return [cleaned];

  // Split por párrafos (dobles newlines), que es donde están las pausas naturales
  const paragraphs = cleaned.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  const chunks: string[] = [];
  let current = "";

  const flush = () => {
    if (current.trim()) chunks.push(current.trim());
    current = "";
  };

  for (const para of paragraphs) {
    const separator = current ? "\n\n" : "";
    const wouldBe = current.length + separator.length + para.length;

    if (wouldBe <= maxSize) {
      current += separator + para;
      continue;
    }

    // El párrafo actual no cabe — flush lo acumulado
    flush();

    // Si el párrafo solo es más grande que maxSize, hay que partirlo por oraciones
    if (para.length > maxSize) {
      const sentences = splitIntoSentences(para);
      for (const sent of sentences) {
        if (sent.length > maxSize) {
          // Oración rarísima, partir a la fuerza (último recurso)
          for (let i = 0; i < sent.length; i += maxSize) {
            chunks.push(sent.slice(i, i + maxSize));
          }
        } else if (current.length + (current ? " " : "").length + sent.length <= maxSize) {
          current += (current ? " " : "") + sent;
        } else {
          flush();
          current = sent;
        }
      }
    } else {
      // El párrafo cabe solo, empezar nuevo chunk con él
      current = para;
    }
  }

  flush();
  return chunks;
}

/** Split simple por oraciones: busca .!? seguidos de espacio/newline. */
function splitIntoSentences(text: string): string[] {
  const parts = text.split(/(?<=[.!?…])\s+/);
  return parts.map((s) => s.trim()).filter(Boolean);
}

/**
 * Sintetiza un script largo dividiéndolo en chunks si es necesario.
 *
 * Si el texto es ≤ ELEVENLABS_CHUNK_SIZE, llama directamente a `synthesizeSpeech`.
 * Si es más largo, split por boundaries de pausa, sintetiza cada chunk,
 * y concatena los MP3 resultantes con ffmpeg.
 *
 * @param text - Script completo
 * @returns Buffer del MP3 concatenado
 */
export async function synthesizeLongSpeech(text: string): Promise<ArrayBuffer> {
  if (text.length <= ELEVENLABS_CHUNK_SIZE) {
    return synthesizeSpeech(text);
  }

  const chunks = chunkScriptForTts(text);
  if (chunks.length === 1) {
    return synthesizeSpeech(chunks[0]);
  }

  // Sintetizar cada chunk en serie (paralelo podría hit rate limits)
  const buffers: ArrayBuffer[] = [];
  for (const chunk of chunks) {
    const buf = await synthesizeSpeech(chunk);
    buffers.push(buf);
  }

  // Concatenar con ffmpeg
  const concatenated = await concatenateMp3Buffers(buffers);
  // Convertir Buffer a ArrayBuffer para mantener la firma
  return concatenated.buffer.slice(
    concatenated.byteOffset,
    concatenated.byteOffset + concatenated.byteLength,
  ) as ArrayBuffer;
}
