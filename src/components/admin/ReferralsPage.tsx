import { useEffect, useState } from "react";
import DataTable, { type Column } from "./DataTable";
import { formatCOP, formatNumber, formatPercent } from "../../lib/format";

interface Referral {
  utm_source: string | null;
  utm_campaign: string | null;
  total_sessions: number;
  paid_sessions: number;
  revenue_cents: number;
}

export default function ReferralsPage() {
  const [rows, setRows] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/referrals");
        const body = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(body.error || "Error");
          return;
        }
        setRows(body.referrals || []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const columns: Column<Referral>[] = [
    {
      key: "source",
      header: "UTM source",
      render: (r) => (
        <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
          {r.utm_source || "—"}
        </code>
      ),
    },
    {
      key: "campaign",
      header: "Campaign",
      render: (r) => r.utm_campaign || <span className="text-slate-400">—</span>,
    },
    {
      key: "total",
      header: "Sesiones",
      render: (r) => formatNumber(r.total_sessions),
    },
    {
      key: "paid",
      header: "Pagadas",
      render: (r) => formatNumber(r.paid_sessions),
    },
    {
      key: "conv",
      header: "Conv %",
      render: (r) =>
        r.total_sessions > 0
          ? formatPercent(r.paid_sessions / r.total_sessions, 1)
          : "—",
    },
    {
      key: "revenue",
      header: "Revenue",
      render: (r) => formatCOP(r.revenue_cents),
    },
  ];

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => `${r.utm_source}-${r.utm_campaign}`}
        loading={loading}
        empty="Sin sesiones con UTM aún"
      />
    </div>
  );
}
