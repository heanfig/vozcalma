import { motion } from "framer-motion";
import type { OnboardingType } from "./onboarding-data";

interface Props {
  answers: Record<string, string>;
  chosenType: OnboardingType;
  onConfirm: () => void;
  onBack: () => void;
}

const LABELS: Record<string, string> = {
  nombre: "Nombre",
  emocion: "Emoción",
  intensidad: "Intensidad",
  pensamiento: "Pensamiento",
  necesidad: "Necesidad",
  contextoPersonal: "Tu historia",
  areaVida: "Área de vida",
  sonidosEntorno: "Sonidos del entorno",
  visionIdeal: "Visión ideal",
  dialogoInterno: "Diálogo interno",
  situacionIdeal: "Situación ideal",
  creenciasNuevas: "Nuevas creencias",
};

export default function ConfirmationStep({
  answers,
  chosenType,
  onConfirm,
  onBack,
}: Props) {
  const entries = Object.entries(answers).filter(([, v]) => v.trim());

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 22 }}
      className="min-h-screen bg-surface text-on-surface flex flex-col items-center px-4 py-12 overflow-y-auto"
    >
      <div className="max-w-xl w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-full bg-primary-fixed flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-3xl text-primary">
              auto_awesome
            </span>
          </div>
          <h1 className="font-headline text-2xl md:text-4xl text-on-surface tracking-tight">
            Tu sesión está lista para crearse
          </h1>
          <p className="text-on-surface-variant font-body text-sm md:text-base opacity-80">
            Revisa tus respuestas antes de generar tu{" "}
            {chosenType === "quick" ? "alivio rápido" : "reprogramación profunda"}
          </p>
        </div>

        {/* Answers summary */}
        <motion.div
          className="bg-surface-container-low rounded-3xl p-6 md:p-8 space-y-4"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          {entries.map(([key, value]) => (
            <div key={key} className="space-y-1">
              <p className="text-xs font-label uppercase tracking-widest text-on-surface-variant/60">
                {LABELS[key] || key}
              </p>
              <p className="font-body text-on-surface text-sm md:text-base leading-relaxed">
                {value.length > 200 ? value.slice(0, 200) + "..." : value}
              </p>
            </div>
          ))}
        </motion.div>

        {/* Actions */}
        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
        >
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-6 py-3 rounded-full font-label text-sm text-on-surface-variant hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            Volver a revisar
          </button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onConfirm}
            className="flex items-center gap-3 bg-primary text-on-primary px-8 py-4 rounded-full font-label font-medium text-base hover:opacity-90 transition-all shadow-xl shadow-primary/15"
          >
            <span>Generar mi meditación</span>
            <span className="material-symbols-outlined text-xl">arrow_forward</span>
          </motion.button>
        </motion.div>
      </div>
    </motion.div>
  );
}
