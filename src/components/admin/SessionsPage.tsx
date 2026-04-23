import { useEffect, useState } from "react";
import DataTable, { Pagination, type Column } from "./DataTable";
import DateRangeFilter, { type DateRange } from "./DateRangeFilter";
import { formatCOP, formatDate } from "../../lib/format";

interface Session {
  id: string;
  type: "quick" | "deep";
  is_paid: boolean;
  paid_at: string | null;
  amount_cents: number | null;
  currency: string | null;
  coupon_code: string | null;
  audio_url: string | null;
  created_at: string;
  intake_json: Record<string, unknown> | null;
  utm_source: string | null;
  utm_campaign: string | null;
  payment_reference: string | null;
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState("");
  const [paidFilter, setPaidFilter] = useState<"all" | "paid" | "unpaid">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "quick" | "deep">("all");
  const [range, setRange] = useState<DateRange>({ since: null, until: null });

  const limit = 25;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set("limit", String(limit));
      params.set("offset", String(offset));
      if (paidFilter !== "all")
        params.set("paid", paidFilter === "paid" ? "true" : "false");
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (search.trim()) params.set("search", search.trim());
      if (range.since) params.set("since", range.since);
      if (range.until) params.set("until", range.until);
      try {
        const res = await fetch(`/api/admin/sessions?${params.toString()}`);
        const body = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(body.error || "Error cargando sesiones");
          return;
        }
        setSessions(body.sessions || []);
        setTotal(body.total || 0);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error de red");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [offset, search, paidFilter, typeFilter, range]);

  const columns: Column<Session>[] = [
    {
      key: "created_at",
      header: "Fecha",
      render: (r) => (
        <span className="text-slate-600 dark:text-slate-300">
          {formatDate(r.created_at)}
        </span>
      ),
    },
    {
      key: "name",
      header: "Nombre",
      render: (r) => (
        <span>
          {(r.intake_json?.nombre as string) || (
            <span className="text-slate-400">—</span>
          )}
        </span>
      ),
    },
    {
      key: "type",
      header: "Tipo",
      render: (r) => (
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
            r.type === "deep"
              ? "bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300"
              : "bg-sky-100 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300"
          }`}
        >
          {r.type}
        </span>
      ),
    },
    {
      key: "paid",
      header: "Pago",
      render: (r) =>
        r.is_paid ? (
          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs">
            <span className="material-symbols-outlined text-[14px]">check_circle</span>
            {formatCOP(r.amount_cents || 0)}
          </span>
        ) : (
          <span className="text-slate-400 text-xs">—</span>
        ),
    },
    {
      key: "coupon",
      header: "Cupón",
      render: (r) =>
        r.coupon_code ? (
          <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
            {r.coupon_code}
          </code>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
    {
      key: "utm",
      header: "Fuente",
      render: (r) => (
        <span className="text-xs text-slate-500">
          {r.utm_source ? (
            <>
              {r.utm_source}
              {r.utm_campaign && ` · ${r.utm_campaign}`}
            </>
          ) : (
            "—"
          )}
        </span>
      ),
    },
    {
      key: "audio",
      header: "Audio",
      render: (r) =>
        r.audio_url ? (
          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs">
            <span className="material-symbols-outlined text-[14px]">graphic_eq</span>
            OK
          </span>
        ) : (
          <span className="text-slate-400 text-xs">no</span>
        ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="Buscar por nombre, email, cupón, referencia…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOffset(0);
          }}
          className="flex-1 min-w-[240px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
        />
        <select
          value={paidFilter}
          onChange={(e) => {
            setPaidFilter(e.target.value as "all" | "paid" | "unpaid");
            setOffset(0);
          }}
          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
        >
          <option value="all">Todos</option>
          <option value="paid">Pagados</option>
          <option value="unpaid">Sin pagar</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value as "all" | "quick" | "deep");
            setOffset(0);
          }}
          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
        >
          <option value="all">Todos los tipos</option>
          <option value="quick">Quick</option>
          <option value="deep">Deep</option>
        </select>
        <DateRangeFilter
          initialKey="all"
          onChange={(r) => {
            setRange(r);
            setOffset(0);
          }}
        />
      </div>

      {error && (
        <div className="rounded-md bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      <DataTable
        columns={columns}
        rows={sessions}
        rowKey={(r) => r.id}
        loading={loading}
        onRowClick={(r) => {
          window.location.href = `/admin/sessions/${r.id}`;
        }}
      />

      <Pagination
        total={total}
        limit={limit}
        offset={offset}
        onChange={setOffset}
      />
    </div>
  );
}
