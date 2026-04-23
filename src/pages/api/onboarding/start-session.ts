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
import { validateName } from "../../../lib/content-moderation";
import { signCsrfToken } from "../../../lib/csrf";

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

  let body: {
    name?: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    coupon_code?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }

  const name = (body.name || "").trim().slice(0, 50);
  if (!name) {
    return json({ error: "Nombre requerido" }, 400);
  }

  // Validación completa: longitud, caracteres, contenido inapropiado
  const nameCheck = validateName(name);
  if (!nameCheck.valid) {
    return json({
      error: nameCheck.message || "Nombre inválido",
      reason: nameCheck.reason,
    }, 400);
  }

  // Sanitizar UTM + coupon (whitelist ascii + límite de longitud) — evitan tráfico
  // malicioso intentando inyectar valores extensos en cookie o DB.
  const cleanUtm = (raw: unknown, max = 64): string | undefined => {
    if (typeof raw !== "string") return undefined;
    const v = raw.trim().slice(0, max).replace(/[^\w\-.~:/?#@!$&'()*+,;=]/g, "");
    return v || undefined;
  };

  const session = createSession(name, {
    utm_source: cleanUtm(body.utm_source),
    utm_medium: cleanUtm(body.utm_medium),
    utm_campaign: cleanUtm(body.utm_campaign),
    coupon_code: cleanUtm(body.coupon_code, 42),
  });
  setSessionCookie(cookies, session.cookieValue);

  return json({
    ok: true,
    sessionId: session.sessionId,
    csrfToken: signCsrfToken(session.sessionId),
  });
};
