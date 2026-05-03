const END_MARKER = "---FIN_GUIÓN---";

export function prepareScriptForTts(script: string, firstName: string | undefined): string {
  let out = script.replace(/\r\n/g, "\n");

  out = out.replace(new RegExp(END_MARKER.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "");
  out = out.replace(/\bfin\s+gui[óo]n\b/gi, "");
  out = out.replace(/\bfin\s+guion\b/gi, "");
  out = out.replace(/\bfinal\s+del\s+gui[óo]n\b/gi, "");
  out = out.replace(/\bfin\s+del\s+gui[óo]n\b/gi, "");
  out = out.replace(/\bfin\s+del\s+guion\b/gi, "");
  out = out.replace(/\bmarca\s+de\s+fin\b/gi, "");
  out = sanitizePersonalizationForTts(out, firstName);
  out = relaxParagraphPauses(out);

  return out.trim();
}

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
    // Solo colapsar espacios horizontales múltiples; preserva newlines y marcadores ||PAUSE:Xs||.
    out = out.replace(/[ \t]{2,}/g, " ");
  }
  return out;
}

function relaxParagraphPauses(text: string): string {
  const parts = text
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.join("\n\n");
}
