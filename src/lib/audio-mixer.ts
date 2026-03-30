/**
 * Motor de mezcla de audio: voz + música de fondo para meditaciones.
 *
 * Usa ffmpeg para combinar el audio de voz (ElevenLabs) con un track de fondo
 * en loop, aplicando fade in/out y control de volumen.
 *
 * Cada invocación usa un directorio temporal aislado para soportar concurrencia.
 * Si la mezcla falla, el caller puede usar el audio de voz original como fallback.
 */
import { execFile } from "node:child_process";
import { readdir, writeFile, readFile, mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomInt } from "node:crypto";

export interface MixOptions {
  /** Ruta a un track de fondo específico. Si se omite, se elige uno al azar. */
  backgroundTrack?: string;
  /** Volumen de la música de fondo (0.0 - 1.0). Default: env AUDIO_BG_VOLUME o 0.15 */
  backgroundVolume?: number;
  /** Duración del fade-in en segundos. Default: env AUDIO_FADE_IN o 3 */
  fadeInDuration?: number;
  /** Duración del fade-out en segundos. Default: env AUDIO_FADE_OUT o 5 */
  fadeOutDuration?: number;
  /** Timeout en ms para ffmpeg. Default: 120_000 (2 min) */
  timeout?: number;
}

function envFloat(key: string, fallback: number): number {
  const val = typeof import.meta.env !== "undefined"
    ? (import.meta.env as Record<string, string | undefined>)[key]
    : process.env[key];
  if (!val) return fallback;
  const n = parseFloat(val);
  return Number.isFinite(n) ? n : fallback;
}

function envString(key: string, fallback: string): string {
  const val = typeof import.meta.env !== "undefined"
    ? (import.meta.env as Record<string, string | undefined>)[key]
    : process.env[key];
  return val?.trim() || fallback;
}

function getBackgroundDir(): string {
  return envString("AUDIO_BG_DIR", join(process.cwd(), "assets", "audio", "backgrounds"));
}

function getFfmpegPath(): string {
  return envString("FFMPEG_PATH", "ffmpeg");
}

function getFfprobePath(): string {
  const ffmpeg = getFfmpegPath();
  // Si el path es explícito, ffprobe está al lado de ffmpeg
  if (ffmpeg.includes("/")) {
    return ffmpeg.replace(/ffmpeg$/, "ffprobe");
  }
  return "ffprobe";
}

/** Lista los tracks de fondo disponibles. */
export async function getBackgroundTracks(): Promise<string[]> {
  const dir = getBackgroundDir();
  const files = await readdir(dir);
  return files
    .filter((f) => f.endsWith(".mp3"))
    .map((f) => join(dir, f));
}

/** Selecciona un track al azar. */
async function pickRandomTrack(): Promise<string> {
  const tracks = await getBackgroundTracks();
  if (tracks.length === 0) {
    throw new Error(
      `No se encontraron tracks MP3 en ${getBackgroundDir()}. Agrega archivos .mp3 de fondo.`,
    );
  }
  return tracks[randomInt(tracks.length)];
}

/** Obtiene la duración de un archivo de audio en segundos via ffprobe. */
function probeDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    execFile(
      getFfprobePath(),
      [
        "-v", "quiet",
        "-print_format", "json",
        "-show_format",
        filePath,
      ],
      { timeout: 15_000 },
      (err, stdout) => {
        if (err) return reject(new Error(`ffprobe falló: ${err.message}`));
        try {
          const data = JSON.parse(stdout) as { format?: { duration?: string } };
          const dur = parseFloat(data.format?.duration || "0");
          if (!dur || !Number.isFinite(dur)) {
            return reject(new Error("ffprobe: no se pudo determinar la duración del audio"));
          }
          resolve(dur);
        } catch {
          reject(new Error("ffprobe: respuesta JSON inválida"));
        }
      },
    );
  });
}

/** Ejecuta ffmpeg con los argumentos dados. */
function runFfmpeg(args: string[], timeout: number): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(getFfmpegPath(), args, { timeout }, (err, _stdout, stderr) => {
      if (err) {
        const detail = (stderr || err.message || "").slice(0, 500);
        return reject(new Error(`ffmpeg falló: ${detail}`));
      }
      resolve();
    });
  });
}

/**
 * Mezcla audio de voz con música de fondo.
 *
 * @param voice - Buffer del audio de voz (MP3 de ElevenLabs)
 * @param options - Opciones de configuración
 * @returns Buffer del MP3 final con voz + música de fondo
 */
export async function mixVoiceWithBackground(
  voice: ArrayBuffer,
  options?: MixOptions,
): Promise<Buffer> {
  const bgVolume = options?.backgroundVolume ?? envFloat("AUDIO_BG_VOLUME", 0.15);
  const fadeIn = options?.fadeInDuration ?? envFloat("AUDIO_FADE_IN", 3);
  const fadeOut = options?.fadeOutDuration ?? envFloat("AUDIO_FADE_OUT", 5);
  const timeout = options?.timeout ?? 120_000;

  // Track de fondo
  const bgTrack = options?.backgroundTrack ?? await pickRandomTrack();

  // Directorio temporal aislado
  const tempDir = await mkdtemp(join(tmpdir(), "vozcalma-mix-"));
  const voicePath = join(tempDir, "voice.mp3");
  const outputPath = join(tempDir, "output.mp3");

  try {
    // Escribir voz a disco
    await writeFile(voicePath, Buffer.from(voice));

    // Obtener duración de la voz
    const voiceDuration = await probeDuration(voicePath);

    // Calcular inicio del fade-out (asegurar que no sea negativo)
    const fadeOutStart = Math.max(0, voiceDuration - fadeOut);

    // Filtro ffmpeg:
    // 1. Loopea la música, la recorta a la duración de la voz
    // 2. Aplica volumen bajo + fade in/out
    // 3. Mezcla con la voz (voz al 100%, música de fondo)
    const filterComplex = [
      `[1:a]atrim=0:${voiceDuration},asetpts=PTS-STARTPTS`,
      `volume=${bgVolume}`,
      `afade=t=in:st=0:d=${fadeIn}`,
      `afade=t=out:st=${fadeOutStart}:d=${fadeOut}[bg]`,
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

    await runFfmpeg(args, timeout);

    // Leer resultado
    return await readFile(outputPath);
  } finally {
    // Limpiar archivos temporales siempre
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}
