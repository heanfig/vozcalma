/**
 * GET /api/bg-tracks/list
 *
 * Retorna la lista de tracks de fondo disponibles.
 * Los tracks viven en assets/audio/backgrounds/ (server-side).
 */
import type { APIRoute } from "astro";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { json } from "../../../lib/api-utils";

export const GET: APIRoute = async () => {
  const dir = join(process.cwd(), "assets", "audio", "backgrounds");
  try {
    const files = (await readdir(dir)).filter((f) => f.endsWith(".mp3"));
    const tracks = files.map((f) => ({
      name: f.replace(/\.mp3$/, "").replace(/[-_]/g, " ").slice(0, 40),
      url: `/api/bg-tracks/${encodeURIComponent(f)}`,
    }));
    return json({ tracks });
  } catch {
    return json({ tracks: [] });
  }
};
