/**
 * POST /api/payment/initiate
 *
 * Inicia el flujo de pago con Wompi o aplica un cupón (full) que salta checkout.
 *
 * Seguridad: cookie firmada + CSRF + rate limit por sessionId.
 *
 * Body: { type: "quick"|"deep", couponCode?: string }
 *
 * Respuesta:
 *   - Si cupón full → { skip_checkout: true, sessionId } (cliente avanza directo)
 *   - Si pago real → { checkout_url, sessionId, reference, amountCents } (cliente redirige)
 */
import type { APIRoute } from "astro";
import { json } from "../../../lib/api-utils";
import { readSession } from "../../../lib/session-cookie";
import { verifyCsrfToken } from "../../../lib/csrf";
import { rateLimit } from "../../../lib/rate-limit";
import { getSupabaseAdmin } from "../../../lib/supabase-server";
import { buildCheckoutUrl, generateReference } from "../../../lib/wompi";
import { validateCoupon, redeemCoupon, normalizeCouponCode } from "../../../lib/coupons";
import { CURRENCY, getPriceForType } from "../../../lib/constants";

function absoluteSiteUrl(request: Request): string {
  const env =
    import.meta.env.PUBLIC_SITE_URL || process.env.PUBLIC_SITE_URL;
  if (env) return env.replace(/\/$/, "");
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

export const POST: APIRoute = async ({ request, cookies }) => {
  const session = readSession(cookies);
  if (!session) {
    return json(
      { error: "Sesión inválida. Inicia el ritual desde la página principal." },
      401,
    );
  }

  const csrfHeader = request.headers.get("x-csrf-token");
  const csrf = verifyCsrfToken(csrfHeader);
  if (!csrf.valid || csrf.sessionId !== session.sessionId) {
    return json({ error: "Token CSRF inválido o expirado" }, 403);
  }

  const rl = rateLimit(`pay:${session.sessionId}`, 5, 10 * 60 * 1000);
  if (!rl.allowed) {
    return json(
      { error: "Demasiados intentos de pago. Espera unos minutos.", retryAt: rl.resetAt },
      429,
    );
  }

  let body: { type?: string; couponCode?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }

  const type = body.type;
  if (type !== "quick" && type !== "deep") {
    return json({ error: "Tipo inválido" }, 400);
  }
  const basePriceCents = getPriceForType(type);

  const supabase = getSupabaseAdmin();

  // Crear (o reusar) fila en onboarding_sessions para atar el pago.
  // Buscamos primero una fila existente de esta sesión que NO esté pagada aún.
  const { data: existing } = await supabase
    .from("onboarding_sessions")
    .select("id, is_paid, payment_reference, amount_cents")
    .eq("id", session.sessionId)
    .maybeSingle();

  let dbSessionId: string;
  if (existing) {
    if (existing.is_paid) {
      // Si llegamos acá es porque el rotador del page load no corrió (caso raro).
      // Devolvemos un error con flag para que el cliente recargue y obtenga
      // una sesión fresca.
      return json(
        {
          error: "Esta sesión ya fue pagada. Recargá la página para iniciar una nueva.",
          alreadyPaid: true,
          shouldRefresh: true,
        },
        409,
      );
    }
    dbSessionId = existing.id;
    await supabase
      .from("onboarding_sessions")
      .update({
        type,
        utm_source: session.utm_source ?? null,
        utm_medium: session.utm_medium ?? null,
        utm_campaign: session.utm_campaign ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", dbSessionId);
  } else {
    const { data: inserted, error: insErr } = await supabase
      .from("onboarding_sessions")
      .insert({
        id: session.sessionId,
        type,
        intake_json: { nombre: session.name },
        is_paid: false,
        currency: CURRENCY,
        utm_source: session.utm_source ?? null,
        utm_medium: session.utm_medium ?? null,
        utm_campaign: session.utm_campaign ?? null,
      })
      .select("id")
      .single();
    if (insErr || !inserted) {
      console.error("[payment/initiate] insert session failed:", insErr?.message);
      return json({ error: "No se pudo crear la sesión" }, 500);
    }
    dbSessionId = inserted.id;
  }

  // --- Aplicar cupón si viene ---
  const rawCoupon = (body.couponCode || session.coupon_code || "").trim();
  let discountCents = 0;
  let appliedCoupon: string | null = null;
  if (rawCoupon) {
    const validation = await validateCoupon(rawCoupon, basePriceCents);
    if (!validation.valid) {
      return json({ error: "Cupón inválido", reason: validation.reason }, 400);
    }
    discountCents = validation.discountCents ?? 0;
    appliedCoupon = validation.code ?? normalizeCouponCode(rawCoupon);

    // Full discount → saltar Wompi completo
    if ((validation.finalAmountCents ?? 0) === 0) {
      const redeemed = await redeemCoupon(
        appliedCoupon,
        dbSessionId,
        discountCents,
      );
      if (!redeemed) {
        return json({ error: "Cupón ya no está disponible" }, 409);
      }
      await supabase
        .from("onboarding_sessions")
        .update({
          is_paid: true,
          paid_at: new Date().toISOString(),
          payment_provider: "coupon",
          coupon_code: appliedCoupon,
          discount_cents: discountCents,
          amount_cents: 0,
          updated_at: new Date().toISOString(),
        })
        .eq("id", dbSessionId);

      return json({
        skip_checkout: true,
        sessionId: dbSessionId,
        amountCents: 0,
        discountCents,
        couponCode: appliedCoupon,
      });
    }
  }

  // --- Pago con Wompi ---
  const amountCents = Math.max(0, basePriceCents - discountCents);
  const reference = generateReference(dbSessionId);
  const redirectUrl = `${absoluteSiteUrl(request)}/payment/return?session=${dbSessionId}&type=${type}`;

  const checkoutUrl = buildCheckoutUrl({
    reference,
    amountInCents: amountCents,
    redirectUrl,
    customerName: session.name,
  });

  const { error: updErr } = await supabase
    .from("onboarding_sessions")
    .update({
      payment_provider: "wompi",
      payment_reference: reference,
      amount_cents: amountCents,
      discount_cents: discountCents,
      coupon_code: appliedCoupon,
      currency: CURRENCY,
      updated_at: new Date().toISOString(),
    })
    .eq("id", dbSessionId);

  if (updErr) {
    console.error("[payment/initiate] update failed:", updErr.message);
    return json({ error: "No se pudo preparar el pago" }, 500);
  }

  return json({
    skip_checkout: false,
    checkout_url: checkoutUrl,
    sessionId: dbSessionId,
    reference,
    amountCents,
    discountCents,
    couponCode: appliedCoupon,
  });
};
