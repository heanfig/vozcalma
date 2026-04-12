/**
 * Moderación de contenido — filtro de palabras hostiles/groseras.
 *
 * - Lista curada de groserías comunes en español latinoamericano
 * - Normalización NFD para strip accents antes de verificar
 * - Word boundaries para evitar falsos positivos (e.g. "capolla" no matchea "polla")
 * - El mensaje al usuario es genérico (no expone qué palabra fue detectada)
 *
 * Uso server-side en:
 *   - /api/onboarding/start-session.ts → nombre
 *   - /api/onboarding/generate.ts → answers de textareas
 */

const BANNED_WORDS = [
  // Groserías comunes (español LATAM)
  "mierda", "puta", "puto", "pendejo", "pendeja",
  "cabron", "cabrón", "coño", "joder",
  "culero", "culera", "huevon", "huevón",
  "chingar", "chinga", "chingada", "verga",
  "culo", "marica", "malparido", "malparida",
  "hijueputa", "hijueputa", "hp",
  "gonorrea", "carepicha",
  // Insultos hostiles
  "tu madre", "su madre", "tu puta madre",
  "tu vieja", "la ctm",
  // Amenazas / odio
  "matar", "morir", "suicid",
  // English basic
  "fuck", "shit", "bitch", "asshole",
];

/**
 * Chequea si el texto contiene contenido prohibido.
 *
 * @returns `{ allowed: true }` si está limpio, o `{ allowed: false, reason }` si contiene algo inapropiado
 */
export function containsBannedContent(text: string): {
  allowed: boolean;
  reason?: string;
} {
  if (!text || text.length === 0) return { allowed: true };

  // Normalizar: lowercase + strip accents + comprimir espacios
  const normalized = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  for (const word of BANNED_WORDS) {
    // Para frases con espacios (e.g. "tu madre"), buscar como substring
    if (word.includes(" ")) {
      if (normalized.includes(word)) {
        return { allowed: false, reason: "contenido-inapropiado" };
      }
      continue;
    }

    // Para palabras sueltas, usar word boundaries
    try {
      const re = new RegExp(`\\b${word}\\b`, "i");
      if (re.test(normalized)) {
        return { allowed: false, reason: "contenido-inapropiado" };
      }
    } catch {
      // Regex inválida (no debería pasar) → skip silencioso
    }
  }

  return { allowed: true };
}

/**
 * Valida un nombre para el onboarding.
 *
 * @returns `{ valid: true }` o `{ valid: false, reason }` con uno de:
 *   - "muy-corto" — menos de 2 caracteres
 *   - "muy-largo" — más de 40 caracteres
 *   - "caracteres-invalidos" — contiene símbolos, números, HTML, etc.
 *   - "contenido-inapropiado" — palabra prohibida detectada
 */
export function validateName(name: string): {
  valid: boolean;
  reason?: string;
  message?: string;
} {
  const trimmed = name.trim();

  if (trimmed.length < 2) {
    return {
      valid: false,
      reason: "muy-corto",
      message: "El nombre debe tener al menos 2 caracteres",
    };
  }

  if (trimmed.length > 40) {
    return {
      valid: false,
      reason: "muy-largo",
      message: "El nombre es demasiado largo",
    };
  }

  // Solo letras (con acentos/ñ), espacios, apóstrofes, guiones, puntos
  if (!/^[\p{L}\s'.\-]+$/u.test(trimmed)) {
    return {
      valid: false,
      reason: "caracteres-invalidos",
      message: "Por favor usa solo tu nombre real",
    };
  }

  const banned = containsBannedContent(trimmed);
  if (!banned.allowed) {
    return {
      valid: false,
      reason: "contenido-inapropiado",
      // Mensaje genérico para no exponer la lista
      message: "Por favor usa solo tu nombre real",
    };
  }

  return { valid: true };
}
