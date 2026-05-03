/**
 * GET /api/meditations/sample/{slug}
 *
 * Sirve el archivo `assets/audio/meditations/<slug>/sample.mp3` como demo
 * audible en el landing. Si no existe, retorna 404 — el SamplePlayer del
 * landing maneja el fallback (estado "muestra no disponible").
 */
import type { APIRoute } from "astro";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const VALID_SLUG = /^[a-z0-9-]+$/;

export const GET: APIRoute = async ({ params }) => {
  const slug = params.slug;
  if (!slug || !VALID_SLUG.test(slug)) {
    return new Response("Not found", { status: 404 });
  }

  const path = join(
    process.cwd(),
    "assets",
    "audio",
    "meditations",
    slug,
    "sample.mp3",
  );
  try {
    const buf = await readFile(path);
    return new Response(buf, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(buf.byteLength),
        "Cache-Control": "public, max-age=86400",
        "Accept-Ranges": "bytes",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
};
