import { useEffect, useState } from "react";
import MetricCard from "./MetricCard";
import { formatCOP, formatUSD, formatNumber, formatPercent } from "../../lib/format";

interface OverviewData {
  paid_today: number;
  paid_month: number;
  revenue_cop_today_cents: number;
  revenue_cop_month_cents: number;
  cost_usd_today: number;
  cost_usd_month: number;
  margin_usd_month: number;
  margin_pct: number | null;
  active_coupons: number;
  generations_today: number;
  fx_cop_usd: number;
}

export default function OverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/overview");
        const body = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(body.error || "Error cargando overview");
          return;
        }
        setData(body);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error de red");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 p-4 text-sm text-rose-700 dark:text-rose-300">
        {error}
      </div>
    );
  }
  if (!data) {
    return <div className="text-slate-500">Cargando…</div>;
  }

  const marginTone: "positive" | "negative" | "default" =
    data.margin_pct == null
      ? "default"
      : data.margin_pct > 40
      ? "positive"
      : data.margin_pct < 0
      ? "negative"
      : "default";

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
          Hoy
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Pagos confirmados"
            value={formatNumber(data.paid_today)}
            icon="payments"
          />
          <MetricCard
            title="Revenue"
            value={formatCOP(data.revenue_cop_today_cents)}
            icon="attach_money"
          />
          <MetricCard
            title="Costo APIs"
            value={formatUSD(data.cost_usd_today)}
            subtitle="LLM + TTS"
            icon="bolt"
          />
          <MetricCard
            title="Generaciones"
            value={formatNumber(data.generations_today)}
            icon="graphic_eq"
          />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
          Este mes
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Pagos"
            value={formatNumber(data.paid_month)}
            icon="payments"
          />
          <MetricCard
            title="Revenue"
            value={formatCOP(data.revenue_cop_month_cents)}
            subtitle={`≈ ${formatUSD(data.revenue_cop_month_cents / 100 / data.fx_cop_usd)} · fx ${data.fx_cop_usd.toLocaleString()}`}
            icon="trending_up"
          />
          <MetricCard
            title="Costo APIs"
            value={formatUSD(data.cost_usd_month)}
            icon="bolt"
          />
          <MetricCard
            title="Margen"
            value={
              data.margin_pct != null
                ? formatPercent(data.margin_pct / 100, 1)
                : "—"
            }
            subtitle={`${formatUSD(data.margin_usd_month)}`}
            tone={marginTone}
            icon="trending_up"
          />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
          Estado
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Cupones activos"
            value={formatNumber(data.active_coupons)}
            icon="local_offer"
          />
        </div>
      </section>
    </div>
  );
}
