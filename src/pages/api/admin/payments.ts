import type { APIRoute } from "astro";
import { json, withAdmin } from "../../../lib/api-utils";
import { getSupabaseAdmin } from "../../../lib/supabase-server";

function parseIntSafe(v: string | null, fallback: number): number {
  if (!v) return fallback;
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export const GET: APIRoute = withAdmin(async ({ url }) => {
  const supabase = getSupabaseAdmin();
  const sp = url.searchParams;
  const limit = Math.min(parseIntSafe(sp.get("limit"), 25), 100);
  const offset = parseIntSafe(sp.get("offset"), 0);
  const status = sp.get("status"); // "paid" | "pending" | null
  const since = sp.get("since");
  const until = sp.get("until");

  let query = supabase
    .from("onboarding_sessions")
    .select(
      "id, type, is_paid, payment_provider, payment_reference, payment_transaction_id, amount_cents, currency, paid_at, coupon_code, discount_cents, created_at",
      { count: "exact" },
    )
    .not("payment_reference", "is", null)
    .order("created_at", { ascending: false });

  if (status === "paid") query = query.eq("is_paid", true);
  if (status === "pending") query = query.eq("is_paid", false);
  if (since) query = query.gte("created_at", since);
  if (until) query = query.lte("created_at", until);

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) return json({ error: error.message }, 500);

  return json({ payments: data || [], total: count || 0, limit, offset });
});
