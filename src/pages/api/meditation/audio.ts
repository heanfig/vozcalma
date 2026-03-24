import type { APIRoute } from "astro";
import { synthesizeSpeech } from "../../../lib/elevenlabs";
import { getSupabaseAdmin } from "../../../lib/supabase-server";
import { prepareScriptForTts } from "../../../lib/meditation/script-post";

type Body = { sessionId?: string; text?: string; displayName?: string };
const SCRIPT_PREFIX = "SCRIPT::";

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

  const sessionId = body.sessionId?.trim();
  const inlineText = body.text?.trim();
  const displayName = (body.displayName || "").trim();
  const firstNameForTts =
    displayName && !/^usuario$/i.test(displayName) ? displayName.split(/\s+/)[0] : "";
  if (!sessionId && !inlineText) {
    return new Response(JSON.stringify({ error: "sessionId o text requerido" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = getSupabaseAdmin();
  let scriptText = inlineText || "";
  if (sessionId && !scriptText) {
    const { data: session } = await supabase
      .from("sessions")
      .select("id")
      .eq("id", sessionId)
      .eq("clerk_user_id", userId)
      .maybeSingle();
    if (!session) {
      return new Response(JSON.stringify({ error: "Sesión no encontrada" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { data: systemMessages } = await supabase
      .from("messages")
      .select("content, created_at")
      .eq("session_id", sessionId)
      .eq("role", "system")
      .order("created_at", { ascending: false })
      .limit(5);
    const scriptMessage = (systemMessages || []).find((m) =>
      (m.content || "").startsWith(SCRIPT_PREFIX),
    );
    scriptText = (scriptMessage?.content || "")
      .replace(SCRIPT_PREFIX, "")
      .split("---FIN_GUIÓN---")[0]
      .trim();
  }
  if (!scriptText) {
    return new Response(JSON.stringify({ error: "Guion no disponible" }), {
      status: 409,
      headers: { "Content-Type": "application/json" },
    });
  }

  scriptText = prepareScriptForTts(scriptText, firstNameForTts || undefined);

  try {
    const buf = await synthesizeSpeech(scriptText);
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
