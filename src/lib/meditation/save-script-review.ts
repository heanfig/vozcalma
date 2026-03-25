import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

export async function saveMeditationScriptReviewFile(params: {
  sessionId: string;
  scriptText: string;
}): Promise<void> {
  const text = params.scriptText.trim();
  if (!text) return;

  const base =
    (import.meta.env.MEDITATION_SCRIPT_EXPORT_DIR as string | undefined)?.trim() ||
    join(process.cwd(), "var", "meditation-script-review");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `meditacion-${params.sessionId}-${stamp}.txt`;
  const filePath = join(base, fileName);

  const header = `Sesión: ${params.sessionId}\nGenerado (UTC): ${new Date().toISOString()}\n\n---\n\n`;
  await mkdir(base, { recursive: true });
  await writeFile(filePath, `${header}${text}`, "utf8");
}
