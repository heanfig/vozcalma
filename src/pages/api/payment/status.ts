/**
 * GET /api/payment/status?session_id=<uuid>
 *
 * Polling endpoint para el cliente tras volver del redirect de Wompi.
 * Si la DB aún no refleja el pago (webhook aún no llegó), consulta la API
 * de Wompi como fallback.
 */
import type { APIRoute } from "astro";
import { json } from "../../../lib/api-utils";
import { readSession } from "../../../lib/session-cookie";
import { getSupabaseAdmin } from "../../../lib/supabase-server";
import { fetchTransactionStatus } from "../../../lib/wompi";
import { redeemCoupon } from "../../../lib/coupons";

export const GET: APIRoute = async ({ request, cookies }) => {
  const session = readSession(cookies);
  if (!session) {
    return json({ error: "Sesión inválida" }, 401);
  }

  const url = new URL(request.url);
  const sessionIdParam = url.searchParams.get("session_id");
  if (!sessionIdParam) {
    return json({ error: "session_id requerido" }, 400);
  }

  const supabase = getSupabaseAdmin();
  const { data: row } = await supabase
    .from("onboarding_sessions")
    .select(
      "id, is_paid, payment_reference, payment_transaction_id, amount_cents, coupon_code, discount_cents",
    )
    .eq("id", sessionIdParam)
    .maybeSingle();

  if (!row) return json({ paid: false, status: "not_found" }, 404);

  if (row.is_paid) {
    return json({ paid: true, sessionId: row.id, status: "APPROVED" });
  }

  // Fallback: consultar Wompi directamente por transaction_id si existe
  const txId = url.searchParams.get("id") || row.payment_transaction_id;
  if (txId) {
    const wompiTx = await fetchTransactionStatus(txId);
    if (wompiTx?.status === "APPROVED") {
      // Doble-check amount
      if (
        typeof row.amount_cents === "number" &&
        row.amount_cents !== wompiTx.amount_in_cents
      ) {
        return json({
          paid: false,
          status: "amount_mismatch",
          sessionId: row.id,
        });
      }
      await supabase
        .from("onboarding_sessions")
        .update({
          is_paid: true,
          paid_at: new Date().toISOString(),
          payment_transaction_id: wompiTx.id,
          payment_metadata: wompiTx as unknown as Record<string, unknown>,
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);

      if (row.coupon_code && (row.discount_cents ?? 0) > 0) {
        await redeemCoupon(row.coupon_code, row.id, row.discount_cents ?? 0);
      }
      return json({ paid: true, sessionId: row.id, status: "APPROVED" });
    }
    return json({
      paid: false,
      sessionId: row.id,
      status: wompiTx?.status || "PENDING",
    });
  }

  return json({ paid: false, sessionId: row.id, status: "PENDING" });
};
