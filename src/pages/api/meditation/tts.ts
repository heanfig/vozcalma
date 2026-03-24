import type { APIRoute } from "astro";
import { synthesizeSpeech } from "../../../lib/elevenlabs";

type Body = { text: string };

export const POST: APIRoute = async (context) => {
  const { userId } = context.locals.auth();
  if (!userId) {
    return new Response(JSON.stringify({ error: "No autorizado" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: Body;
  try {
    body = (await context.request.json()) as Body;
  } catch {
    return new Response(JSON.stringify({ error: "JSON inválido" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const text = (body.text || "").trim();
  if (!text || text.length > 50000) {
    return new Response(JSON.stringify({ error: "Texto inválido" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
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
    return new Response(JSON.stringify({ error: msg }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
};
