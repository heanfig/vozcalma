import type { APIRoute } from "astro";
import { synthesizeSpeech } from "../../../lib/elevenlabs";
import { json, requireAuth } from "../../../lib/api-utils";

type Body = { text: string };

export const POST: APIRoute = async (context) => {
  const auth = requireAuth(context);
  if (auth instanceof Response) return auth;

  let body: Body;
  try {
    body = (await context.request.json()) as Body;
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }

  const text = (body.text || "").trim();
  if (!text || text.length > 50000) {
    return json({ error: "Texto inválido" }, 400);
  }

  try {
    const buf = await synthesizeSpeech(text);
    return new Response(buf, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error TTS";
    return json({ error: msg }, 502);
  }
};
