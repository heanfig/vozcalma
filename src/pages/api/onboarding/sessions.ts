import type { APIRoute } from "astro";
import { getSupabaseAdmin } from "../../../lib/supabase-server";

/**
 * Admin endpoint for onboarding sessions.
 *
 * POST — Create a pre-paid session (admin sends link to user).
 *   Body: { type: "quick"|"deep", isPaid?: boolean }
 *   Returns: { sessionId, url }
 *
 * GET  — Query session by id (?id=<uuid>).
 *   Returns: { id, type, isPaid, audioUrl, createdAt }
 */

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function authorize(request: Request): boolean {
  const secret = (import.meta.env.ADMIN_API_SECRET || process.env.ADMIN_API_SECRET);
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export const POST: APIRoute = async ({ request }) => {
  if (!authorize(request)) {
    return json({ error: "No autorizado" }, 401);
  }

  let body: { type?: string; isPaid?: boolean };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }

  const type = body.type;
  if (!type || (type !== "quick" && type !== "deep")) {
    return json({ error: "Tipo inválido (quick o deep)" }, 400);
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("onboarding_sessions")
    .insert({
      type,
      is_paid: body.isPaid ?? true,
    })
    .select("id")
    .single();

  if (error || !data) {
    return json({ error: error?.message || "Error al crear sesión" }, 500);
  }

  const base =
    ((import.meta.env.PUBLIC_SITE_URL || process.env.PUBLIC_SITE_URL || "") as string)?.replace(/\/$/, "") ||
    "https://vozcalma.app";
  const slug = type === "quick" ? "alivio-rapido" : "reprogramacion-profunda";
  const url = `${base}/onboarding/${slug}?session=${data.id}`;

  return json({ sessionId: data.id, url });
};

export const GET: APIRoute = async ({ request, url }) => {
  if (!authorize(request)) {
    return json({ error: "No autorizado" }, 401);
  }

  const id = url.searchParams.get("id");
  if (!id) {
    return json({ error: "Falta ?id=<uuid>" }, 400);
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("onboarding_sessions")
    .select("id, type, is_paid, audio_url, created_at")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return json({ error: error.message }, 500);
  }
  if (!data) {
    return json({ error: "Sesión no encontrada" }, 404);
  }

  return json({
    id: data.id,
    type: data.type,
    isPaid: data.is_paid,
    audioUrl: data.audio_url,
    createdAt: data.created_at,
  });
};
