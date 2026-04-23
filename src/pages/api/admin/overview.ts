import type { APIRoute } from "astro";
import { json, withAdmin } from "../../../lib/api-utils";
import { getSupabaseAdmin } from "../../../lib/supabase-server";

export const GET: APIRoute = withAdmin(async () => {
  const supabase = getSupabaseAdmin();
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).toISOString();
  const startOfMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    1,
  ).toISOString();

  const [
    paidToday,
    paidMonth,
    revenueTodayRes,
    revenueMonthRes,
    costTodayRes,
    costMonthRes,
    generationsToday,
    activeCoupons,
  ] = await Promise.all([
    supabase
      .from("onboarding_sessions")
      .select("id", { count: "exact", head: true })
      .eq("is_paid", true)
      .gte("paid_at", startOfToday),
    supabase
      .from("onboarding_sessions")
      .select("id", { count: "exact", head: true })
      .eq("is_paid", true)
      .gte("paid_at", startOfMonth),
    supabase
      .from("onboarding_sessions")
      .select("amount_cents")
      .eq("is_paid", true)
      .gte("paid_at", startOfToday),
    supabase
      .from("onboarding_sessions")
      .select("amount_cents")
      .eq("is_paid", true)
      .gte("paid_at", startOfMonth),
    supabase
      .from("meditation_costs")
      .select("llm_cost_usd, tts_cost_usd")
      .gte("created_at", startOfToday),
    supabase
      .from("meditation_costs")
      .select("llm_cost_usd, tts_cost_usd")
      .gte("created_at", startOfMonth),
    supabase
      .from("meditation_costs")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startOfToday),
    supabase
      .from("coupons")
      .select("code", { count: "exact", head: true })
      .eq("is_active", true),
  ]);

  const sumAmountCents = (rows: { amount_cents: number | null }[] | null): number =>
    (rows || []).reduce((acc, r) => acc + (r.amount_cents || 0), 0);
  const sumCostUsd = (
    rows: { llm_cost_usd: number | null; tts_cost_usd: number | null }[] | null,
  ): number =>
    (rows || []).reduce(
      (acc, r) => acc + Number(r.llm_cost_usd || 0) + Number(r.tts_cost_usd || 0),
      0,
    );

  const revenueCopToday = sumAmountCents(revenueTodayRes.data);
  const revenueCopMonth = sumAmountCents(revenueMonthRes.data);
  const costUsdToday = sumCostUsd(costTodayRes.data);
  const costUsdMonth = sumCostUsd(costMonthRes.data);

  // Margen: revenue (COP cents → USD rough × 1/4000 COP-USD) vs cost USD.
  // Para no hardcodear FX, retornamos números brutos; la UI muestra ambos.
  const copToUsdFx = 4000; // aprox. Se puede ajustar en UI.
  const revenueUsdMonth = revenueCopMonth / 100 / copToUsdFx;
  const marginUsdMonth = revenueUsdMonth - costUsdMonth;
  const marginPct =
    revenueUsdMonth > 0 ? (marginUsdMonth / revenueUsdMonth) * 100 : null;

  return json({
    paid_today: paidToday.count || 0,
    paid_month: paidMonth.count || 0,
    revenue_cop_today_cents: revenueCopToday,
    revenue_cop_month_cents: revenueCopMonth,
    cost_usd_today: costUsdToday,
    cost_usd_month: costUsdMonth,
    margin_usd_month: marginUsdMonth,
    margin_pct: marginPct,
    active_coupons: activeCoupons.count || 0,
    generations_today: generationsToday.count || 0,
    fx_cop_usd: copToUsdFx,
  });
});
