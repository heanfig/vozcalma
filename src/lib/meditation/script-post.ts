/**
 * Normalización del guion para TTS: capa de “última milla” antes de ElevenLabs.
 *
 * Arquitectura: el modelo genera texto libre; aquí se (1) quitan marcadores internos,
 * (2) se evita que se lean frases tipo “fin guion”, (3) se corrige el nombre, (4) se
 * relajan saltos para que el motor inserte micro-pausas. Si en el futuro movés la
 * personalización al prompt o a otro servicio, mantené esta función como único lugar
 * de reglas de voz para no duplicar lógica en chat + audio.
 */
const END_MARKER = "---FIN_GUIÓN---";

/** Quita marcadores y frases que no deben pronunciarse; ajusta nombre; pausas suaves. */
export function prepareScriptForTts(script: string, firstName: string | undefined): string {
  let out = script.replace(/\r\n/g, "\n");

  out = out.replace(new RegExp(END_MARKER.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "");
  out = out.replace(/\bfin\s+gui[óo]n\b/gi, "");
  out = out.replace(/\bfin\s+guion\b/gi, "");
  out = out.replace(/\bfinal\s+del\s+gui[óo]n\b/gi, "");
  out = out.replace(/\bfin\s+del\s+gui[óo]n\b/gi, "");
  out = out.replace(/\bfin\s+del\s+guion\b/gi, "");
  out = out.replace(/\bmarca\s+de\s+fin\b/gi, "");
  out = out.replace(/\s*\n{3,}\s*/g, "\n\n");

  out = sanitizePersonalizationForTts(out, firstName);
  out = relaxParagraphPauses(out);

  return out.trim();
}

/** @deprecated Usar prepareScriptForTts; se mantiene por compatibilidad con imports. */
export const sanitizeScriptForTts = prepareScriptForTts;

function sanitizePersonalizationForTts(script: string, firstName: string | undefined): string {
  const name = firstName?.trim();
  const safe = name && !/^usuario$/i.test(name) ? name : "";

  let out = script;
  if (safe) {
    out = out.replace(/\bUsuario\b/gi, safe);
    out = out.replace(/\busuario\b/g, safe.toLowerCase());
  } else {
    out = out.replace(/\bquerido\s+usuario\b/gi, "");
    out = out.replace(/\bquerida\s+usuario\b/gi, "");
    out = out.replace(/\bcariño\s+usuario\b/gi, "cariño");
    out = out.replace(/\bUsuario\b/g, "");
    out = out.replace(/\s{2,}/g, " ");
  }
  return out;
}

/** Refuerza saltos de párrafo para que el TTS respire entre bloques. */
function relaxParagraphPauses(text: string): string {
  const parts = text
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.join("\n\n");
}
