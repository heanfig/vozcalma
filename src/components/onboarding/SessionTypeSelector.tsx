import { motion } from "framer-motion";
import type { OnboardingType } from "./onboarding-data";
import { CARD_QUICK_IMG, CARD_DEEP_IMG } from "./session-visuals";

interface Props {
  userName: string;
  onSelect: (type: OnboardingType) => void;
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 200, damping: 22 } },
};

export default function SessionTypeSelector({ userName, onSelect }: Props) {
  const safeName = userName?.trim() || "";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="h-[100dvh] max-h-[100dvh] bg-surface text-on-surface flex flex-col selection:bg-primary-fixed overflow-x-hidden overflow-y-auto overscroll-y-contain"
    >
      <main className="flex-1 flex flex-col items-center justify-start md:justify-center px-3 sm:px-6 py-3 sm:py-6 md:py-16 max-w-6xl mx-auto w-full min-h-0">
        {/* Hero */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 24 }}
          className="text-center mb-2 sm:mb-4 md:mb-12 space-y-1.5 sm:space-y-3 md:space-y-4 shrink-0"
        >
          <h1 className="font-headline text-[1.35rem] leading-tight sm:text-3xl md:text-5xl lg:text-6xl text-on-surface tracking-tight">
            {safeName ? (
              <>
                Hola, <span className="italic text-primary">{safeName}</span>.
                <br />
                ¿Qué necesita tu interior hoy?
              </>
            ) : (
              <>
                ¿Qué necesita tu <span className="italic text-primary">interior</span> hoy?
              </>
            )}
          </h1>
          <p className="font-body text-on-surface-variant text-sm sm:text-base md:text-lg tracking-wide opacity-80">
            Elige el ritmo de tu práctica. Desde una pausa breve hasta una transformación consciente.
          </p>
        </motion.header>

        {/* Cards grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-4 md:gap-8 w-full min-h-0 flex-1 md:flex-none md:min-h-0 content-start"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Alivio Rápido */}
          <motion.button
            variants={cardVariants}
            whileHover={{ y: -8 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect("quick")}
            className="group relative flex flex-col text-left outline-none"
          >
            <div className="absolute inset-0 bg-primary/5 rounded-[2.5rem] blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="relative overflow-hidden h-[min(20vh,8rem)] sm:h-[min(22vh,9rem)] md:h-auto md:aspect-[3/2] md:min-h-[220px] rounded-xl sm:rounded-[1.5rem] md:rounded-[2rem] bg-surface-container-low flex flex-col">
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent z-10" />
              <img
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                src={CARD_QUICK_IMG}
                alt="Suaves ondas de agua con luz púrpura matutina"
              />
              <div className="mt-auto p-3 sm:p-5 md:p-8 relative z-20">
                <span className="inline-block px-2.5 py-1 sm:px-4 sm:py-1.5 bg-white/20 backdrop-blur-md text-white rounded-full text-[10px] sm:text-xs font-semibold tracking-widest uppercase mb-1.5 sm:mb-4">
                  Inmediato
                </span>
                <h2 className="font-headline text-lg sm:text-2xl md:text-3xl text-white mb-0.5 sm:mb-1">
                  Alivio Rápido
                </h2>
                <p className="font-body italic text-white/80 text-xs sm:text-sm mb-1 sm:mb-3">
                  $13.000 COP
                </p>
                <p className="font-body text-white/85 text-xs sm:text-sm leading-snug sm:leading-relaxed max-w-xs line-clamp-3 sm:line-clamp-none">
                  Para calmar tu mente en minutos. Audios cortos para ansiedad o saturación inmediata.
                </p>
              </div>
            </div>
            <div className="mt-2 sm:mt-4 md:mt-6 flex items-center gap-2 sm:gap-3 px-1 sm:px-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary-fixed flex items-center justify-center text-primary transition-colors group-hover:bg-primary group-hover:text-on-primary shrink-0">
                <span
                  className="material-symbols-outlined"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  play_arrow
                </span>
              </div>
              <span className="font-semibold text-xs sm:text-sm tracking-wide text-on-surface-variant text-left">
                Comenzar ahora
              </span>
            </div>
          </motion.button>

          {/* Reprogramación Profunda */}
          <motion.button
            variants={cardVariants}
            whileHover={{ y: -8 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect("deep")}
            className="group relative flex flex-col text-left outline-none"
          >
            <div className="absolute inset-0 bg-tertiary/5 rounded-[2.5rem] blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="relative overflow-hidden h-[min(20vh,8rem)] sm:h-[min(22vh,9rem)] md:h-auto md:aspect-[3/2] md:min-h-[220px] rounded-xl sm:rounded-[1.5rem] md:rounded-[2rem] bg-surface-container-low flex flex-col">
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent z-10" />
              <img
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                src={CARD_DEEP_IMG}
                alt="Bosque atmosférico al amanecer con neblina entre pinos"
              />
              <div className="mt-auto p-3 sm:p-5 md:p-8 relative z-20">
                <span className="inline-block px-2.5 py-1 sm:px-4 sm:py-1.5 bg-white/20 backdrop-blur-md text-white rounded-full text-[10px] sm:text-xs font-semibold tracking-widest uppercase mb-1.5 sm:mb-4">
                  Inmersivo
                </span>
                <h2 className="font-headline text-lg sm:text-2xl md:text-3xl text-white mb-0.5 sm:mb-1">
                  Reprogramación Profunda
                </h2>
                <p className="font-body italic text-white/80 text-xs sm:text-sm mb-1 sm:mb-3">
                  $26.000 COP
                </p>
                <p className="font-body text-white/85 text-xs sm:text-sm leading-snug sm:leading-relaxed max-w-xs line-clamp-3 sm:line-clamp-none">
                  Para transformar tus patrones internos. Un viaje inmersivo para reconstruir tu identidad.
                </p>
              </div>
            </div>
            <div className="mt-2 sm:mt-4 md:mt-6 flex items-center gap-2 sm:gap-3 px-1 sm:px-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-tertiary-fixed flex items-center justify-center text-tertiary transition-colors group-hover:bg-tertiary group-hover:text-on-tertiary shrink-0">
                <span
                  className="material-symbols-outlined"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  self_improvement
                </span>
              </div>
              <span className="font-semibold text-xs sm:text-sm tracking-wide text-on-surface-variant text-left">
                Iniciar viaje
              </span>
            </div>
          </motion.button>
        </motion.div>

        {/* Quote — hidden on mobile to save space */}
        <div className="mt-12 md:mt-20 w-full max-w-2xl text-center hidden md:flex flex-col items-center">
          <div className="w-12 h-[1px] bg-outline-variant/30 mb-8" />
          <p className="font-body text-on-surface-variant italic text-sm opacity-60 max-w-md">
            "La paz no es la ausencia de caos, sino la calma en medio de él."
          </p>
        </div>
      </main>
    </motion.div>
  );
}
