import type { APIRoute } from "astro";
import { completeChat, type ChatMessage } from "../../lib/openrouter";
import { getSupabaseAdmin } from "../../lib/supabase-server";
import { MEDITATION_SYSTEM_PROMPT } from "../../lib/system-prompt";

type Body = {
  sessionId?: string | null;
  message: string;
};

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

  const text = (body.message || "").trim();
  if (!text || text.length > 12000) {
    return new Response(JSON.stringify({ error: "Mensaje inválido" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = getSupabaseAdmin();

  let sessionId = body.sessionId || null;
  if (!sessionId) {
    const { data: s, error: e1 } = await supabase
      .from("sessions")
      .insert({ clerk_user_id: userId, title: null })
      .select("id")
      .single();
    if (e1 || !s) {
      return new Response(
        JSON.stringify({ error: "No se pudo crear la sesión", detail: e1?.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
    sessionId = s.id;
  } else {
    const { data: check } = await supabase
      .from("sessions")
      .select("id")
      .eq("id", sessionId)
      .eq("clerk_user_id", userId)
      .maybeSingle();
    if (!check) {
      return new Response(JSON.stringify({ error: "Sesión no encontrada" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  await supabase.from("messages").insert({
    session_id: sessionId,
    role: "user",
    content: text,
  });

  const { data: history } = await supabase
    .from("messages")
    .select("role, content")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  const msgs: ChatMessage[] = [
    { role: "system", content: MEDITATION_SYSTEM_PROMPT },
    ...((history || []) as { role: string; content: string }[]).map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    })),
  ];

  let assistantText: string;
  try {
    assistantText = await completeChat(msgs);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error del modelo";
    return new Response(JSON.stringify({ error: msg }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  await supabase.from("messages").insert({
    session_id: sessionId,
    role: "assistant",
    content: assistantText,
  });

  const scriptReady = assistantText.includes("---FIN_GUIÓN---");

  return new Response(
    JSON.stringify({
      sessionId,
      message: assistantText,
      scriptReady,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};
