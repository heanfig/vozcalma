import { useEffect, useState } from "react";
import DataTable, { Pagination, type Column } from "./DataTable";
import DateRangeFilter, { type DateRange } from "./DateRangeFilter";
import { formatCOP, formatDate } from "../../lib/format";

interface Payment {
  id: string;
  type: "quick" | "deep";
  is_paid: boolean;
  payment_provider: string | null;
  payment_reference: string | null;
  payment_transaction_id: string | null;
  amount_cents: number | null;
  currency: string | null;
  paid_at: string | null;
  coupon_code: string | null;
  discount_cents: number | null;
  created_at: string;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [status, setStatus] = useState<"all" | "paid" | "pending">("all");
  const [range, setRange] = useState<DateRange>({ since: null, until: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const limit = 25;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set("limit", String(limit));
      params.set("offset", String(offset));
      if (status !== "all") params.set("status", status);
      if (range.since) params.set("since", range.since);
      if (range.until) params.set("until", range.until);
      try {
        const res = await fetch(`/api/admin/payments?${params.toString()}`);
        const body = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(body.error || "Error");
          return;
        }
        setPayments(body.payments || []);
        setTotal(body.total || 0);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [offset, status, range]);

  const columns: Column<Payment>[] = [
    {
      key: "created_at",
      header: "Fecha",
      render: (r) => formatDate(r.created_at),
    },
    {
      key: "status",
      header: "Estado",
      render: (r) =>
        r.is_paid ? (
          <span className="rounded-full px-2 py-0.5 text-xs bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
            Pagado
          </span>
        ) : (
          <span className="rounded-full px-2 py-0.5 text-xs bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300">
            Pendiente
          </span>
        ),
    },
    {
      key: "type",
      header: "Tipo",
      render: (r) => r.type,
    },
    {
      key: "amount",
      header: "Monto",
      render: (r) => formatCOP(r.amount_cents || 0),
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
      key: "ref",
      header: "Referencia",
      render: (r) => (
        <code className="text-xs text-slate-500 font-mono truncate max-w-[180px] inline-block">
          {r.payment_reference}
        </code>
      ),
    },
    {
      key: "tx",
      header: "Tx ID",
      render: (r) => (
        <code className="text-xs text-slate-500 font-mono truncate max-w-[160px] inline-block">
          {r.payment_transaction_id || "—"}
        </code>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as "all" | "paid" | "pending");
            setOffset(0);
          }}
          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
        >
          <option value="all">Todos</option>
          <option value="paid">Pagados</option>
          <option value="pending">Pendientes</option>
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
        rows={payments}
        rowKey={(r) => r.id}
        loading={loading}
        onRowClick={(r) => (window.location.href = `/admin/sessions/${r.id}`)}
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
