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
        speed: 0.7,
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

// ============================================================================
// SÍNTESIS CON PAUSAS REALES
// ============================================================================
//
// `eleven_multilingual_v2` IGNORA tags SSML <break>. Para conseguir el ritmo
// meditativo (silencios reales entre frases) usamos un marcador propio
// `||PAUSE:Xs||` que el LLM emite. Aquí lo parseamos y construimos el audio
// final como: voz_1 + silencio_X + voz_2 + silencio_Y + … (concatenados con ffmpeg).
//
// Costo: el TTS cobra por chars, no por requests, así que el costo no sube.
// Latencia: cada frase suma una request (~2s). Aceptable porque la calidad
// meditativa lo justifica (decisión del CEO).

export interface ScriptSegment {
  type: "voice" | "pause";
  text?: string;
  duration?: number;
}

/**
 * Parsea un script con marcadores ||PAUSE:Xs|| en una secuencia de segmentos.
 * Tolerante con espacios y tipografía variable del LLM.
 */
export function parseScriptSegments(script: string): ScriptSegment[] {
  const segments: ScriptSegment[] = [];
  const re = /\|\|\s*PAUSE\s*:\s*(\d+(?:\.\d+)?)\s*s?\s*\|\|/gi;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(script)) !== null) {
    const before = script.slice(lastIndex, m.index).trim();
    if (before) segments.push({ type: "voice", text: before });
    const duration = Math.min(4, Math.max(0.3, parseFloat(m[1])));
    segments.push({ type: "pause", duration });
    lastIndex = re.lastIndex;
  }
  const tail = script.slice(lastIndex).trim();
  if (tail) segments.push({ type: "voice", text: tail });
  return segments;
}

/**
 * Genera un buffer MP3 de silencio puro de N segundos via ffmpeg.
 * Mismo sample rate que ElevenLabs (44.1kHz mono) para concatenación limpia.
 */
async function generateSilenceBuffer(durationSec: number): Promise<Buffer> {
  const { mkdtemp, writeFile, readFile, rm } = await import("node:fs/promises");
  const { spawn } = await import("node:child_process");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");

  const tempDir = await mkdtemp(join(tmpdir(), "vc-silence-"));
  const outPath = join(tempDir, "silence.mp3");
  try {
    await new Promise<void>((resolve, reject) => {
      const ff = spawn("ffmpeg", [
        "-y",
        "-f", "lavfi",
        "-i", "anullsrc=channel_layout=mono:sample_rate=44100",
        "-t", String(durationSec),
        "-codec:a", "libmp3lame",
        "-q:a", "4",
        outPath,
      ]);
      let stderr = "";
      ff.stderr.on("data", (d) => (stderr += d.toString()));
      ff.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`ffmpeg silence exit ${code}: ${stderr.slice(0, 300)}`));
      });
      ff.on("error", reject);
    });
    return await readFile(outPath);
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * Sintetiza un script con marcadores ||PAUSE:Xs|| respetando las pausas
 * como SILENCIOS REALES insertados con ffmpeg.
 *
 * Si el script no tiene marcadores, hace fallback a `synthesizeLongSpeech`.
 *
 * Síntesis serial (sin paralelo) para no chocar con rate limits y por
 * simplicidad. Una meditación Quick (~30 frases) tarda ~60-90s; una Deep
 * (~60 frases) tarda ~2-3 min. La calidad meditativa lo justifica.
 */
export async function synthesizeWithPauses(script: string): Promise<ArrayBuffer> {
  const segments = parseScriptSegments(script);
  const hasPauses = segments.some((s) => s.type === "pause");

  if (!hasPauses) {
    return synthesizeLongSpeech(script);
  }

  const buffers: ArrayBuffer[] = [];
  for (const seg of segments) {
    if (seg.type === "voice" && seg.text) {
      // Si una "frase" supera el chunk size (raro), partirla
      if (seg.text.length > ELEVENLABS_CHUNK_SIZE) {
        const subChunks = chunkScriptForTts(seg.text);
        for (const c of subChunks) {
          const b = await synthesizeSpeech(c);
          buffers.push(b);
        }
      } else {
        const b = await synthesizeSpeech(seg.text);
        buffers.push(b);
      }
    } else if (seg.type === "pause" && seg.duration) {
      const silence = await generateSilenceBuffer(seg.duration);
      buffers.push(
        silence.buffer.slice(
          silence.byteOffset,
          silence.byteOffset + silence.byteLength,
        ) as ArrayBuffer,
      );
    }
  }

  if (buffers.length === 0) {
    throw new Error("synthesizeWithPauses: el script no produjo segmentos válidos");
  }
  if (buffers.length === 1) {
    return buffers[0];
  }

  const concatenated = await concatenateMp3Buffers(buffers);
  return concatenated.buffer.slice(
    concatenated.byteOffset,
    concatenated.byteOffset + concatenated.byteLength,
  ) as ArrayBuffer;
}

/**
 * Devuelve la longitud en chars del texto HABLADO (sin contar marcadores
 * ||PAUSE:Xs||). Útil para cobrar costo TTS real, no inflado.
 */
export function spokenChars(script: string): number {
  return script.replace(/\|\|\s*PAUSE\s*:\s*\d+(?:\.\d+)?\s*s?\s*\|\|/gi, "").trim().length;
}
