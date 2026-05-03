/**
 * POST /api/payment/webhook
 *
 * Webhook de eventos de Wompi. Valida firma con WOMPI_EVENTS_SECRET y,
 * si la transacción fue APPROVED, marca la sesión como pagada.
 *
 * Idempotente: webhooks duplicados no dupliquean redemptions ni alteran
 * el estado final.
 */
import type { APIRoute } from "astro";
import { getSupabaseAdmin } from "../../../lib/supabase-server";
import { verifyWebhookSignature } from "../../../lib/wompi";
import { redeemCoupon } from "../../../lib/coupons";
import { sendPaymentConfirmedEmail } from "../../../lib/email";

function getSiteUrl(): string {
  const url =
    (import.meta.env.PUBLIC_SITE_URL as string | undefined) ||
    process.env.PUBLIC_SITE_URL ||
    "https://vozcalma.app";
  return url.replace(/\/$/, "");
}

interface WompiEvent {
  event?: string;
  timestamp?: number;
  signature?: { properties?: string[]; checksum?: string };
  data?: {
    transaction?: {
      id: string;
      reference: string;
      status: string;
      amount_in_cents: number;
      currency: string;
      finalized_at?: string;
      customer_email?: string;
      payment_method_type?: string;
    };
  };
}

export const POST: APIRoute = async ({ request }) => {
  let body: WompiEvent;
  try {
    body = (await request.json()) as WompiEvent;
  } catch {
    return new Response("invalid json", { status: 400 });
  }

  // Validar firma (obligatorio)
  if (!verifyWebhookSignature(body as Parameters<typeof verifyWebhookSignature>[0])) {
    console.warn("[payment/webhook] invalid signature");
    return new Response("invalid signature", { status: 401 });
  }

  const tx = body.data?.transaction;
  if (!tx?.id || !tx.reference) {
    // Evento sin payload útil — aceptar 200 para que Wompi no reintente.
    return new Response("ok", { status: 200 });
  }

  const supabase = getSupabaseAdmin();
  const { data: sessionRow } = await supabase
    .from("onboarding_sessions")
    .select("id, is_paid, amount_cents, coupon_code, discount_cents, payment_transaction_id, intake_json, type")
    .eq("payment_reference", tx.reference)
    .maybeSingle();

  if (!sessionRow) {
    console.warn(`[payment/webhook] session not found for ref=${tx.reference}`);
    return new Response("ok", { status: 200 });
  }

  // Idempotencia: si ya pagada con el mismo tx, no hacer nada.
  if (sessionRow.is_paid && sessionRow.payment_transaction_id === tx.id) {
    return new Response("ok", { status: 200 });
  }

  if (tx.status === "APPROVED") {
    // Double-check: el monto de Wompi coincide con lo que guardamos
    if (
      typeof sessionRow.amount_cents === "number" &&
      sessionRow.amount_cents !== tx.amount_in_cents
    ) {
      console.error(
        `[payment/webhook] amount mismatch for ${tx.reference}: db=${sessionRow.amount_cents} vs wompi=${tx.amount_in_cents}`,
      );
      return new Response("ok", { status: 200 });
    }

    await supabase
      .from("onboarding_sessions")
      .update({
        is_paid: true,
        paid_at: new Date().toISOString(),
        payment_transaction_id: tx.id,
        payment_metadata: tx as unknown as Record<string, unknown>,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionRow.id);

    // Redimir cupón si había uno parcial aplicado
    if (sessionRow.coupon_code && (sessionRow.discount_cents ?? 0) > 0) {
      await redeemCoupon(
        sessionRow.coupon_code,
        sessionRow.id,
        sessionRow.discount_cents ?? 0,
      );
    }

    console.log(`[payment/webhook] approved session=${sessionRow.id} tx=${tx.id}`);

    // Email de confirmación con link para retomar onboarding
    // (cubre caso de cierre de browser, cyber café, cambio de dispositivo).
    // Fire-and-forget: nunca bloquear el webhook.
    const intake = (sessionRow.intake_json ?? {}) as Record<string, unknown>;
    const recipient =
      typeof intake.email === "string" && intake.email
        ? (intake.email as string)
        : tx.customer_email;
    const recipientName =
      typeof intake.name === "string" && intake.name
        ? (intake.name as string)
        : "tú";

    if (recipient) {
      // Link directo al tipo pagado para evitar que el usuario acceda a un
      // tipo distinto (security: pagó "quick" no debe entrar a "deep").
      const typePath =
        sessionRow.type === "quick"
          ? "/onboarding/alivio-rapido"
          : sessionRow.type === "deep"
            ? "/onboarding/reprogramacion-profunda"
            : "/onboarding";
      const resumeUrl = `${getSiteUrl()}${typePath}?session=${sessionRow.id}`;
      void sendPaymentConfirmedEmail({
        email: recipient,
        name: recipientName,
        resumeUrl,
      }).catch((err) => {
        console.error(
          `[payment/webhook] failed to send confirmation email to ${recipient}:`,
          err,
        );
      });
    }
  } else if (
    tx.status === "DECLINED" ||
    tx.status === "ERROR" ||
    tx.status === "VOIDED"
  ) {
    await supabase
      .from("onboarding_sessions")
      .update({
        payment_transaction_id: tx.id,
        payment_metadata: tx as unknown as Record<string, unknown>,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionRow.id);
  }

  return new Response("ok", { status: 200 });
};
