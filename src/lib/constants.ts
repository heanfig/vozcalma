export const SCRIPT_PREFIX = "SCRIPT::";
export const SCRIPT_END_MARKER = "---FIN_GUIÓN---";

/** Extrae el texto limpio del guion desde el contenido raw de un mensaje system. */
export function extractScript(raw: string): string {
  return raw
    .replace(SCRIPT_PREFIX, "")
    .split(SCRIPT_END_MARKER)[0]
    .trim();
}
