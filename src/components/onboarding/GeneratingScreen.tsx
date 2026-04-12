import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface Props {
  /** Timestamp de cuando inició la generación */
  startedAt?: number;
  /** Si true, salta directo al 100% */
  done?: boolean;
}

const MESSAGES = [
  "Escuchando tu historia...",
  "Eligiendo la música que te acompañará...",
  "Tejiendo palabras con intención...",
  "Grabando una voz que susurra cerca...",
  "Afinando los silencios y pausas...",
  "Mezclando sonidos con calma...",
  "Casi listo, prepárate para escuchar...",
];

export default function GeneratingScreen({
  startedAt = Date.now(),
  done = false,
}: Props) {
  const [pct, setPct] = useState(0);
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    if (done) {
      setPct(100);
      return;
    }
    // Curva logística: pct = 95 * (1 - e^(-elapsed/30))
    // Llega a ~85% en 60s, ~92% en 90s, y se asintota en 95%
    const tick = () => {
      const elapsed = (Date.now() - startedAt) / 1000;
      const target = 95 * (1 - Math.exp(-elapsed / 35));
      setPct(target);
    };
    tick();
    const interval = setInterval(tick, 300);
    return () => clearInterval(interval);
  }, [startedAt, done]);

  // Rotar mensajes cada 6 segundos
  useEffect(() => {
    if (done) return;
    const rotate = setInterval(() => {
      setMsgIdx((prev) => (prev + 1) % MESSAGES.length);
    }, 6000);
    return () => clearInterval(rotate);
  }, [done]);

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="relative w-full min-h-screen flex flex-col items-center justify-center gradient-canvas px-6"
    >
      {/* Background atmospheric blurs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-tertiary/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center max-w-md w-full">
        {/* Breathing Orb */}
        <div className="relative w-40 h-40 md:w-48 md:h-48 mb-12 flex items-center justify-center">
          <div className="absolute inset-0 breathing-orb bg-primary/10 rounded-full blur-2xl" />
          <div className="w-28 h-28 md:w-32 md:h-32 bg-white/80 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(79,23,206,0.1)] backdrop-blur-sm border border-white/50">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-primary/20 rounded-full breathing-orb" />
          </div>
        </div>

        <h1 className="font-headline text-2xl md:text-4xl text-on-surface font-medium tracking-tight mb-3">
          Preparando tu santuario...
        </h1>

        {/* Mensaje rotatorio */}
        <motion.p
          key={msgIdx}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 0.85, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="font-body text-on-surface-variant text-sm md:text-base font-light tracking-wide leading-relaxed mb-10 min-h-[1.5rem]"
        >
          {MESSAGES[msgIdx]}
        </motion.p>

        {/* Progress bar con porcentaje */}
        <div className="w-full max-w-xs">
          <div className="h-2 w-full bg-surface-container-highest/60 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary/70 to-primary rounded-full"
              initial={false}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
          <div className="flex justify-between mt-2 text-[10px] font-label uppercase tracking-[0.18em] text-on-surface-variant/60">
            <span>{Math.round(pct)}%</span>
            <span>Hasta 5 minutos</span>
          </div>
        </div>

        <p className="mt-10 text-xs text-on-surface-variant/50 max-w-xs leading-relaxed">
          Estamos creando tu meditación con mucho detalle. Gracias por tu paciencia.
        </p>
      </div>
    </motion.main>
  );
}
