/**
 * Gestión de cupones: validación + redención atómica.
 *
 * Tipos de descuento:
 *  - full: 100% (salta Wompi por completo)
 *  - percent: descuenta N% del precio base
 *  - fixed: descuenta N centavos del precio base
 *
 * La redención usa optimistic concurrency (CAS sobre redemption_count)
 * para prevenir race conditions sin necesidad de transacción explícita.
 */
import { getSupabaseAdmin } from "./supabase-server";
import { PRICE_COP_CENTS } from "./constants";

export interface CouponValidation {
  valid: boolean;
  reason?: "not_found" | "inactive" | "expired" | "exhausted" | "invalid_code";
  code?: string;
  discountType?: "full" | "percent" | "fixed";
  discountCents?: number;
  finalAmountCents?: number;
  description?: string;
}

/** Normaliza código: trim + uppercase + strip whitespace interno. */
export function normalizeCouponCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

function isValidCodeFormat(code: string): boolean {
  return /^[A-Z0-9][A-Z0-9_-]{1,40}$/.test(code);
}

function computeDiscountCents(
  discountType: "full" | "percent" | "fixed",
  discountValue: number,
  basePriceCents: number,
): number {
  if (discountType === "full") return basePriceCents;
  if (discountType === "percent") {
    const pct = Math.max(0, Math.min(100, discountValue));
    return Math.round((basePriceCents * pct) / 100);
  }
  if (discountType === "fixed") {
    return Math.max(0, Math.min(basePriceCents, discountValue));
  }
  return 0;
}

/**
 * Valida un cupón sin redimirlo. Retorna detalles del descuento si es válido.
 */
export async function validateCoupon(
  rawCode: string,
  basePriceCents: number = PRICE_COP_CENTS,
): Promise<CouponValidation> {
  const code = normalizeCouponCode(rawCode);
  if (!isValidCodeFormat(code)) {
    return { valid: false, reason: "invalid_code" };
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("coupons")
    .select(
      "code, description, discount_type, discount_value, max_uses, redemption_count, valid_until, is_active",
    )
    .eq("code", code)
    .maybeSingle();

  if (error || !data) return { valid: false, reason: "not_found" };
  if (!data.is_active) return { valid: false, reason: "inactive" };
  if (data.valid_until && new Date(data.valid_until).getTime() < Date.now()) {
    return { valid: false, reason: "expired" };
  }
  if (
    typeof data.max_uses === "number" &&
    data.redemption_count >= data.max_uses
  ) {
    return { valid: false, reason: "exhausted" };
  }

  const discountCents = computeDiscountCents(
    data.discount_type as "full" | "percent" | "fixed",
    data.discount_value ?? 0,
    basePriceCents,
  );
  const finalAmountCents = Math.max(0, basePriceCents - discountCents);

  return {
    valid: true,
    code: data.code,
    discountType: data.discount_type as "full" | "percent" | "fixed",
    discountCents,
    finalAmountCents,
    description: data.description ?? undefined,
  };
}

/**
 * Redime un cupón con optimistic concurrency. Reintenta hasta 3 veces si hay
 * conflicto en el CAS. Idempotente por session_id (no doble-cuenta).
 *
 * Retorna true si la redención ocurrió en esta llamada, false si ya estaba
 * redimida o si el cupón quedó sin usos.
 */
export async function redeemCoupon(
  rawCode: string,
  sessionId: string,
  discountCentsApplied: number,
): Promise<boolean> {
  const code = normalizeCouponCode(rawCode);
  const supabase = getSupabaseAdmin();

  const { data: existing } = await supabase
    .from("coupon_redemptions")
    .select("id")
    .eq("coupon_code", code)
    .eq("session_id", sessionId)
    .maybeSingle();
  if (existing?.id) return false;

  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: coupon } = await supabase
      .from("coupons")
      .select("redemption_count, max_uses, is_active, valid_until")
      .eq("code", code)
      .maybeSingle();
    if (!coupon || !coupon.is_active) return false;
    if (
      coupon.valid_until &&
      new Date(coupon.valid_until).getTime() < Date.now()
    ) {
      return false;
    }
    if (
      typeof coupon.max_uses === "number" &&
      coupon.redemption_count >= coupon.max_uses
    ) {
      return false;
    }

    const { data: upd } = await supabase
      .from("coupons")
      .update({ redemption_count: coupon.redemption_count + 1 })
      .eq("code", code)
      .eq("redemption_count", coupon.redemption_count)
      .select("code")
      .maybeSingle();

    if (upd) {
      await supabase.from("coupon_redemptions").insert({
        coupon_code: code,
        session_id: sessionId,
        discount_cents_applied: discountCentsApplied,
      });
      return true;
    }
  }

  return false;
}
