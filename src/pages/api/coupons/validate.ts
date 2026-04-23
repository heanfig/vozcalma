/**
 * POST /api/coupons/validate
 *
 * Valida un código de cupón sin redimirlo. Retorna el descuento aplicable
 * para que el cliente muestre el precio final. Rate limited agresivamente
 * para prevenir enumeración de códigos.
 */
import type { APIRoute } from "astro";
import { json } from "../../../lib/api-utils";
import { readSession } from "../../../lib/session-cookie";
import { verifyCsrfToken } from "../../../lib/csrf";
import { rateLimit } from "../../../lib/rate-limit";
import { validateCoupon } from "../../../lib/coupons";
import { getPriceForType } from "../../../lib/constants";

export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
  const session = readSession(cookies);
  if (!session) {
    return json({ error: "Sesión inválida" }, 401);
  }

  const csrfHeader = request.headers.get("x-csrf-token");
  const csrf = verifyCsrfToken(csrfHeader);
  if (!csrf.valid || csrf.sessionId !== session.sessionId) {
    return json({ error: "Token CSRF inválido" }, 403);
  }

  // Rate limit agresivo contra enumeration: 10 intentos / min / IP
  const ip = clientAddress || request.headers.get("x-forwarded-for") || "unknown";
  const rl = rateLimit(`coupon-validate:${ip}`, 10, 60 * 1000);
  if (!rl.allowed) {
    return json(
      { error: "Demasiados intentos. Espera un momento.", retryAt: rl.resetAt },
      429,
    );
  }

  let body: { code?: string; type?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }

  const code = (body.code || "").trim();
  if (!code) return json({ valid: false, reason: "invalid_code" }, 400);

  // `type` determina el precio base contra el cual se calcula el descuento.
  // Si no llega, usamos el tier más alto (deep) — previene under-charging si
  // el cliente olvida mandar el tipo.
  const type: "quick" | "deep" =
    body.type === "quick" || body.type === "deep" ? body.type : "deep";
  const basePriceCents = getPriceForType(type);

  const result = await validateCoupon(code, basePriceCents);

  // No exponer max_uses / redemption_count / valid_until — solo lo necesario para UI.
  return json({
    valid: result.valid,
    reason: result.reason,
    code: result.code,
    discountType: result.discountType,
    discountCents: result.discountCents,
    finalAmountCents: result.finalAmountCents,
    description: result.description,
  });
};
