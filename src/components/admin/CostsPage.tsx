import { useEffect, useState } from "react";
import MetricCard from "./MetricCard";
import DataTable, { type Column } from "./DataTable";
import DateRangeFilter, { type DateRange } from "./DateRangeFilter";
import { formatUSD, formatNumber, formatDate } from "../../lib/format";

interface SeriesPoint {
  period: string;
  generations: number;
  llm_usd: number;
  tts_usd: number;
  total_usd: number;
  pregen: number;
}

interface TopSession {
  session_id: string | null;
  total_usd: number;
  llm_usd: number;
  tts_usd: number;
  tts_chars: number | null;
  llm_total_tokens: number | null;
  created_at: string;
}

interface CostsData {
  series: SeriesPoint[];
  top_expensive: TopSession[];
  total_rows: number;
}

export default function CostsPage() {
  const [granularity, setGranularity] = useState<"day" | "month">("day");
  const [range, setRange] = useState<DateRange>({ since: null, until: null });
  const [data, setData] = useState<CostsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set("granularity", granularity);
      if (range.since) params.set("since", range.since);
      if (range.until) params.set("until", range.until);
      try {
        const res = await fetch(`/api/admin/costs?${params.toString()}`);
        const body = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(body.error || "Error");
          return;
        }
        setData(body);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [granularity, range]);

  const totals = (data?.series || []).reduce(
    (acc, p) => ({
      gens: acc.gens + p.generations,
      llm: acc.llm + p.llm_usd,
      tts: acc.tts + p.tts_usd,
      total: acc.total + p.total_usd,
      pregen: acc.pregen + p.pregen,
    }),
    { gens: 0, llm: 0, tts: 0, total: 0, pregen: 0 },
  );

  const seriesColumns: Column<SeriesPoint>[] = [
    { key: "period", header: "Periodo", render: (r) => r.period },
    {
      key: "gens",
      header: "Gens",
      render: (r) => (
        <span>
          {formatNumber(r.generations)}
          {r.pregen > 0 && (
            <span className="text-xs text-slate-400 ml-1">
              ({r.pregen} pregen)
            </span>
          )}
        </span>
      ),
    },
    {
      key: "llm",
      header: "LLM USD",
      render: (r) => formatUSD(r.llm_usd),
    },
    {
      key: "tts",
      header: "TTS USD",
      render: (r) => formatUSD(r.tts_usd),
    },
    {
      key: "total",
      header: "Total",
      render: (r) => (
        <span className="font-semibold">{formatUSD(r.total_usd)}</span>
      ),
    },
    {
      key: "avg",
      header: "Avg/gen",
      render: (r) => (
        <span className="text-slate-500">
          {formatUSD(r.generations > 0 ? r.total_usd / r.generations : 0)}
        </span>
      ),
    },
  ];

  const topColumns: Column<TopSession>[] = [
    {
      key: "created",
      header: "Fecha",
      render: (r) => formatDate(r.created_at),
    },
    {
      key: "session",
      header: "Sesión",
      render: (r) =>
        r.session_id ? (
          <a
            href={`/admin/sessions/${r.session_id}`}
            className="font-mono text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            {r.session_id.slice(0, 8)}…
          </a>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
    {
      key: "tokens",
      header: "Tokens",
      render: (r) => formatNumber(r.llm_total_tokens),
    },
    {
      key: "chars",
      header: "TTS chars",
      render: (r) => formatNumber(r.tts_chars),
    },
    {
      key: "total",
      header: "Total USD",
      render: (r) => (
        <span className="font-semibold">{formatUSD(r.total_usd)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <DateRangeFilter
          initialKey="30d"
          onChange={(r) => setRange(r)}
        />
        <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-900">
          {(["day", "month"] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGranularity(g)}
              className={`px-3 py-1.5 text-xs font-medium ${
                granularity === g
                  ? "bg-indigo-600 text-white"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              Por {g === "day" ? "día" : "mes"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Generaciones"
          value={formatNumber(totals.gens)}
          subtitle={`${totals.pregen} pregen`}
        />
        <MetricCard title="LLM" value={formatUSD(totals.llm)} />
        <MetricCard title="TTS" value={formatUSD(totals.tts)} />
        <MetricCard
          title="Total"
          value={formatUSD(totals.total)}
          subtitle={`Avg ${formatUSD(totals.gens > 0 ? totals.total / totals.gens : 0)}/gen`}
        />
      </div>

      {error && (
        <div className="rounded-md bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      <section>
        <h3 className="text-sm font-semibold mb-3">Serie temporal</h3>
        <DataTable
          columns={seriesColumns}
          rows={data?.series || []}
          rowKey={(r) => r.period}
          loading={loading}
          empty="Sin datos en el rango"
        />
      </section>

      <section>
        <h3 className="text-sm font-semibold mb-3">Top 20 más caras</h3>
        <DataTable
          columns={topColumns}
          rows={data?.top_expensive || []}
          rowKey={(r) => `${r.session_id}-${r.created_at}`}
          loading={loading}
        />
      </section>
    </div>
  );
}
