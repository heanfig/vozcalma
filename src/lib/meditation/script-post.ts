/** Evita que TTS diga "Usuario" como nombre; usa el primer nombre o tono neutro. */
export function sanitizeScriptForTts(script: string, firstName: string | undefined): string {
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
  return out.trim();
}
