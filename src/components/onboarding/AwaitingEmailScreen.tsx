import { motion } from "framer-motion";

interface Props {
  email: string;
  userName: string;
  onStartAnother?: () => void;
}

export default function AwaitingEmailScreen({
  email,
  userName,
  onStartAnother,
}: Props) {
  const safeName = userName?.trim() || "";

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="relative w-full min-h-screen flex flex-col items-center justify-center gradient-canvas px-6"
    >
      {/* Background blurs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-tertiary/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center max-w-md w-full">
        {/* Icon */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 18 }}
          className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-primary-fixed flex items-center justify-center mb-8 shadow-lg shadow-primary/15"
        >
          <span className="material-symbols-outlined text-5xl text-primary">
            mark_email_read
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="font-headline text-2xl md:text-4xl text-on-surface font-medium tracking-tight mb-4"
        >
          {safeName ? `Gracias, ${safeName}` : "Gracias"}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.85 }}
          transition={{ delay: 0.4 }}
          className="font-body text-on-surface-variant text-base md:text-lg leading-relaxed mb-2"
        >
          Estamos creando tu meditación con todo el detalle que mereces.
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          transition={{ delay: 0.5 }}
          className="font-body text-on-surface-variant text-sm md:text-base mb-10"
        >
          En unos minutos llegará a{" "}
          <span className="font-semibold text-primary">{email}</span>{" "}
          un enlace para escucharla.
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="bg-surface-container-low rounded-2xl p-4 md:p-5 text-left max-w-sm"
        >
          <p className="text-xs font-label uppercase tracking-widest text-on-surface-variant/60 mb-2">
            Mientras esperas
          </p>
          <ul className="space-y-2 text-sm text-on-surface-variant">
            <li className="flex items-start gap-2">
              <span className="material-symbols-outlined text-base text-tertiary mt-0.5">check_circle</span>
              <span>Busca un lugar tranquilo donde puedas escuchar sin interrupciones</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="material-symbols-outlined text-base text-tertiary mt-0.5">check_circle</span>
              <span>Ten a mano tus audífonos para una experiencia más inmersiva</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="material-symbols-outlined text-base text-tertiary mt-0.5">check_circle</span>
              <span>Revisa tu carpeta de spam si no lo ves en la bandeja principal</span>
            </li>
          </ul>
        </motion.div>

        {onStartAnother && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            onClick={onStartAnother}
            className="mt-10 flex items-center gap-2 text-sm font-label text-on-surface-variant hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-lg">refresh</span>
            <span>Generar otra meditación</span>
          </motion.button>
        )}
      </div>
    </motion.main>
  );
}
