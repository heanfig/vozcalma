/**
 * Pre-genera 8 meditaciones de muestra (una por categoría de Alivio Rápido)
 * usando OpenRouter (LLM) + ElevenLabs (TTS) y las guarda en disco como
 * `assets/audio/meditations/<slug>/sample.mp3`.
 *
 * Una vez en disco, `pickPreGenMeditation()` (src/lib/pre-gen-meditations.ts)
 * las sirve automáticamente como fallback gratis para usuarios que eligen esa
 * categoría — y la landing las usa para el demo "Escucha una muestra".
 *
 * Uso: `node --env-file=.env scripts/pre-generate-samples.mjs [--only=<slug>]`
 *
 * Costo estimado: ~$1.5–2.5 USD (8 generaciones LLM + ~30K chars TTS).
 *
 * Requiere ffmpeg en PATH si algún script supera 4800 chars (concatenación de
 * chunks). Para muestras corta (~2500 chars) no debería hacer falta.
 */
import { writeFile, readdir, readFile, mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { existsSync, mkdirSync } from "node:fs";
import { spawn, execFile } from "node:child_process";
import { tmpdir } from "node:os";
import { randomUUID, randomInt } from "node:crypto";

const REPO_ROOT = process.cwd();
const OUT_DIR = join(REPO_ROOT, "assets", "audio", "meditations");
const BG_DIR = join(REPO_ROOT, "assets", "audio", "backgrounds");

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const ELEVENLABS_CHUNK_SIZE = 4800;
const END_MARKER = "---FIN_GUIÓN---";

// Mixing config
const BG_VOLUME = 0.15;
const FADE_IN = 3;
const FADE_OUT = 5;

// ============================================================================
// Categorías + hints (replicado de src/components/onboarding/onboarding-prompts.ts)
// ============================================================================

const CATEGORIES = [
  {
    slug: "calmar-la-mente",
    label: "Calmar la mente",
    hint: "Enfócate en bajar el ruido mental. Usa imágenes de aguas calmas, cielos despejados, silencio expansivo. Guía respiraciones lentas que relajen el sistema nervioso.",
  },
  {
    slug: "sueno-y-descanso",
    label: "Sueño y descanso",
    hint: "Enfócate en soltar el día, relajar cada parte del cuerpo progresivamente, y preparar el cuerpo y mente para un descanso profundo. Usa ritmo muy lento y susurrante.",
  },
  {
    slug: "gestion-emocional",
    label: "Gestión emocional",
    hint: "Enfócate en acompañar las emociones con presencia sin juicio. Valida lo que la persona siente como válido. Ayúdala a sentirse acompañada en cualquier emoción que traiga.",
  },
  {
    slug: "crecimiento-personal",
    label: "Crecimiento personal",
    hint: "Enfócate en conectar con la versión más plena de sí mismo/a. Visualización del yo ideal, afirmaciones de merecimiento, presente tense.",
  },
  {
    slug: "enfoque-y-productividad",
    label: "Enfoque y productividad",
    hint: "Enfócate en claridad mental, enfoque centrado, y presencia en la tarea. Ayuda a ordenar prioridades internas y soltar distracciones.",
  },
  {
    slug: "mindfulness-presencia",
    label: "Mindfulness / Presencia",
    hint: "Enfócate en volver al aquí y ahora. Observación del cuerpo, los sonidos, la respiración. Sin juicio, solo presencia.",
  },
  {
    slug: "relaciones-y-emociones-sociales",
    label: "Relaciones y emociones sociales",
    hint: "Enfócate en el corazón, en cuidar los vínculos, en soltar resentimientos, y en abrirse con amor. Compasión por uno mismo y los demás.",
  },
  {
    slug: "iniciar-la-manana",
    label: "Iniciar la mañana (energía, intención)",
    hint: "Enfócate en despertar con claridad, establecer una intención para el día, conectar con la energía del cuerpo. Tono suave pero vital.",
  },
];

// ============================================================================
// Args
// ============================================================================

const args = process.argv.slice(2);
const onlyArg = args.find((a) => a.startsWith("--only="));
const onlySlug = onlyArg ? onlyArg.replace("--only=", "").trim() : null;

const targets = onlySlug
  ? CATEGORIES.filter((c) => c.slug === onlySlug)
  : CATEGORIES;

if (onlySlug && targets.length === 0) {
  console.error(`Slug desconocido: ${onlySlug}. Disponibles: ${CATEGORIES.map((c) => c.slug).join(", ")}`);
  process.exit(1);
}

// ============================================================================
// Env
// ============================================================================

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "anthropic/claude-sonnet-4";
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_VOICE_ID = (process.env.ELEVENLABS_VOICE_ID || "").trim();

if (!OPENROUTER_API_KEY) {
  console.error("Falta OPENROUTER_API_KEY (corre con: node --env-file=.env scripts/pre-generate-samples.mjs)");
  process.exit(1);
}
if (!ELEVENLABS_API_KEY) {
  console.error("Falta ELEVENLABS_API_KEY");
  process.exit(1);
}

// ============================================================================
// Prompt builder (sample): genérico, sin nombre — el TTS no lo necesita.
// ============================================================================

function buildSampleSystemPrompt(label, hint) {
  return [
    "⚠️ ESTO ES UNA MUESTRA CORTA DE 40-60 SEGUNDOS ⚠️",
    "NO es una meditación completa. Es un teaser para que el visitante pruebe el formato.",
    "",
    "Eres un experto en relajación guiada y meditación terapéutica.",
    "Crea un FRAGMENTO breve de meditación guiada (40-60s con pausas) para la landing pública de VozCalma.",
    "",
    "TONO:",
    "- Calmado, íntimo, como un susurro cálido cerca del oído",
    "- MUY lento. Profundamente pausado. Envolvente.",
    "- Reconfortante.",
    "- En segunda persona ('tú', 'te'). NO uses ningún nombre propio.",
    "",
    `CATEGORÍA: ${label}`,
    `ENFOQUE: ${hint}`,
    "",
    "🎯 LONGITUD OBJETIVO 🎯",
    "El TEXTO HABLADO (sin contar tags <break>) debe tener entre 350 y 600 caracteres.",
    "Esto produce ~25-40 segundos de voz a speed 0.7. Sumado a las pausas (≈15-20s),",
    "el audio final dura 40-60 segundos. NI MÁS NI MENOS.",
    "",
    "🧘 RITMO DE MEDITACIÓN — USA EL MARCADOR ||PAUSE:Xs|| 🧘",
    "El sistema convierte cada ||PAUSE:Xs|| en SILENCIO REAL de X segundos en el audio final.",
    "ESTE ES EL CORAZÓN DEL FORMATO. Sin estos marcadores, suena leído. Con ellos, se siente.",
    "",
    "Reglas obligatorias:",
    "1. **DESPUÉS DE CADA INSTRUCCIÓN DE RESPIRACIÓN** → ||PAUSE:3s||",
    "   Ejemplo: 'Inhala profundo. ||PAUSE:3s|| Y exhala lento. ||PAUSE:3s||'",
    "",
    "2. **ENTRE FRASES PRINCIPALES** → ||PAUSE:2s||",
    "   Ejemplo: 'Cierra los ojos. ||PAUSE:2s|| Permítete llegar.'",
    "",
    "3. **EN MOMENTOS DE QUIETUD** → ||PAUSE:4s|| (máximo permitido)",
    "",
    "4. **AL FINAL** → ||PAUSE:2s|| antes del cierre.",
    "",
    "Estructura sugerida (~50s con pausas):",
    "- Frase de bienvenida → ||PAUSE:2s||",
    "- Instrucción de respiración 1 → ||PAUSE:3s||",
    "- Instrucción de respiración 2 → ||PAUSE:3s||",
    "- Frase central de la categoría → ||PAUSE:2s||",
    "- Frase de quietud → ||PAUSE:4s||",
    "- Frase de cierre suave → ||PAUSE:2s||",
    "",
    "EJEMPLO COMPLETO (Calmar la mente):",
    `"Respira hondo. ||PAUSE:3s|| Y suelta. ||PAUSE:3s|| Permítete llegar a este momento. ||PAUSE:2s|| Lleva tu atención al pecho. ||PAUSE:3s|| Y nota cómo sube. ||PAUSE:2s|| Y baja. ||PAUSE:3s|| No hay nada que hacer. ||PAUSE:2s|| Solo estar aquí. ||PAUSE:4s|| Cuando estés listo, regresa despacio. ||PAUSE:2s||"`,
    "",
    "REGLAS DE FORMATO:",
    "- Texto plano + marcadores ||PAUSE:Xs|| (X entre 1 y 4 segundos).",
    "- NO uses markdown, encabezados, bullets, ni tags HTML/SSML.",
    "- Frases muy cortas: 5-10 palabras máximo.",
    "- Una idea por frase. CADA frase termina con ||PAUSE:Xs||.",
    `- Termina con la marca: ${END_MARKER}`,
  ].join("\n");
}

function buildSampleUserPrompt(label) {
  return `Crea ahora el FRAGMENTO de muestra (~50 segundos) para la categoría "${label}". Recuerda: 350-600 chars de texto hablado, frases muy cortas (5-10 palabras), marcadores ||PAUSE:Xs|| entre CADA frase (X entre 1 y 4), segunda persona, sin nombres propios.`;
}

// ============================================================================
// Limpieza de script (replica simple de src/lib/meditation/script-post.ts)
// ============================================================================

function prepareScriptForTts(script) {
  let out = script.replace(/\r\n/g, "\n");
  const escaped = END_MARKER.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  out = out.replace(new RegExp(escaped, "gi"), "");
  out = out.replace(/\bfin\s+gui[óo]n\b/gi, "");
  out = out.replace(/\bfin\s+del\s+gui[óo]n\b/gi, "");
  out = out.replace(/\bfin\s+guion\b/gi, "");
  out = out.replace(/\bfinal\s+del\s+gui[óo]n\b/gi, "");
  out = out.replace(/\bmarca\s+de\s+fin\b/gi, "");
  out = out.replace(/\bquerido\s+usuario\b/gi, "");
  out = out.replace(/\bquerida\s+usuario\b/gi, "");
  out = out.replace(/\bUsuario\b/g, "");
  out = out.replace(/\busuario\b/g, "");
  // ⚠️ NO usar /\s{2,}/ porque destruiría los marcadores ||PAUSE:Xs||.
  // Solo colapsar espacios HORIZONTALES múltiples, preservando los marcadores intactos.
  out = out.replace(/[ \t]{2,}/g, " ").trim();
  return out;
}

/**
 * Parsea el script en segmentos voice/pause.
 * Retorna [{ type: "voice", text }, { type: "pause", duration }, ...]
 */
function parseScriptSegments(script) {
  const segments = [];
  // Match ||PAUSE:Xs|| donde X es número (entero o decimal). Tolerante con espacios.
  const re = /\|\|\s*PAUSE\s*:\s*(\d+(?:\.\d+)?)\s*s?\s*\|\|/gi;
  let lastIndex = 0;
  let m;
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

// ============================================================================
// LLM
// ============================================================================

async function generateScript(category) {
  const system = buildSampleSystemPrompt(category.label, category.hint);
  const user = buildSampleUserPrompt(category.label);

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://vozcalma.app",
      "X-Title": "VozCalma - pre-gen samples",
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.7,
      max_tokens: 3500,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${errText.slice(0, 500)}`);
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("Respuesta vacía del modelo");
  return prepareScriptForTts(text);
}

// ============================================================================
// TTS
// ============================================================================

function chunkScriptForTts(text, maxSize = ELEVENLABS_CHUNK_SIZE) {
  const cleaned = text.trim();
  if (cleaned.length <= maxSize) return [cleaned];

  const paragraphs = cleaned.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const chunks = [];
  let current = "";

  const flush = () => {
    if (current.trim()) chunks.push(current.trim());
    current = "";
  };

  for (const para of paragraphs) {
    const sep = current ? "\n\n" : "";
    if (current.length + sep.length + para.length <= maxSize) {
      current += sep + para;
    } else {
      flush();
      current = para;
    }
  }
  flush();
  return chunks;
}

async function synthesizeChunk(text) {
  if (!ELEVENLABS_VOICE_ID) {
    throw new Error("ELEVENLABS_VOICE_ID no configurado en .env");
  }
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`;
  const body = {
    text,
    model_id: "eleven_multilingual_v2",
    voice_settings: {
      stability: 0.52,
      similarity_boost: 0.72,
      style: 0.28,
      use_speaker_boost: true,
      speed: 0.7,
    },
  };
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": ELEVENLABS_API_KEY,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`ElevenLabs ${res.status}: ${errText.slice(0, 500)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function concatenateMp3WithFfmpeg(buffers) {
  if (buffers.length === 1) return buffers[0];
  const sessionDir = join(tmpdir(), `vc-pregen-${randomUUID()}`);
  mkdirSync(sessionDir, { recursive: true });
  const tempFiles = [];
  for (let i = 0; i < buffers.length; i++) {
    const f = join(sessionDir, `chunk-${i}.mp3`);
    await writeFile(f, buffers[i]);
    tempFiles.push(f);
  }
  const listPath = join(sessionDir, "list.txt");
  await writeFile(listPath, tempFiles.map((f) => `file '${f}'`).join("\n"));
  const outPath = join(sessionDir, "out.mp3");
  await new Promise((resolve, reject) => {
    const ff = spawn("ffmpeg", ["-y", "-f", "concat", "-safe", "0", "-i", listPath, "-c", "copy", outPath]);
    let stderr = "";
    ff.stderr.on("data", (d) => (stderr += d.toString()));
    ff.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exit ${code}: ${stderr.slice(0, 500)}`));
    });
  });
  const { readFile: rf } = await import("node:fs/promises");
  return rf(outPath);
}

/** Genera un buffer MP3 de silencio puro de N segundos. */
async function generateSilenceBuffer(durationSec) {
  const sessionDir = join(tmpdir(), `vc-pregen-silence-${randomUUID()}`);
  mkdirSync(sessionDir, { recursive: true });
  const outPath = join(sessionDir, "silence.mp3");
  try {
    await new Promise((resolve, reject) => {
      const ff = spawn("ffmpeg", [
        "-y",
        "-f", "lavfi",
        "-i", `anullsrc=channel_layout=mono:sample_rate=44100`,
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
    });
    const { readFile: rf } = await import("node:fs/promises");
    const buf = await rf(outPath);
    return buf;
  } finally {
    await rm(sessionDir, { recursive: true, force: true }).catch(() => {});
  }
}

async function synthesize(script) {
  const segments = parseScriptSegments(script);
  const voiceSegs = segments.filter((s) => s.type === "voice").length;
  const pauseSegs = segments.filter((s) => s.type === "pause").length;
  const totalPauseSec = segments
    .filter((s) => s.type === "pause")
    .reduce((sum, s) => sum + s.duration, 0);
  console.log(
    `     Segmentos: ${voiceSegs} de voz + ${pauseSegs} silencios (${totalPauseSec.toFixed(1)}s de pausas reales)`,
  );

  const buffers = [];
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (seg.type === "voice") {
      process.stdout.write(`     - [${i + 1}/${segments.length}] voz "${seg.text.slice(0, 40)}${seg.text.length > 40 ? "…" : ""}"`);
      const buf = await synthesizeChunk(seg.text);
      buffers.push(buf);
      process.stdout.write(` ${(buf.length / 1024).toFixed(0)}KB ✓\n`);
    } else {
      process.stdout.write(`     - [${i + 1}/${segments.length}] silencio ${seg.duration}s`);
      const buf = await generateSilenceBuffer(seg.duration);
      buffers.push(buf);
      process.stdout.write(` ✓\n`);
    }
  }

  return concatenateMp3WithFfmpeg(buffers);
}

// ============================================================================
// Mixing voz + música de fondo (replica src/lib/audio-mixer.ts)
// ============================================================================

function probeDurationSec(filePath) {
  return new Promise((resolve, reject) => {
    execFile(
      "ffprobe",
      ["-v", "quiet", "-print_format", "json", "-show_format", filePath],
      { timeout: 15_000 },
      (err, stdout) => {
        if (err) return reject(new Error(`ffprobe falló: ${err.message}`));
        try {
          const data = JSON.parse(stdout);
          const dur = parseFloat(data?.format?.duration || "0");
          if (!dur || !Number.isFinite(dur)) {
            return reject(new Error("ffprobe: duración inválida"));
          }
          resolve(dur);
        } catch {
          reject(new Error("ffprobe: JSON inválido"));
        }
      },
    );
  });
}

function runFfmpeg(args, timeout = 120_000) {
  return new Promise((resolve, reject) => {
    execFile("ffmpeg", args, { timeout }, (err, _stdout, stderr) => {
      if (err) {
        const detail = (stderr || err.message || "").slice(0, 500);
        return reject(new Error(`ffmpeg falló: ${detail}`));
      }
      resolve();
    });
  });
}

async function pickRandomBgTrack() {
  const files = await readdir(BG_DIR);
  const tracks = files.filter((f) => f.endsWith(".mp3")).map((f) => join(BG_DIR, f));
  if (tracks.length === 0) {
    throw new Error(`No hay tracks .mp3 en ${BG_DIR}`);
  }
  return tracks[randomInt(tracks.length)];
}

async function mixVoiceWithBackground(voiceBuffer) {
  const bgTrack = await pickRandomBgTrack();
  const tempDir = await mkdtemp(join(tmpdir(), "vc-pregen-mix-"));
  const voicePath = join(tempDir, "voice.mp3");
  const outputPath = join(tempDir, "output.mp3");

  try {
    await writeFile(voicePath, voiceBuffer);
    const voiceDuration = await probeDurationSec(voicePath);
    const fadeOutStart = Math.max(0, voiceDuration - FADE_OUT);

    const filterComplex = [
      `[1:a]atrim=0:${voiceDuration},asetpts=PTS-STARTPTS`,
      `volume=${BG_VOLUME}`,
      `afade=t=in:st=0:d=${FADE_IN}`,
      `afade=t=out:st=${fadeOutStart}:d=${FADE_OUT}[bg]`,
      `[0:a][bg]amix=inputs=2:duration=first:dropout_transition=0[out]`,
    ].join(",");

    const args = [
      "-y",
      "-i", voicePath,
      "-stream_loop", "-1",
      "-i", bgTrack,
      "-filter_complex", filterComplex,
      "-map", "[out]",
      "-codec:a", "libmp3lame",
      "-q:a", "4",
      outputPath,
    ];

    await runFfmpeg(args);
    const bgName = bgTrack.split("/").pop();
    return { buffer: await readFile(outputPath), bgTrack: bgName };
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

// ============================================================================
// Main
// ============================================================================

async function processCategory(category) {
  const dir = join(OUT_DIR, category.slug);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const audioPath = join(dir, "sample.mp3");
  const metaPath = join(dir, "sample.json");

  if (existsSync(audioPath) && !args.includes("--force")) {
    console.log(`⏭  ${category.slug}: ya existe sample.mp3 (usa --force para regenerar)`);
    return { skipped: true };
  }

  console.log(`\n→ ${category.label}`);
  console.log(`  1. Generando guion (LLM)…`);
  const t0 = Date.now();
  const script = await generateScript(category);
  console.log(`     script: ${script.length} chars (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  if (args.includes("--debug")) {
    console.log(`     ───── SCRIPT ─────`);
    console.log(script);
    console.log(`     ──────────────────`);
  }

  console.log(`  2. Sintetizando voz (ElevenLabs)…`);
  const t1 = Date.now();
  const voiceAudio = await synthesize(script);
  console.log(`     voz: ${(voiceAudio.length / 1024).toFixed(0)}KB (${((Date.now() - t1) / 1000).toFixed(1)}s)`);

  console.log(`  3. Mezclando con música de fondo (ffmpeg)…`);
  const t2 = Date.now();
  const { buffer: mixedAudio, bgTrack } = await mixVoiceWithBackground(voiceAudio);
  console.log(`     mix: ${(mixedAudio.length / 1024).toFixed(0)}KB con "${bgTrack}" (${((Date.now() - t2) / 1000).toFixed(1)}s)`);

  console.log(`  4. Escribiendo a disco…`);
  await writeFile(audioPath, mixedAudio);
  await writeFile(
    metaPath,
    JSON.stringify(
      {
        slug: category.slug,
        label: category.label,
        chars: script.length,
        bytes: mixedAudio.length,
        generated_at: new Date().toISOString(),
        voice_id: ELEVENLABS_VOICE_ID,
        model: OPENROUTER_MODEL,
        background_track: bgTrack,
      },
      null,
      2,
    ),
  );

  console.log(`  ✓ ${audioPath}`);
  return { audioPath, scriptChars: script.length, audioBytes: mixedAudio.length };
}

console.log(`\nVozCalma — Pre-generando ${targets.length} muestra(s) de meditación`);
console.log(`Modelo: ${OPENROUTER_MODEL}`);
console.log(`Voz: ${ELEVENLABS_VOICE_ID || "(sin configurar — fallará)"}`);
console.log(`Output: ${OUT_DIR}`);

let ok = 0;
let skipped = 0;
let failed = 0;
for (const cat of targets) {
  try {
    const result = await processCategory(cat);
    if (result.skipped) skipped++;
    else ok++;
  } catch (err) {
    failed++;
    console.error(`✗ ${cat.slug}: ${err.message}`);
  }
}

console.log(`\nResumen: ${ok} generadas, ${skipped} omitidas, ${failed} fallidas`);
process.exit(failed > 0 ? 1 : 0);
