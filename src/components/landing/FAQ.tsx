import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface QA {
  q: string;
  a: string;
}

const FAQ_ITEMS: QA[] = [
  {
    q: "¿Cuánto dura el audio?",
    a: "Las sesiones de Alivio Rápido duran entre 3 y 4 minutos. Las de Reprogramación Profunda, entre 6 y 8 minutos. La duración exacta depende del guion personalizado para tu situación.",
  },
  {
    q: "¿Puedo descargar mi meditación?",
    a: "Sí. Una vez generada, puedes reproducirla online o descargar el MP3 directamente desde el reproductor para escucharla offline cuando quieras.",
  },
  {
    q: "¿Cuánto tiempo guardan mi meditación?",
    a: "Tu enlace personal queda activo durante 90 días desde que se crea. Si quieres conservarla más tiempo, descarga el archivo a tu dispositivo.",
  },
  {
    q: "¿Qué voz se usa? ¿Es una persona real?",
    a: "Usamos una voz sintetizada en español, cuidadosamente afinada para un tono cálido y pausado. Muchas personas no notan la diferencia con una locutora humana.",
  },
  {
    q: "¿Es realmente diferente cada vez?",
    a: "Sí. Cada meditación se crea desde cero con tu nombre, tu situación, y el matiz que pediste. Aunque elijas la misma categoría dos veces, los guiones serán distintos.",
  },
  {
    q: "¿Necesito una suscripción?",
    a: "No. Pagas solo cuando quieres una nueva meditación. Sin compromisos, sin renovaciones automáticas, sin letra pequeña.",
  },
  {
    q: "¿Cuánto tarda en crearse?",
    a: "Entre 2 y 3 minutos desde que terminas las preguntas. Te avisamos por email apenas esté lista, por si decides cerrar la página.",
  },
];

function track(event: string, props?: Record<string, unknown>) {
  const ph = (window as unknown as { posthog?: { capture: (e: string, p?: unknown) => void } })
    .posthog;
  if (ph && typeof ph.capture === "function") ph.capture(event, props);
}

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (i: number, q: string) => {
    const next = openIndex === i ? null : i;
    setOpenIndex(next);
    if (next !== null) track("faq_opened", { question: q });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-3">
      {FAQ_ITEMS.map((item, i) => {
        const open = openIndex === i;
        return (
          <div
            key={i}
            className="rounded-2xl bg-surface-container-low border border-outline-variant/20 overflow-hidden transition-shadow hover:shadow-md"
          >
            <button
              type="button"
              onClick={() => toggle(i, item.q)}
              aria-expanded={open}
              className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-inset rounded-2xl"
            >
              <span className="font-headline text-base md:text-lg text-on-surface leading-snug">
                {item.q}
              </span>
              <span
                className={`material-symbols-outlined text-2xl text-primary flex-shrink-0 transition-transform duration-300 ${
                  open ? "rotate-45" : ""
                }`}
              >
                add
              </span>
            </button>
            <AnimatePresence initial={false}>
              {open && (
                <motion.div
                  key="content"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
                  className="overflow-hidden"
                >
                  <p className="px-6 pb-6 pt-1 font-body text-sm md:text-base text-on-surface-variant leading-relaxed">
                    {item.a}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
