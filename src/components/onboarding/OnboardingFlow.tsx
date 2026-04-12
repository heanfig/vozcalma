import { useState, useCallback, useMemo } from "react";
import { AnimatePresence } from "framer-motion";
import {
  getSteps,
  type OnboardingType,
  type OnboardingStepDef,
} from "./onboarding-data";
import OnboardingProgress from "./OnboardingProgress";
import OnboardingStep from "./OnboardingStep";
import SessionTypeSelector from "./SessionTypeSelector";
import GeneratingScreen from "./GeneratingScreen";
import PaymentGate from "./PaymentGate";
import OnboardingPlayer from "./OnboardingPlayer";
import ConfirmationStep from "./ConfirmationStep";
import AwaitingEmailScreen from "./AwaitingEmailScreen";

type Phase =
  | "intake"
  | "selectType"
  | "confirmation"
  | "generating"
  | "payment"
  | "player"
  | "awaitingEmail";

const NAME_STEP: OnboardingStepDef = {
  key: "nombre",
  question: "¿Cuál es tu nombre?",
  subtitle: "Nos encantaría saber cómo llamarte en tus momentos de calma.",
  inputType: "text",
  placeholder: "Escribe tu nombre aquí",
  maxLength: 50,
};

interface Props {
  type?: OnboardingType;
  sessionId?: string;
  /** Nombre pre-cargado desde la landing page (via ?name=). Si está presente, salta el paso de nombre. */
  initialName?: string;
}

export default function OnboardingFlow({
  type: initialType,
  sessionId: initialSid,
  initialName,
}: Props) {
  const hasPrefilledName = Boolean(initialName && initialName.trim());

  const [chosenType, setChosenType] = useState<OnboardingType | null>(
    initialType ?? null,
  );
  // Si hay nombre pre-cargado y NO hay type pre-seleccionado → ir directo al selectType
  // Si hay nombre pre-cargado Y type → ir directo al primer step del flow (stepIdx 1)
  const initialPhase: Phase =
    hasPrefilledName && !initialType ? "selectType" : "intake";
  const initialStepIdx = hasPrefilledName && initialType ? 1 : 0;

  const [phase, setPhase] = useState<Phase>(initialPhase);
  const [stepIdx, setStepIdx] = useState(initialStepIdx);
  const [direction, setDirection] = useState(1);
  const [answers, setAnswers] = useState<Record<string, string>>(
    hasPrefilledName ? { nombre: initialName!.trim() } : {},
  );
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [scriptText, setScriptText] = useState<string>("");
  const [playUrl, setPlayUrl] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(
    initialSid ?? null,
  );
  const [isPaid, setIsPaid] = useState(!!initialSid);
  const [error, setError] = useState<string | null>(null);
  const [generationStartedAt, setGenerationStartedAt] = useState<number>(Date.now());
  const [generationDone, setGenerationDone] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string>("");

  const flowSteps = useMemo<OnboardingStepDef[]>(() => {
    if (!chosenType) return [];
    const base = getSteps(chosenType).filter((s) => s.key !== "nombre");
    // Filtra pasos condicionales (showIf) basado en las respuestas actuales
    return base.filter((s) => !s.showIf || s.showIf(answers));
  }, [chosenType, answers]);

  const allSteps = useMemo<OnboardingStepDef[]>(
    () => [NAME_STEP, ...flowSteps],
    [flowSteps],
  );

  const currentRawStep = allSteps[stepIdx];

  // Resolver dynamicOptions del paso actual (para pasos que dependen de respuestas previas)
  const currentStep = useMemo<OnboardingStepDef | undefined>(() => {
    if (!currentRawStep) return undefined;
    if (currentRawStep.dynamicOptions) {
      const dynamic = currentRawStep.dynamicOptions(answers);
      return { ...currentRawStep, ...dynamic };
    }
    return currentRawStep;
  }, [currentRawStep, answers]);

  const handleAnswer = useCallback(
    (value: string) => {
      const step = allSteps[stepIdx];
      const next = { ...answers, [step.key]: value };
      setAnswers(next);

      if (step.key === "nombre" && !chosenType) {
        setPhase("selectType");
        return;
      }

      // CRÍTICO: recalcular allSteps con `next` (no con `answers` stale del useMemo).
      // Sin esto, pasos con showIf (como situacionEspecifica) se saltarían porque
      // el allSteps viejo aún no refleja la nueva respuesta.
      const nextFlowSteps = chosenType
        ? getSteps(chosenType)
            .filter((s) => s.key !== "nombre")
            .filter((s) => !s.showIf || s.showIf(next))
        : [];
      const nextAllSteps = [NAME_STEP, ...nextFlowSteps];

      if (stepIdx + 1 < nextAllSteps.length) {
        setDirection(1);
        setStepIdx(stepIdx + 1);
      } else {
        setPhase("confirmation");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stepIdx, answers, allSteps, chosenType],
  );

  const handleBack = useCallback(() => {
    // No permitir back al paso de nombre si fue pre-llenado desde landing
    const minIdx = hasPrefilledName ? 1 : 0;
    if (stepIdx > minIdx) {
      setDirection(-1);
      setStepIdx(stepIdx - 1);
    }
  }, [stepIdx, hasPrefilledName]);

  // R1: Volver al selector de tipo (con confirmación para no perder progreso)
  const handleAbortToSelectType = useCallback(() => {
    const confirmed =
      typeof window !== "undefined"
        ? window.confirm(
            "¿Perder tu progreso? Se borrarán las respuestas que llevas de esta sesión.",
          )
        : true;
    if (!confirmed) return;
    const keepName = answers.nombre || "";
    setAnswers(keepName ? { nombre: keepName } : {});
    setChosenType(null);
    setDirection(-1);
    setStepIdx(hasPrefilledName ? 1 : 0);
    setPhase("selectType");
  }, [answers, hasPrefilledName]);

  const handleTypeSelect = useCallback(
    (type: OnboardingType) => {
      setChosenType(type);
      setPhase("intake");
      setDirection(1);
      setStepIdx(1);
    },
    [],
  );

  const handleConfirm = useCallback(
    (opts: { deliverByEmail: boolean; email: string }) => {
      startGeneration(answers, chosenType!, opts);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [answers, chosenType, sessionId],
  );

  const handleStartAnother = useCallback(() => {
    const keepName = answers.nombre || "";
    setAnswers(keepName ? { nombre: keepName } : {});
    setAudioUrl(null);
    setScriptText("");
    setPlayUrl(null);
    setSessionId(null);
    setError(null);
    setPendingEmail("");
    setGenerationDone(false);
    setChosenType(null);
    setDirection(1);
    setStepIdx(hasPrefilledName ? 1 : 0);
    setPhase("selectType");
  }, [answers, hasPrefilledName]);

  const handleConfirmBack = useCallback(() => {
    setPhase("intake");
    setDirection(-1);
    setStepIdx(allSteps.length - 1);
  }, [allSteps.length]);

  async function startGeneration(
    intake: Record<string, string>,
    type: OnboardingType,
    opts?: { deliverByEmail: boolean; email: string },
  ) {
    setGenerationStartedAt(Date.now());
    setGenerationDone(false);
    setPhase("generating");
    setError(null);
    const deliverByEmail = opts?.deliverByEmail === true;
    const email = opts?.email || "";
    try {
      // Lee el CSRF token del meta tag que el Astro page inyectó
      const csrfToken =
        typeof document !== "undefined"
          ? (document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "")
          : "";
      const res = await fetch("/api/onboarding/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        credentials: "same-origin",
        body: JSON.stringify({
          type,
          answers: intake,
          sessionId,
          deliverByEmail,
          email,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Error" }));
        throw new Error(
          (err as { error?: string }).error || `HTTP ${res.status}`,
        );
      }
      const data = (await res.json()) as {
        sessionId: string;
        audioUrl?: string;
        isPaid: boolean;
        scriptText?: string;
        playUrl?: string;
        status?: string;
      };

      // Si el backend responde con status queued → ir a awaitingEmail
      if (data.status === "queued") {
        setSessionId(data.sessionId);
        setPendingEmail(email);
        setGenerationDone(true);
        setPhase("awaitingEmail");
        return;
      }

      setSessionId(data.sessionId);
      setAudioUrl(data.audioUrl || null);
      setScriptText(data.scriptText || "");
      setPlayUrl(data.playUrl || null);
      setIsPaid(data.isPaid);
      setGenerationDone(true);
      // TEMP: payment gate disabled — go directly to player
      setPhase("player");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al generar");
      setPhase("intake");
      setStepIdx(allSteps.length - 1);
    }
  }

  const handleUnlock = useCallback(() => {
    setIsPaid(true);
    setPhase("player");
  }, []);

  // ---- Render phases ----
  if (phase === "selectType") {
    return (
      <AnimatePresence mode="wait">
        <SessionTypeSelector
          userName={answers.nombre || ""}
          onSelect={handleTypeSelect}
        />
      </AnimatePresence>
    );
  }

  if (phase === "confirmation") {
    return (
      <AnimatePresence mode="wait">
        <ConfirmationStep
          answers={answers}
          chosenType={chosenType!}
          onConfirm={handleConfirm}
          onBack={handleConfirmBack}
        />
      </AnimatePresence>
    );
  }

  if (phase === "generating") {
    return (
      <GeneratingScreen
        startedAt={generationStartedAt}
        done={generationDone}
      />
    );
  }

  if (phase === "awaitingEmail") {
    return (
      <AnimatePresence mode="wait">
        <AwaitingEmailScreen
          email={pendingEmail}
          userName={answers.nombre || ""}
          onStartAnother={handleStartAnother}
        />
      </AnimatePresence>
    );
  }

  // TEMP: payment gate disabled — kept for future production use
  if (phase === "payment") {
    return (
      <AnimatePresence mode="wait">
        <PaymentGate onUnlock={handleUnlock} />
      </AnimatePresence>
    );
  }

  if (phase === "player" && audioUrl) {
    return (
      <AnimatePresence mode="wait">
        <OnboardingPlayer
          audioUrl={audioUrl}
          userName={answers.nombre || ""}
          scriptText={scriptText}
          playUrl={playUrl || undefined}
          sessionTitle={
            chosenType === "quick"
              ? "Alivio rápido personalizado"
              : "Reprogramación profunda"
          }
        />
      </AnimatePresence>
    );
  }

  // ---- Intake (questions) ----
  if (!currentStep) return null;

  const showProgress = chosenType != null;
  const progressCurrent = showProgress ? stepIdx - 1 : 0;
  const progressTotal = showProgress ? flowSteps.length : 1;

  const minBackIdx = hasPrefilledName ? 1 : 0;

  return (
    <>
      <OnboardingProgress
        current={Math.max(0, progressCurrent)}
        total={Math.max(1, progressTotal)}
        sectionLabel={currentStep.sectionLabel}
      />

      <div
        className={`grid place-items-center w-full min-h-screen px-6 pb-8 ${
          currentStep.sectionLabel ? "pt-14" : "pt-8"
        }`}
      >
        <AnimatePresence mode="wait" custom={direction}>
          <OnboardingStep
            key={currentStep.key}
            step={currentStep}
            value={answers[currentStep.key] || ""}
            onAnswer={handleAnswer}
            onBack={stepIdx > minBackIdx ? handleBack : undefined}
            onAbortToSelectType={chosenType != null ? handleAbortToSelectType : undefined}
            direction={direction}
          />
        </AnimatePresence>
      </div>

      {error && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-error-container text-on-error-container px-6 py-3 rounded-2xl shadow-lg text-sm font-body z-50">
          {error}
        </div>
      )}
    </>
  );
}
