import { motion, AnimatePresence } from "framer-motion";

interface Props {
  current: number;
  total: number;
  sectionLabel?: string;
}

export default function OnboardingProgress({
  current,
  total,
  sectionLabel,
}: Props) {
  const pct = ((current + 1) / total) * 100;

  return (
    <div className="fixed top-0 left-0 w-full z-50">
      <AnimatePresence mode="wait">
        {sectionLabel ? (
          <motion.p
            key={sectionLabel}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
            className="text-center text-[10px] font-label font-semibold uppercase tracking-[0.18em] text-on-surface-variant/70 pt-2 pb-1"
          >
            {sectionLabel}
          </motion.p>
        ) : null}
      </AnimatePresence>
      <div className="h-1 w-full bg-surface-container-highest/40">
        <motion.div
          className="h-full bg-primary/50 rounded-full"
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      </div>
    </div>
  );
}
