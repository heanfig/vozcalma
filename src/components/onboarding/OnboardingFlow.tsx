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

type Phase = "intake" | "selectType" | "confirmation" | "generating" | "payment" | "player";

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

  const flowSteps = useMemo<OnboardingStepDef[]>(() => {
    if (!chosenType) return [];
    return getSteps(chosenType).filter((s) => s.key !== "nombre");
  }, [chosenType]);

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

      if (stepIdx + 1 < allSteps.length) {
        setDirection(1);
        setStepIdx(stepIdx + 1);
      } else {
        // All questions answered → go to confirmation
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

  const handleTypeSelect = useCallback(
    (type: OnboardingType) => {
      setChosenType(type);
      setPhase("intake");
      setDirection(1);
      setStepIdx(1);
    },
    [],
  );

  const handleConfirm = useCallback(() => {
    startGeneration(answers, chosenType!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, chosenType, sessionId]);

  const handleConfirmBack = useCallback(() => {
    setPhase("intake");
    setDirection(-1);
    setStepIdx(allSteps.length - 1);
  }, [allSteps.length]);

  async function startGeneration(
    intake: Record<string, string>,
    type: OnboardingType,
  ) {
    setPhase("generating");
    setError(null);
    try {
      const res = await fetch("/api/onboarding/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, answers: intake, sessionId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Error" }));
        throw new Error(
          (err as { error?: string }).error || `HTTP ${res.status}`,
        );
      }
      const data = (await res.json()) as {
        sessionId: string;
        audioUrl: string;
        isPaid: boolean;
        scriptText: string;
        playUrl?: string;
      };
      setSessionId(data.sessionId);
      setAudioUrl(data.audioUrl);
      setScriptText(data.scriptText || "");
      setPlayUrl(data.playUrl || null);
      setIsPaid(data.isPaid);
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
    return <GeneratingScreen />;
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
