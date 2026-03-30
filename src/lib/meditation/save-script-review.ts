import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

function getExportDir(): string {
  return (
    (import.meta.env.MEDITATION_SCRIPT_EXPORT_DIR as string | undefined)?.trim() ||
    join(process.cwd(), "var", "meditation-exports")
  );
}

function stamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

/** Guarda el script de meditación como .txt para revisión. */
export async function saveMeditationScriptReviewFile(params: {
  sessionId: string;
  scriptText: string;
}): Promise<string | null> {
  const text = params.scriptText.trim();
  if (!text) return null;

  const base = join(getExportDir(), "scripts");
  const fileName = `meditacion-${params.sessionId}-${stamp()}.txt`;
  const filePath = join(base, fileName);

  const header = `Sesión: ${params.sessionId}\nGenerado (UTC): ${new Date().toISOString()}\n\n---\n\n`;
  await mkdir(base, { recursive: true });
  await writeFile(filePath, `${header}${text}`, "utf8");
  return filePath;
}

/** Guarda el audio final (MP3 con música de fondo) en disco. */
export async function saveMeditationAudioFile(params: {
  sessionId: string;
  audioBuffer: Buffer | ArrayBuffer;
}): Promise<string | null> {
  const buf = params.audioBuffer instanceof Buffer
    ? params.audioBuffer
    : Buffer.from(params.audioBuffer);
  if (!buf.length) return null;

  const base = join(getExportDir(), "audio");
  const fileName = `meditacion-${params.sessionId}-${stamp()}.mp3`;
  const filePath = join(base, fileName);

  await mkdir(base, { recursive: true });
  await writeFile(filePath, buf);
  return filePath;
}
