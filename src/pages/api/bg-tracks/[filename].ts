/**
 * GET /api/bg-tracks/{filename}
 *
 * Sirve un archivo MP3 de fondo desde el filesystem.
 * Validación estricta de filename para prevenir path traversal.
 */
import type { APIRoute } from "astro";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const VALID_FILENAME = /^[a-zA-Z0-9._\-]+\.mp3$/;

export const GET: APIRoute = async ({ params }) => {
  const filename = params.filename;
  if (!filename || !VALID_FILENAME.test(filename)) {
    return new Response("Not found", { status: 404 });
  }

  const path = join(process.cwd(), "assets", "audio", "backgrounds", filename);
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
