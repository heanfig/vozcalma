/**
 * Lector de meditaciones pre-generadas desde filesystem.
 *
 * Estructura esperada:
 *   assets/audio/meditations/<slug>/*.mp3
 *
 * Si hay archivos en la carpeta: pick aleatorio.
 * Si no: retorna null → el caller hace fallback a LLM.
 *
 * Reutiliza el patrón de src/lib/audio-mixer.ts para lectura desde disco
 * (process.cwd() con fallback a env PREGEN_MEDITATIONS_DIR).
 */
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { randomInt } from "node:crypto";

/** Mapeo de label (UI) → slug (filesystem). */
export const CATEGORY_SLUGS: Record<string, string> = {
  "Calmar la mente": "calmar-la-mente",
  "Sueño y descanso": "sueno-y-descanso",
  "Gestión emocional": "gestion-emocional",
  "Crecimiento personal": "crecimiento-personal",
  "Enfoque y productividad": "enfoque-y-productividad",
  "Mindfulness / Presencia": "mindfulness-presencia",
  "Relaciones y emociones sociales": "relaciones-y-emociones-sociales",
  "Iniciar la mañana (energía, intención)": "iniciar-la-manana",
  // "Situaciones específicas" NO está aquí — siempre va a LLM
};

export function slugForCategory(category: string): string | null {
  return CATEGORY_SLUGS[category] ?? null;
}

function envString(key: string, fallback: string): string {
  const val =
    typeof import.meta.env !== "undefined"
      ? (import.meta.env as Record<string, string | undefined>)[key]
      : process.env[key];
  return val?.trim() || fallback;
}

function getMeditationsDir(): string {
  return envString(
    "PREGEN_MEDITATIONS_DIR",
    join(process.cwd(), "assets", "audio", "meditations"),
  );
}

export interface PreGenMeditationResult {
  buffer: Buffer;
  filename: string;
}

/**
 * Intenta encontrar una meditación pre-generada para la categoría dada.
 *
 * @returns El buffer del MP3 + nombre del archivo, o null si no hay match.
 */
export async function pickPreGenMeditation(
  category: string,
): Promise<PreGenMeditationResult | null> {
  if (category === "Situaciones específicas") return null;

  const slug = slugForCategory(category);
  if (!slug) return null;

  const dir = join(getMeditationsDir(), slug);

  let files: string[];
  try {
    files = (await readdir(dir)).filter((f) => f.toLowerCase().endsWith(".mp3"));
  } catch {
    // Directorio no existe → no hay pre-gen disponible
    return null;
  }

  if (files.length === 0) return null;

  const pick = files[randomInt(files.length)];
  const buffer = await readFile(join(dir, pick));
  return { buffer, filename: pick };
}
