/**
 * POST /api/onboarding/start-session
 *
 * Entry point para iniciar el ritual. Recibe `{ name }` desde la landing,
 * crea una sesión firmada, setea la cookie HTTP-only `vc_session`, y retorna
 * `{ ok: true, sessionId }`.
 *
 * Rate limited: 20 requests / hora / IP.
 */
import type { APIRoute } from "astro";
import { json } from "../../../lib/api-utils";
import { createSession, setSessionCookie } from "../../../lib/session-cookie";
import { rateLimit } from "../../../lib/rate-limit";

export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
  const ip = clientAddress || request.headers.get("x-forwarded-for") || "unknown";

  // Rate limit: 20 inicios de sesión por hora por IP
  const rl = rateLimit(`start:${ip}`, 20, 60 * 60 * 1000);
  if (!rl.allowed) {
    return json(
      {
        error: "Demasiadas peticiones. Intenta de nuevo en un momento.",
        retryAt: rl.resetAt,
      },
      429,
    );
  }

  let body: { name?: string };
  try {
    body = (await request.json()) as { name?: string };
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }

  const name = (body.name || "").trim().slice(0, 50);
  if (!name) {
    return json({ error: "Nombre requerido" }, 400);
  }

  // Validación mínima: sin caracteres de control / HTML
  if (/[<>]/.test(name)) {
    return json({ error: "Nombre inválido" }, 400);
  }

  const session = createSession(name);
  setSessionCookie(cookies, session.cookieValue);

  return json({
    ok: true,
    sessionId: session.sessionId,
  });
};
