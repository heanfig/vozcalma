/**
 * CSRF token signing/verification con HMAC-SHA256.
 *
 * Format: `${sessionId}.${nonce}.${expiresAt}.${signature}`
 *
 * El token está atado al sessionId del cookie `vc_session` — el endpoint
 * verifica que ambos coincidan antes de procesar requests POST sensibles.
 *
 * Uso de `timingSafeEqual` para comparar firmas → previene timing attacks.
 */
import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";

const TTL_MS = 60 * 60 * 1000; // 1 hora

function getSecret(): string {
  const s = import.meta.env.CSRF_SECRET || process.env.CSRF_SECRET;
  if (!s || s.length < 32) {
    throw new Error(
      "CSRF_SECRET no configurada o muy corta (mínimo 32 caracteres). Generá una con: openssl rand -hex 32",
    );
  }
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

/**
 * Firma un token CSRF atado a un sessionId con TTL de 1 hora.
 */
export function signCsrfToken(sessionId: string): string {
  const nonce = randomBytes(16).toString("base64url");
  const expiresAt = Date.now() + TTL_MS;
  const payload = `${sessionId}.${nonce}.${expiresAt}`;
  const sig = sign(payload);
  return `${payload}.${sig}`;
}

/**
 * Verifica un token CSRF. Retorna el sessionId si es válido.
 */
export function verifyCsrfToken(
  token: string | null | undefined,
): { valid: boolean; sessionId: string | null } {
  if (!token) return { valid: false, sessionId: null };

  const parts = token.split(".");
  if (parts.length !== 4) return { valid: false, sessionId: null };

  const [sessionId, nonce, expiresAtStr, providedSig] = parts;
  const payload = `${sessionId}.${nonce}.${expiresAtStr}`;
  const expectedSig = sign(payload);

  // Timing-safe comparison
  const a = Buffer.from(providedSig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length) return { valid: false, sessionId: null };
  try {
    if (!timingSafeEqual(a, b)) return { valid: false, sessionId: null };
  } catch {
    return { valid: false, sessionId: null };
  }

  // Check expiration
  const expiresAt = Number(expiresAtStr);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) {
    return { valid: false, sessionId: null };
  }

  return { valid: true, sessionId };
}
