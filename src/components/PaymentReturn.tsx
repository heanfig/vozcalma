import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { track } from "../lib/analytics";

interface Props {
  sessionId: string;
  wompiTxId?: string;
  onboardingType?: "quick" | "deep";
}

type Phase = "verifying" | "approved" | "declined" | "pending" | "error";

const MAX_ATTEMPTS = 20;
const POLL_INTERVAL_MS = 1500;

export default function PaymentReturn({
  sessionId,
  wompiTxId,
  onboardingType,
}: Props) {
  const [phase, setPhase] = useState<Phase>("verifying");
  const [attempt, setAttempt] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    track("onboarding_payment_verifying", { session_id: sessionId });

    const poll = async (n: number) => {
      if (cancelledRef.current) return;
      setAttempt(n);
      try {
        const qs = new URLSearchParams({ session_id: sessionId });
        if (wompiTxId) qs.set("id", wompiTxId);
        const res = await fetch(`/api/payment/status?${qs.toString()}`, {
          credentials: "same-origin",
        });
        const data = (await res.json()) as {
          paid?: boolean;
          status?: string;
          sessionId?: string;
        };

        if (data.paid) {
          track("onboarding_payment_completed", {
            session_id: sessionId,
            attempts: n,
          });
          setPhase("approved");
          const nextUrl = onboardingType
            ? `/onboarding/${onboardingType === "quick" ? "alivio-rapido" : "reprogramacion-profunda"}?session=${sessionId}`
            : `/onboarding?session=${sessionId}`;
          setTimeout(() => {
            window.location.href = nextUrl;
          }, 1000);
          return;
        }

        if (
          data.status === "DECLINED" ||
          data.status === "ERROR" ||
          data.status === "VOIDED"
        ) {
          track("onboarding_payment_failed", {
            session_id: sessionId,
            status: data.status,
          });
          setPhase("declined");
          return;
        }

        if (n >= MAX_ATTEMPTS) {
          setPhase("pending");
          return;
        }

        timerRef.current = setTimeout(() => poll(n + 1), POLL_INTERVAL_MS);
      } catch {
        if (n >= MAX_ATTEMPTS) {
          setPhase("error");
          return;
        }
        timerRef.current = setTimeout(() => poll(n + 1), POLL_INTERVAL_MS);
      }
    };

    poll(1);
    return () => {
      cancelledRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, wompiTxId]);

  if (phase === "approved") {
    return (
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen flex flex-col items-center justify-center text-center px-6 gradient-canvas"
      >
        <span className="material-symbols-outlined text-tertiary text-6xl mb-4">
          check_circle
        </span>
        <h1 className="font-headline text-3xl md:text-4xl text-on-surface font-medium mb-2">
          ¡Pago confirmado!
        </h1>
        <p className="text-on-surface-variant">Preparando tu sesión...</p>
      </motion.main>
    );
  }

  if (phase === "declined") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center text-center px-6 bg-surface">
        <span className="material-symbols-outlined text-error text-6xl mb-4">
          error
        </span>
        <h1 className="font-headline text-3xl text-on-surface font-medium mb-2">
          No pudimos procesar tu pago
        </h1>
        <p className="text-on-surface-variant max-w-md mb-6">
          Tu tarjeta fue rechazada o el pago fue cancelado. Puedes intentar de
          nuevo desde el onboarding.
        </p>
        <a
          href="/onboarding"
          className="px-6 py-3 rounded-full bg-primary text-on-primary font-semibold hover:bg-primary-container transition-colors"
        >
          Volver al inicio
        </a>
      </main>
    );
  }

  if (phase === "pending") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center text-center px-6 bg-surface">
        <span className="material-symbols-outlined text-primary text-6xl mb-4">
          hourglass_empty
        </span>
        <h1 className="font-headline text-3xl text-on-surface font-medium mb-2">
          Tu pago está en revisión
        </h1>
        <p className="text-on-surface-variant max-w-md mb-6">
          Aún estamos esperando la confirmación de Wompi. Te enviaremos tu
          sesión apenas esté aprobado. Si crees que hubo un problema,
          contáctanos.
        </p>
        <a
          href="/"
          className="px-6 py-3 rounded-full border border-outline-variant text-on-surface hover:bg-surface-container transition-colors"
        >
          Volver al inicio
        </a>
      </main>
    );
  }

  if (phase === "error") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center text-center px-6 bg-surface">
        <span className="material-symbols-outlined text-error text-6xl mb-4">
          cloud_off
        </span>
        <h1 className="font-headline text-3xl text-on-surface font-medium mb-2">
          Error de conexión
        </h1>
        <p className="text-on-surface-variant max-w-md mb-6">
          No pudimos verificar tu pago ahora. Si completaste la compra, por
          favor espera unos minutos y contáctanos si no recibes tu sesión.
        </p>
        <a
          href="/"
          className="px-6 py-3 rounded-full bg-primary text-on-primary font-semibold hover:bg-primary-container transition-colors"
        >
          Volver al inicio
        </a>
      </main>
    );
  }

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen flex flex-col items-center justify-center text-center px-6 gradient-canvas"
    >
      <div className="relative w-32 h-32 mb-8">
        <div className="absolute inset-0 breathing-orb bg-primary/10 rounded-full blur-2xl" />
        <div className="absolute inset-4 gentle-spin border-4 border-primary/20 border-t-primary rounded-full" />
      </div>
      <h1 className="font-headline text-2xl md:text-3xl text-on-surface font-medium mb-2">
        Verificando tu pago...
      </h1>
      <p className="text-on-surface-variant text-sm">
        Esto tomará solo unos segundos. No cierres esta ventana.
      </p>
      <p className="text-on-surface-variant/50 text-xs mt-4">
        Intento {attempt} de {MAX_ATTEMPTS}
      </p>
    </motion.main>
  );
}
