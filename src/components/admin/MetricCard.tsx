import type { ReactNode } from "react";

export default function MetricCard({
  title,
  value,
  subtitle,
  icon,
  tone = "default",
}: {
  title: string;
  value: ReactNode;
  subtitle?: ReactNode;
  icon?: string;
  tone?: "default" | "positive" | "negative" | "warning";
}) {
  const toneClass =
    tone === "positive"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "negative"
      ? "text-rose-600 dark:text-rose-400"
      : tone === "warning"
      ? "text-amber-600 dark:text-amber-400"
      : "text-slate-900 dark:text-slate-100";

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 font-medium">
          {title}
        </div>
        {icon && (
          <span className="material-symbols-outlined text-slate-400 dark:text-slate-500 text-[20px]">
            {icon}
          </span>
        )}
      </div>
      <div className={`mt-2 text-2xl font-semibold ${toneClass}`}>{value}</div>
      {subtitle && (
        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {subtitle}
        </div>
      )}
    </div>
  );
}
