/**
 * Pricing helpers para estimar costos de APIs externas.
 *
 * OpenRouter tiene endpoint `/generation?id=<id>` que retorna el USD real por call,
 * por eso el costo LLM NO se estima aquí — se consulta con `openrouter-usage.ts`.
 *
 * ElevenLabs no expone costo por-request; lo estimamos con una tasa fija configurable
 * por env var `ELEVENLABS_USD_PER_1K_CHARS` (default 0.22, plan Creator multilingüe v2/v3
 * incluido; overage son 0.30).
 */

function readRate(): number {
  const raw =
    (import.meta.env.ELEVENLABS_USD_PER_1K_CHARS as string | undefined) ||
    process.env.ELEVENLABS_USD_PER_1K_CHARS;
  const n = raw != null && String(raw).trim() !== "" ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 0.22;
}

export const ELEVENLABS_USD_PER_1K_CHARS = readRate();

export function estimateTtsCostUsd(chars: number): number {
  if (!Number.isFinite(chars) || chars <= 0) return 0;
  return (chars / 1000) * ELEVENLABS_USD_PER_1K_CHARS;
}
