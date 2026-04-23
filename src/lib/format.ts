/**
 * Formatters para UI admin (compartibles entre server y cliente).
 */

export function formatCOP(cents: number | null | undefined): string {
  if (cents == null || !Number.isFinite(cents)) return "—";
  const pesos = Math.round(cents / 100);
  return `$${pesos.toLocaleString("es-CO")} COP`;
}

export function formatUSD(
  amount: number | null | undefined,
  opts?: { minFraction?: number; maxFraction?: number },
): string {
  if (amount == null || !Number.isFinite(amount)) return "—";
  const min = opts?.minFraction ?? 2;
  const max = opts?.maxFraction ?? 4;
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: min,
    maximumFractionDigits: max,
  });
}

export function formatPercent(
  ratio: number | null | undefined,
  fractionDigits = 1,
): string {
  if (ratio == null || !Number.isFinite(ratio)) return "—";
  return `${(ratio * 100).toFixed(fractionDigits)}%`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("es-CO", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const t = new Date(iso).getTime();
    const diffSec = Math.round((Date.now() - t) / 1000);
    if (diffSec < 60) return "hace unos segundos";
    if (diffSec < 3600) return `hace ${Math.floor(diffSec / 60)} min`;
    if (diffSec < 86400) return `hace ${Math.floor(diffSec / 3600)} h`;
    return `hace ${Math.floor(diffSec / 86400)} días`;
  } catch {
    return iso;
  }
}

export function formatNumber(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toLocaleString("es-CO");
}
