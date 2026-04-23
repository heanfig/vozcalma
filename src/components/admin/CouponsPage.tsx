import { useEffect, useState } from "react";
import DataTable, { type Column } from "./DataTable";
import CouponForm, { type CouponFormValue } from "./CouponForm";
import { formatDate, formatNumber } from "../../lib/format";

interface Coupon {
  code: string;
  description: string | null;
  discount_type: "full" | "percent" | "fixed";
  discount_value: number;
  max_uses: number | null;
  redemption_count: number;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
  notes: string | null;
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/coupons");
      const body = await res.json();
      if (!res.ok) {
        setError(body.error || "Error");
        return;
      }
      setCoupons(body.coupons || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleCreate(v: CouponFormValue) {
    const res = await fetch("/api/admin/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(v),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || "Error");
    setShowCreate(false);
    await load();
  }

  async function toggle(code: string) {
    const res = await fetch(`/api/admin/coupons/${encodeURIComponent(code)}/toggle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Error al togglear");
      return;
    }
    await load();
  }

  const columns: Column<Coupon>[] = [
    {
      key: "code",
      header: "Código",
      render: (r) => (
        <a
          href={`/admin/coupons/${encodeURIComponent(r.code)}`}
          className="font-mono font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          {r.code}
        </a>
      ),
    },
    {
      key: "description",
      header: "Descripción",
      render: (r) => r.description || <span className="text-slate-400">—</span>,
    },
    {
      key: "type",
      header: "Tipo",
      render: (r) => (
        <span className="text-xs">
          {r.discount_type === "full"
            ? "100% gratis"
            : r.discount_type === "percent"
            ? `${r.discount_value}% off`
            : `${r.discount_value} cents off`}
        </span>
      ),
    },
    {
      key: "uses",
      header: "Usos",
      render: (r) => (
        <span>
          {formatNumber(r.redemption_count)}
          {r.max_uses != null ? ` / ${r.max_uses}` : ""}
        </span>
      ),
    },
    {
      key: "valid",
      header: "Válido hasta",
      render: (r) =>
        r.valid_until ? formatDate(r.valid_until) : <span className="text-slate-400">sin límite</span>,
    },
    {
      key: "status",
      header: "Estado",
      render: (r) =>
        r.is_active ? (
          <span className="rounded-full px-2 py-0.5 text-xs bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
            Activo
          </span>
        ) : (
          <span className="rounded-full px-2 py-0.5 text-xs bg-slate-100 dark:bg-slate-800 text-slate-500">
            Inactivo
          </span>
        ),
    },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            void toggle(r.code);
          }}
          className="text-xs rounded-md border border-slate-200 dark:border-slate-700 px-2 py-1 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          {r.is_active ? "Desactivar" : "Activar"}
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-sm text-slate-500 dark:text-slate-400">
          {coupons.length} cupones
        </div>
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-sm font-medium"
        >
          {showCreate ? "Cancelar" : "+ Nuevo cupón"}
        </button>
      </div>

      {showCreate && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
          <h3 className="text-sm font-semibold mb-4">Crear cupón</h3>
          <CouponForm onSubmit={handleCreate} />
        </div>
      )}

      {error && (
        <div className="rounded-md bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      <DataTable
        columns={columns}
        rows={coupons}
        rowKey={(r) => r.code}
        loading={loading}
      />
    </div>
  );
}
