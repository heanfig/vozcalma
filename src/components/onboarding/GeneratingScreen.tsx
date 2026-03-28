import { motion } from "framer-motion";

export default function GeneratingScreen() {
  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="relative w-full min-h-screen flex flex-col items-center justify-center gradient-canvas"
    >
      {/* Background atmospheric blurs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-tertiary/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-md">
        {/* Breathing Orb */}
        <div className="relative w-48 h-48 mb-16 flex items-center justify-center">
          <div className="absolute inset-0 breathing-orb bg-primary/10 rounded-full blur-2xl" />
          <div className="w-32 h-32 bg-white/80 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(79,23,206,0.1)] backdrop-blur-sm border border-white/50">
            <div className="w-12 h-12 bg-primary/20 rounded-full breathing-orb" />
          </div>
        </div>

        <h1 className="font-headline text-3xl md:text-4xl text-on-surface font-medium tracking-tight mb-4">
          Preparando tu santuario...
        </h1>
        <p className="font-body text-on-surface-variant text-base font-light tracking-wide leading-relaxed opacity-80">
          Nuestra IA está creando una sesión única para ti.
        </p>

        {/* Indeterminate progress */}
        <div className="mt-12 w-16 h-1 bg-surface-container-highest rounded-full overflow-hidden">
          <div className="h-full bg-primary/40 w-1/3 rounded-full progress-indeterminate" />
        </div>
      </div>
    </motion.main>
  );
}
