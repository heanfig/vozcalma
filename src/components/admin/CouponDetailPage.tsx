import { useEffect, useState } from "react";
import CouponForm, { type CouponFormValue } from "./CouponForm";
import { formatCOP, formatDate } from "../../lib/format";

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

interface Redemption {
  id: string;
  session_id: string | null;
  redeemed_at: string;
  discount_cents_applied: number;
}

export default function CouponDetailPage({ code }: { code: string }) {
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  async function load() {
    try {
      const [cRes, rRes] = await Promise.all([
        fetch(`/api/admin/coupons/${encodeURIComponent(code)}`),
        fetch(`/api/admin/coupons/${encodeURIComponent(code)}/redemptions`),
      ]);
      const cBody = await cRes.json();
      const rBody = await rRes.json();
      if (!cRes.ok) {
        setError(cBody.error || "Error");
        return;
      }
      setCoupon(cBody.coupon);
      setRedemptions(rBody.redemptions || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
  }

  useEffect(() => {
    void load();
  }, [code]);

  async function handleUpdate(v: CouponFormValue) {
    const { code: _c, ...patch } = v;
    const res = await fetch(`/api/admin/coupons/${encodeURIComponent(code)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || "Error");
    setSaveMsg("Guardado");
    setTimeout(() => setSaveMsg(null), 2000);
    await load();
  }

  if (error)
    return (
      <div className="rounded-md bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
        {error}
      </div>
    );
  if (!coupon) return <div className="text-slate-500">Cargando…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <a
          href="/admin/coupons"
          className="text-sm text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
        >
          ← Cupones
        </a>
        <code className="text-lg font-mono font-semibold">{coupon.code}</code>
        {coupon.is_active ? (
          <span className="rounded-full px-2 py-0.5 text-xs bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
            Activo
          </span>
        ) : (
          <span className="rounded-full px-2 py-0.5 text-xs bg-slate-100 dark:bg-slate-800">
            Inactivo
          </span>
        )}
      </div>

      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
        <h3 className="text-sm font-semibold mb-4">Editar</h3>
        {saveMsg && (
          <div className="mb-3 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
            {saveMsg}
          </div>
        )}
        <CouponForm
          lockCode
          submitLabel="Guardar cambios"
          initial={{
            code: coupon.code,
            description: coupon.description || "",
            discount_type: coupon.discount_type,
            discount_value: coupon.discount_value,
            max_uses: coupon.max_uses,
            valid_until: coupon.valid_until,
            is_active: coupon.is_active,
            notes: coupon.notes || "",
          }}
          onSubmit={handleUpdate}
        />
      </section>

      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
        <h3 className="text-sm font-semibold mb-3">
          Redenciones ({redemptions.length})
        </h3>
        {redemptions.length === 0 ? (
          <p className="text-sm text-slate-500">Sin redenciones aún.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="px-3 py-2 text-left text-xs uppercase">Fecha</th>
                  <th className="px-3 py-2 text-left text-xs uppercase">Sesión</th>
                  <th className="px-3 py-2 text-right text-xs uppercase">Descuento</th>
                </tr>
              </thead>
              <tbody>
                {redemptions.map((r) => (
                  <tr
                    key={r.id}
                    className="border-t border-slate-100 dark:border-slate-800"
                  >
                    <td className="px-3 py-2">{formatDate(r.redeemed_at)}</td>
                    <td className="px-3 py-2">
                      {r.session_id ? (
                        <a
                          href={`/admin/sessions/${r.session_id}`}
                          className="font-mono text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          {r.session_id.slice(0, 8)}…
                        </a>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {formatCOP(r.discount_cents_applied)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
