import type { APIRoute } from "astro";
import { synthesizeSpeech } from "../../../lib/elevenlabs";
import { getSupabaseAdmin } from "../../../lib/supabase-server";
import { prepareScriptForTts } from "../../../lib/meditation/script-post";
import { json, requireAuth } from "../../../lib/api-utils";
import { SCRIPT_PREFIX, extractScript } from "../../../lib/constants";

type Body = { sessionId?: string; text?: string; displayName?: string };

export const POST: APIRoute = async (context) => {
  const auth = requireAuth(context);
  if (auth instanceof Response) return auth;

  let body: Body;
  try {
    body = (await context.request.json()) as Body;
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }

  const sessionId = body.sessionId?.trim();
  const inlineText = body.text?.trim();
  const displayName = (body.displayName || "").trim();
  const firstNameForTts =
    displayName && !/^usuario$/i.test(displayName) ? displayName.split(/\s+/)[0] : "";
  if (!sessionId && !inlineText) {
    return json({ error: "sessionId o text requerido" }, 400);
  }

  const supabase = getSupabaseAdmin();
  let scriptText = inlineText || "";
  if (sessionId && !scriptText) {
    const { data: session } = await supabase
      .from("sessions")
      .select("id")
      .eq("id", sessionId)
      .eq("clerk_user_id", auth)
      .maybeSingle();
    if (!session) return json({ error: "Sesión no encontrada" }, 404);

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
    scriptText = extractScript(scriptMessage?.content || "");
  }
  if (!scriptText) return json({ error: "Guion no disponible" }, 409);

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
    return json({ error: msg }, 502);
  }
};
