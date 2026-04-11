import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import type { RichSelectOption } from "./onboarding-types";

interface Props {
  options: RichSelectOption[];
  /** Valor inicial serializado como "; "-joined string */
  value: string;
  onAnswer: (value: string) => void;
  minSelections?: number;
  maxSelections?: number;
}

const childFade = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0 },
};

/**
 * Multi-select con bento grid toggleable.
 * Almacena el resultado como "; "-joined string.
 */
export default function MultiSelectStep({
  options,
  value,
  onAnswer,
  minSelections = 1,
  maxSelections,
}: Props) {
  // Parsear el valor inicial a un Set
  const [selected, setSelected] = useState<Set<string>>(() => {
    if (!value) return new Set();
    return new Set(value.split("; ").map((s) => s.trim()).filter(Boolean));
  });

  const toggle = (v: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(v)) {
        next.delete(v);
      } else {
        if (maxSelections && next.size >= maxSelections) return prev;
        next.add(v);
      }
      return next;
    });
  };

  const canContinue = selected.size >= minSelections;
  const serialized = useMemo(() => Array.from(selected).join("; "), [selected]);

  const handleContinue = () => {
    if (canContinue) onAnswer(serialized);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 auto-rows-fr"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
        }}
      >
        {options.map((opt) => {
          const isSelected = selected.has(opt.value);
          const span = opt.wide === true ? "md:col-span-2" : "";

          return (
            <motion.button
              key={opt.value}
              type="button"
              variants={childFade}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => toggle(opt.value)}
              className={[
                "group relative flex flex-col text-left rounded-[1.75rem] p-5 md:p-6 transition-all duration-300",
                span,
                isSelected
                  ? "bg-primary text-on-primary shadow-xl shadow-primary/20 ring-2 ring-primary-fixed-dim"
                  : "bg-surface-container-low hover:bg-surface-container-lowest hover:shadow-lg",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div
                  className={[
                    "w-11 h-11 md:w-12 md:h-12 rounded-full flex items-center justify-center shrink-0 transition-colors",
                    isSelected ? "bg-on-primary/15" : "bg-white shadow-sm",
                  ].join(" ")}
                >
                  {opt.icon && (
                    <span
                      className={[
                        "material-symbols-outlined text-xl md:text-2xl",
                        isSelected ? "text-on-primary" : "text-primary",
                      ].join(" ")}
                    >
                      {opt.icon}
                    </span>
                  )}
                </div>
                <span
                  className={[
                    "material-symbols-outlined text-2xl transition-all",
                    isSelected
                      ? "text-on-primary opacity-100"
                      : "text-outline-variant opacity-30 group-hover:opacity-60",
                  ].join(" ")}
                  style={isSelected ? { fontVariationSettings: "'FILL' 1" } : undefined}
                >
                  {isSelected ? "check_circle" : "radio_button_unchecked"}
                </span>
              </div>
              <div>
                <h3
                  className={[
                    "font-headline text-lg md:text-xl tracking-tight mb-1",
                    isSelected ? "text-on-primary" : "text-on-surface italic",
                  ].join(" ")}
                >
                  {opt.value}
                </h3>
                {opt.description && (
                  <p
                    className={[
                      "text-sm leading-relaxed font-light",
                      isSelected ? "text-on-primary/85" : "text-on-surface-variant",
                    ].join(" ")}
                  >
                    {opt.description}
                  </p>
                )}
              </div>
            </motion.button>
          );
        })}
      </motion.div>

      {/* Counter + continue */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex flex-col items-center gap-3"
      >
        <span className="text-xs font-label tracking-widest uppercase text-on-surface-variant/60">
          {selected.size} seleccionado{selected.size === 1 ? "" : "s"}
          {minSelections > 1 && selected.size < minSelections
            ? ` · mínimo ${minSelections}`
            : ""}
        </span>
        <motion.button
          type="button"
          whileHover={{ scale: canContinue ? 1.03 : 1 }}
          whileTap={{ scale: canContinue ? 0.97 : 1 }}
          onClick={handleContinue}
          disabled={!canContinue}
          className="flex items-center gap-3 bg-primary text-on-primary px-8 py-4 rounded-full font-label font-medium text-base hover:opacity-90 transition-all duration-300 shadow-xl shadow-primary/15 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span>Continuar</span>
          <span className="material-symbols-outlined text-xl">arrow_forward</span>
        </motion.button>
      </motion.div>
    </div>
  );
}
