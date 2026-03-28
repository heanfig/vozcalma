import { motion } from "framer-motion";

interface Props {
  onUnlock: () => void;
}

export default function PaymentGate({ onUnlock }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ type: "spring", stiffness: 200, damping: 24 }}
      className="min-h-screen bg-surface text-on-surface font-body flex flex-col"
    >
      {/* Header */}
      <header className="w-full sticky top-0 z-50 bg-surface">
        <div className="flex justify-between items-center px-6 py-4 w-full max-w-2xl mx-auto">
          <span className="font-headline italic font-medium text-primary">
            VozCalma
          </span>
        </div>
      </header>

      <main className="flex flex-col items-center w-full max-w-2xl mx-auto px-6 py-12 space-y-16 flex-grow">
        {/* Hero */}
        <section className="text-center space-y-6">
          <div className="relative w-full aspect-[21/9] rounded-xl overflow-hidden mb-12 diffusion-shadow bg-gradient-to-br from-primary-fixed via-surface to-tertiary-fixed" />
          <h1 className="font-headline text-4xl md:text-5xl font-bold tracking-tight text-on-surface leading-[1.1]">
            Tu sesión personalizada está lista.
          </h1>
          <p className="text-on-surface-variant text-lg max-w-lg mx-auto leading-relaxed">
            Desbloquea tu audio creado por IA diseñado específicamente para tu
            momento actual de calma.
          </p>
        </section>

        {/* Payment card */}
        <section className="w-full">
          <div className="bg-surface-container-lowest rounded-xl p-8 border border-primary/10 diffusion-shadow space-y-8 text-center">
            <div className="space-y-2">
              <h2 className="font-headline text-2xl font-semibold text-on-surface">
                Desbloquea tu sesión
              </h2>
              <p className="text-on-surface-variant">
                Acceso inmediato y permanente a esta meditación personalizada.
              </p>
            </div>

            <div className="py-4">
              <div className="text-4xl font-bold text-primary font-headline">
                $21,000 COP
              </div>
              <p className="text-xs text-on-surface-variant mt-1">
                Pago único
              </p>
            </div>

            <div className="space-y-6">
              <button
                onClick={onUnlock}
                className="w-full bg-primary text-on-primary py-5 rounded-full font-semibold text-lg hover:bg-primary-container transition-all active:scale-[0.98] duration-200 shadow-lg shadow-primary/20"
              >
                Pagar y acceder a mi sesión
              </button>
              <ul className="flex flex-col items-center gap-3 text-sm text-on-surface-variant">
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-base">
                    check_circle
                  </span>
                  Audio de alta fidelidad generado por IA
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-base">
                    check_circle
                  </span>
                  Disponible para escuchar cuando quieras
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Security badge */}
        <section className="flex flex-col items-center space-y-4 w-full pt-4">
          <div className="flex items-center gap-2 text-on-surface-variant opacity-70">
            <span className="material-symbols-outlined text-lg">lock</span>
            <span className="text-sm font-medium tracking-tight">
              Pago seguro con Stripe
            </span>
          </div>
          <div className="flex gap-4 opacity-40 grayscale">
            <div className="h-6 w-10 bg-slate-400 rounded-sm" />
            <div className="h-6 w-10 bg-slate-400 rounded-sm" />
            <div className="h-6 w-10 bg-slate-400 rounded-sm" />
          </div>
        </section>
      </main>

      <footer className="w-full mt-auto pb-8 pt-12 bg-surface-container-low">
        <div className="flex flex-col items-center gap-6 px-8 w-full max-w-2xl mx-auto">
          <p className="font-body text-[10px] leading-relaxed text-on-surface-variant/60 text-center italic border-t border-outline-variant/10 pt-6">
            VozCalma no es un sustituto de atención profesional de salud mental.
            Si estás en crisis, contacta a tu línea de emergencia local.
          </p>
        </div>
      </footer>
    </motion.div>
  );
}
