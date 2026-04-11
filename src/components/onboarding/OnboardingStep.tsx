import { useState } from "react";
import { motion } from "framer-motion";
import type { OnboardingStepDef, RichSelectOption } from "./onboarding-data";
import MultiSelectStep from "./MultiSelectStep";

interface Props {
  step: OnboardingStepDef;
  value: string;
  onAnswer: (value: string) => void;
  onBack?: () => void;
  direction: number;
}

const slideVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 100 : -100,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({
    x: dir > 0 ? -100 : 100,
    opacity: 0,
  }),
};

const childFade = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0 },
};

function appendSuggestion(current: string, suggestion: string) {
  const t = current.trim();
  if (!t) return suggestion;
  if (t.includes(suggestion)) return t;
  return `${t}, ${suggestion}`;
}

function CharCounter({ current, max }: { current: number; max: number }) {
  const pct = current / max;
  const color =
    pct >= 1 ? "text-error" : pct >= 0.85 ? "text-orange-500" : "text-on-surface-variant/50";
  return (
    <p className={`text-right text-xs font-label tabular-nums ${color}`}>
      {current}/{max}
    </p>
  );
}

function BentoSelect({
  options,
  value,
  onAnswer,
  grid,
}: {
  options: RichSelectOption[];
  value: string;
  onAnswer: (v: string) => void;
  grid: "area" | "sounds";
}) {
  const gridClass =
    grid === "area"
      ? "grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 auto-rows-fr"
      : "grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 auto-rows-fr";

  return (
    <motion.div
      className={`${gridClass} w-full mx-auto`}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.08, delayChildren: 0.06 } },
      }}
    >
      {options.map((opt) => {
        const isSelected = value === opt.value;
        const span = opt.wide === true ? "md:col-span-2" : "";
        const featured = opt.featured === true;
        return (
          <motion.button
            key={opt.value}
            type="button"
            variants={childFade}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onAnswer(opt.value)}
            className={[
              "group relative flex flex-col text-left rounded-[1.75rem] p-6 md:p-8 transition-shadow duration-500",
              span,
              featured
                ? "bg-primary text-on-primary shadow-xl shadow-primary/15 md:min-h-[140px]"
                : "bg-surface-container-low hover:bg-surface-container-lowest hover:shadow-lg",
              isSelected && !featured ? "ring-2 ring-primary ring-offset-2 ring-offset-surface" : "",
              isSelected && featured ? "ring-2 ring-on-primary/30" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <div className="flex justify-between items-start gap-3 mb-4">
              <div
                className={[
                  "w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center shrink-0 transition-shadow",
                  featured
                    ? "bg-on-primary/15"
                    : "bg-white shadow-sm group-hover:shadow-md",
                ].join(" ")}
              >
                {opt.icon && (
                  <span
                    className={[
                      "material-symbols-outlined text-2xl md:text-3xl",
                      featured ? "text-on-primary" : "text-primary",
                    ].join(" ")}
                    style={
                      opt.icon === "favorite"
                        ? { fontVariationSettings: "'FILL' 1" }
                        : undefined
                    }
                  >
                    {opt.icon}
                  </span>
                )}
              </div>
              <span
                className={[
                  "material-symbols-outlined text-outline-variant transition-opacity text-xl",
                  isSelected ? "opacity-100 text-primary" : "opacity-0 group-hover:opacity-70",
                  featured && isSelected ? "!text-on-primary opacity-100" : "",
                ].join(" ")}
              >
                check_circle
              </span>
            </div>
            <div>
              <h3
                className={[
                  "font-headline text-xl md:text-2xl tracking-tight mb-1",
                  featured ? "text-on-primary" : "text-on-surface italic",
                ].join(" ")}
              >
                {opt.value}
              </h3>
              {opt.description && (
                <p
                  className={[
                    "text-sm leading-relaxed font-light",
                    featured ? "text-on-primary/85" : "text-on-surface-variant",
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
  );
}

export default function OnboardingStep({
  step,
  value,
  onAnswer,
  onBack,
  direction,
}: Props) {
  const [text, setText] = useState(value);

  const maxLen = step.maxLength ?? (step.inputType === "textarea" ? 500 : 50);
  const isOverLimit = text.length > maxLen;

  const handleTextChange = (val: string) => {
    if (val.length <= maxLen) setText(val);
  };

  const handleSubmitText = () => {
    const trimmed = text.trim();
    if (trimmed && !isOverLimit) onAnswer(trimmed);
  };

  const wideLayout =
    step.selectLayout === "bento" || step.inputType === "textarea";

  const isBentoSelect =
    step.inputType === "select" &&
    step.selectLayout === "bento" &&
    step.richOptions?.length;

  const headlineItalic = Boolean(step.eyebrow);

  return (
    <motion.section
      key={step.key}
      custom={direction}
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ type: "spring", stiffness: 280, damping: 30 }}
      className={[
        "w-full text-center space-y-5 md:space-y-10 relative z-10 px-1",
        wideLayout ? "max-w-4xl" : "max-w-2xl",
      ].join(" ")}
    >
      {onBack && (
        <motion.button
          type="button"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          onClick={onBack}
          className="self-start flex items-center gap-1 text-on-surface-variant/60 hover:text-primary transition-colors font-label text-sm"
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          <span>Atrás</span>
        </motion.button>
      )}

      <motion.div
        className="space-y-3 md:space-y-5"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        {step.eyebrow && (
          <p className="text-tertiary font-label font-medium tracking-[0.2em] text-[10px] md:text-xs uppercase">
            {step.eyebrow}
          </p>
        )}
        <h1
          className={[
            "font-headline text-2xl sm:text-3xl md:text-5xl text-on-surface leading-tight tracking-tight",
            headlineItalic ? "italic font-light" : "",
          ].join(" ")}
        >
          {step.question}
        </h1>
        {step.subtitle && (
          <p className="text-on-surface-variant font-body text-base md:text-lg opacity-80 max-w-xl mx-auto leading-relaxed">
            {step.subtitle}
          </p>
        )}
      </motion.div>

      {step.inputType === "text" && (
        <div className="relative group max-w-md mx-auto">
          <input
            className="w-full bg-surface-container-low border-none rounded-2xl py-4 md:py-6 px-6 md:px-8 text-xl md:text-2xl font-body text-on-surface placeholder:text-on-surface-variant/30 focus:ring-2 focus:ring-primary-fixed transition-all duration-500 text-center shadow-sm"
            placeholder={step.placeholder || ""}
            type="text"
            value={text}
            maxLength={maxLen}
            onChange={(e) => handleTextChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmitText();
            }}
            autoFocus
          />
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-primary/10 blur-md opacity-0 group-focus-within:opacity-100 transition-opacity" />

          <div className="mt-2 px-2">
            <CharCounter current={text.length} max={maxLen} />
          </div>

          <div className="flex justify-center mt-4 md:mt-8">
            <motion.button
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleSubmitText}
              disabled={!text.trim() || isOverLimit}
              className="flex items-center space-x-3 bg-primary text-on-primary px-8 py-4 rounded-full font-label font-medium text-lg hover:opacity-90 transition-all duration-300 shadow-xl shadow-primary/10 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>Continuar</span>
              <span className="material-symbols-outlined text-xl">
                arrow_forward
              </span>
            </motion.button>
          </div>
        </div>
      )}

      {step.inputType === "textarea" && (
        <motion.div
          className="w-full max-w-2xl mx-auto space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.5 }}
        >
          {step.textareaVariant === "quote" ? (
            <div className="relative w-full group">
              <span className="material-symbols-outlined absolute -top-4 -left-2 md:-left-6 text-6xl md:text-8xl text-primary/10 select-none pointer-events-none">
                format_quote
              </span>
              <div className="glass-panel rounded-[2rem] p-8 md:p-12 diffusion-shadow transition-shadow duration-500 group-focus-within:shadow-lg border border-outline-variant/10">
                <textarea
                  className="w-full border-none bg-transparent font-headline text-2xl md:text-3xl text-primary focus:ring-0 placeholder:text-outline-variant placeholder:italic resize-none text-center leading-relaxed min-h-[8rem]"
                  placeholder={step.placeholder || ""}
                  rows={step.minRows ?? 5}
                  maxLength={maxLen}
                  value={text}
                  onChange={(e) => handleTextChange(e.target.value)}
                  autoFocus
                />
              </div>
              <span className="material-symbols-outlined absolute -bottom-4 -right-2 md:-right-6 text-6xl md:text-8xl text-primary/10 rotate-180 select-none pointer-events-none">
                format_quote
              </span>
              <div className="mt-2 px-2">
                <CharCounter current={text.length} max={maxLen} />
              </div>
            </div>
          ) : step.textareaVariant === "centered" ? (
            <div className="relative w-full group">
              <textarea
                className="w-full bg-transparent border-none text-center font-headline text-xl md:text-2xl placeholder:text-surface-variant text-on-surface resize-none py-4 focus:ring-0 focus:outline-none min-h-[7rem]"
                placeholder={step.placeholder || ""}
                rows={step.minRows ?? 5}
                maxLength={maxLen}
                value={text}
                onChange={(e) => handleTextChange(e.target.value)}
                autoFocus
              />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-px w-24 bg-primary/25 group-focus-within:w-full group-focus-within:bg-primary/45 transition-all duration-700" />
              <div className="mt-2 px-2">
                <CharCounter current={text.length} max={maxLen} />
              </div>
            </div>
          ) : (
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/15 via-primary/5 to-primary/15 rounded-[2rem] blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-700 pointer-events-none" />
              <textarea
                className="w-full min-h-[12rem] p-6 md:p-8 glass-panel border border-outline-variant/10 rounded-[2rem] text-lg md:text-xl font-body font-light leading-relaxed placeholder:text-on-surface-variant/45 focus:ring-0 focus:outline-none text-on-surface relative z-10 shadow-sm resize-none"
                placeholder={step.placeholder || ""}
                rows={step.minRows ?? 6}
                maxLength={maxLen}
                value={text}
                onChange={(e) => handleTextChange(e.target.value)}
                autoFocus
              />
              <div className="mt-2 px-2 relative z-10">
                <CharCounter current={text.length} max={maxLen} />
              </div>
            </div>
          )}

          {step.suggestions && step.suggestions.length > 0 && (
            <motion.div
              className="flex gap-2 flex-wrap justify-center"
              initial="hidden"
              animate="visible"
              variants={{
                visible: { transition: { staggerChildren: 0.06 } },
              }}
            >
              {step.suggestions.map((s) => (
                <motion.button
                  key={s}
                  type="button"
                  variants={childFade}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setText((prev) => {
                    const result = appendSuggestion(prev, s);
                    return result.length <= maxLen ? result : prev;
                  })}
                  className="px-4 py-2 rounded-full text-xs font-medium text-on-surface-variant/90 bg-surface-container-low/80 border border-outline-variant/15 hover:bg-surface-container-highest transition-colors"
                >
                  {s}
                </motion.button>
              ))}
            </motion.div>
          )}

          {step.textareaTip && (
            <div className="flex items-center justify-center gap-2 text-tertiary/70">
              <span className="material-symbols-outlined text-sm">auto_awesome</span>
              <span className="text-[11px] font-label font-medium tracking-wide">
                {step.textareaTip}
              </span>
            </div>
          )}

          {step.inspirationCards && step.inspirationCards.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left pt-2">
              {step.inspirationCards.map((card, i) => (
                <motion.div
                  key={card.title}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.08 }}
                  className="p-6 rounded-2xl bg-surface-container-low/50 border border-white/50 flex flex-col gap-3"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-xl">
                      {card.icon || "lightbulb"}
                    </span>
                  </div>
                  <h3 className="font-headline italic text-lg text-on-surface">
                    {card.title}
                  </h3>
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    {card.body}
                  </p>
                </motion.div>
              ))}
            </div>
          )}

          <div className="flex justify-center pt-2">
            <motion.button
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleSubmitText}
              disabled={!text.trim() || isOverLimit}
              className="flex items-center space-x-3 bg-primary text-on-primary px-8 py-4 rounded-full font-label font-medium text-lg hover:opacity-90 transition-all duration-300 shadow-xl shadow-primary/10 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>Continuar</span>
              <span className="material-symbols-outlined text-xl">
                arrow_forward
              </span>
            </motion.button>
          </div>
        </motion.div>
      )}

      {step.inputType === "select" && isBentoSelect && (
        <BentoSelect
          options={step.richOptions!}
          value={value}
          onAnswer={onAnswer}
          grid={step.key === "areaVida" ? "area" : "sounds"}
        />
      )}

      {step.inputType === "multi-select" && step.richOptions && (
        <MultiSelectStep
          options={step.richOptions}
          value={value}
          onAnswer={onAnswer}
          minSelections={step.minSelections ?? 1}
          maxSelections={step.maxSelections}
        />
      )}

      {step.inputType === "select" && !isBentoSelect && (
        <motion.div
          className="grid gap-4 max-w-md mx-auto"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.06 } },
          }}
        >
          {step.options?.map((opt) => (
            <motion.button
              key={opt}
              type="button"
              variants={{
                hidden: { opacity: 0, y: 16 },
                visible: { opacity: 1, y: 0 },
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onAnswer(opt)}
              className={`w-full py-3.5 md:py-5 px-6 rounded-2xl font-body text-base md:text-lg transition-all duration-300 ${
                value === opt
                  ? "bg-primary text-on-primary shadow-lg shadow-primary/20"
                  : "bg-surface-container-low text-on-surface hover:bg-surface-container-high active:scale-[0.98]"
              }`}
            >
              {opt}
            </motion.button>
          ))}
        </motion.div>
      )}
    </motion.section>
  );
}
