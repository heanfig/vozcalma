/**
 * Rate limiter in-memory con sliding window simple.
 *
 * Implementa un bucket por clave con `count` y `resetAt`. Cuando el reset
 * ha pasado, el bucket se reinicia. Simple y suficiente para un VPS single-node.
 *
 * Para multi-instancia (múltiples Docker containers) se necesitaría Redis
 * o un backend compartido — NO es el caso actual.
 *
 * Cleanup periódico cada 60s para evitar leaks de memoria.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Chequea (y consume) 1 request contra el bucket identificado por `key`.
 *
 * @param key    Identificador único (ej: "gen:abc123", "start:1.2.3.4")
 * @param max    Máximo de requests permitidos en la ventana
 * @param windowMs Duración de la ventana en milisegundos
 */
export function rateLimit(
  key: string,
  max: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: max - 1, resetAt };
  }

  if (bucket.count >= max) {
    return { allowed: false, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count++;
  return { allowed: true, remaining: max - bucket.count, resetAt: bucket.resetAt };
}

/**
 * Cleanup de buckets expirados — corre cada 60s en background.
 * `.unref()` permite que Node se cierre aunque el interval siga activo.
 */
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) {
      buckets.delete(key);
    }
  }
}, 60_000);

// No bloquear shutdown por el interval
if (typeof cleanupInterval.unref === "function") {
  cleanupInterval.unref();
}
