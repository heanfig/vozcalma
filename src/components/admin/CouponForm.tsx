import { useState, type FormEvent } from "react";

type DiscountType = "full" | "percent" | "fixed";

export interface CouponFormValue {
  code: string;
  description: string;
  discount_type: DiscountType;
  discount_value: number;
  max_uses: number | null;
  valid_until: string | null;
  is_active: boolean;
  notes: string;
}

export default function CouponForm({
  initial,
  onSubmit,
  submitLabel = "Crear cupón",
  lockCode = false,
}: {
  initial?: Partial<CouponFormValue>;
  onSubmit: (v: CouponFormValue) => Promise<void> | void;
  submitLabel?: string;
  lockCode?: boolean;
}) {
  const [code, setCode] = useState(initial?.code || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [discountType, setDiscountType] = useState<DiscountType>(
    initial?.discount_type || "full",
  );
  const [discountValue, setDiscountValue] = useState<number>(
    initial?.discount_value ?? 0,
  );
  const [maxUses, setMaxUses] = useState<string>(
    initial?.max_uses != null ? String(initial.max_uses) : "",
  );
  const [validUntil, setValidUntil] = useState<string>(
    initial?.valid_until ? initial.valid_until.slice(0, 10) : "",
  );
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [notes, setNotes] = useState(initial?.notes || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    const codeClean = code.trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,32}$/.test(codeClean)) {
      setError("Código inválido (3-32 caracteres, A-Z 0-9 _ -)");
      return;
    }
    if (discountType === "percent" && (discountValue < 0 || discountValue > 100)) {
      setError("El porcentaje debe estar entre 0 y 100");
      return;
    }
    if (discountType === "fixed" && discountValue < 0) {
      setError("El descuento fijo debe ser ≥ 0");
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        code: codeClean,
        description,
        discount_type: discountType,
        discount_value: discountValue,
        max_uses: maxUses.trim() ? parseInt(maxUses, 10) : null,
        valid_until: validUntil ? new Date(validUntil).toISOString() : null,
        is_active: isActive,
        notes,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-300 mb-1">
            Código
          </label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            disabled={lockCode}
            placeholder="PROMO2026"
            required
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono uppercase disabled:opacity-60"
          />
        </div>
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-300 mb-1">
            Descripción
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Promo lanzamiento"
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-300 mb-1">
            Tipo
          </label>
          <select
            value={discountType}
            onChange={(e) => setDiscountType(e.target.value as DiscountType)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
          >
            <option value="full">100% gratis</option>
            <option value="percent">Porcentaje</option>
            <option value="fixed">Fijo (COP cents)</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-300 mb-1">
            Valor
          </label>
          <input
            type="number"
            value={discountValue}
            onChange={(e) => setDiscountValue(Number(e.target.value))}
            min={0}
            disabled={discountType === "full"}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 disabled:opacity-60"
          />
          <p className="text-xs text-slate-500 mt-1">
            {discountType === "percent"
              ? "0 a 100"
              : discountType === "fixed"
              ? "En centavos de COP"
              : "No aplica"}
          </p>
        </div>
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-300 mb-1">
            Usos máximos
          </label>
          <input
            type="number"
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
            min={1}
            placeholder="Sin límite"
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-300 mb-1">
            Válido hasta
          </label>
          <input
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
          />
        </div>
        <div className="flex items-end">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Activo</span>
          </label>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-300 mb-1">
          Notas (internas)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
        />
      </div>

      {error && (
        <div className="rounded-md bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium px-4 py-2"
        >
          {loading ? "Guardando…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
