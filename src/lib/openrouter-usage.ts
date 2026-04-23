/**
 * Consulta el endpoint `/generation?id=<id>` de OpenRouter para obtener el costo USD
 * real de una generación específica. Se usa fire-and-forget tras persistir la sesión.
 *
 * El endpoint tiene delay de 1-5s después de la llamada original; si falla, retornamos
 * null y el dashboard muestra "calculando…" hasta que se reintente o quede permanentemente
 * sin costo real (ante fallo persistente, usamos estimación TTS como approximation).
 */

const OPENROUTER_GENERATION_URL =
  "https://openrouter.ai/api/v1/generation?id=";

export async function fetchGenerationCost(
  id: string,
): Promise<number | null> {
  const apiKey =
    import.meta.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY;
  if (!apiKey || !id) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);

  try {
    const res = await fetch(
      OPENROUTER_GENERATION_URL + encodeURIComponent(id),
      {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: controller.signal,
      },
    );
    if (!res.ok) return null;
    const body = (await res.json()) as {
      data?: { total_cost?: number };
    };
    const cost = body?.data?.total_cost;
    return typeof cost === "number" && Number.isFinite(cost) ? cost : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
