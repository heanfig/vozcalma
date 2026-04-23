import { useState } from "react";

export interface DateRange {
  since: string | null;
  until: string | null;
}

const PRESETS: { key: string; label: string; compute: () => DateRange }[] = [
  {
    key: "all",
    label: "Todo",
    compute: () => ({ since: null, until: null }),
  },
  {
    key: "today",
    label: "Hoy",
    compute: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return { since: start.toISOString(), until: null };
    },
  },
  {
    key: "7d",
    label: "7 días",
    compute: () => {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      return { since: d.toISOString(), until: null };
    },
  },
  {
    key: "30d",
    label: "30 días",
    compute: () => {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      return { since: d.toISOString(), until: null };
    },
  },
  {
    key: "month",
    label: "Este mes",
    compute: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { since: start.toISOString(), until: null };
    },
  },
];

export default function DateRangeFilter({
  onChange,
  initialKey = "30d",
}: {
  onChange: (range: DateRange) => void;
  initialKey?: string;
}) {
  const [active, setActive] = useState(initialKey);

  function onClick(key: string) {
    const preset = PRESETS.find((p) => p.key === key);
    if (!preset) return;
    setActive(key);
    onChange(preset.compute());
  }

  return (
    <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-900">
      {PRESETS.map((p) => (
        <button
          key={p.key}
          type="button"
          onClick={() => onClick(p.key)}
          className={`px-3 py-1.5 text-xs font-medium transition-colors ${
            active === p.key
              ? "bg-indigo-600 text-white"
              : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
