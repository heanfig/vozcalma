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

type Phase = "intake" | "selectType" | "generating" | "payment" | "player";

const NAME_STEP: OnboardingStepDef = {
  key: "nombre",
  question: "¿Cuál es tu nombre?",
  subtitle: "Nos encantaría saber cómo llamarte en tus momentos de calma.",
  inputType: "text",
  placeholder: "Escribe tu nombre aquí",
  maxLength: 50,
};

interface Props {
  /** Optional: skip the type-selector and go straight to this flow. */
  type?: OnboardingType;
  /** If an admin pre-created a paid session, pass its id here. */
  sessionId?: string;
}

export default function OnboardingFlow({
  type: initialType,
  sessionId: initialSid,
}: Props) {
  const [chosenType, setChosenType] = useState<OnboardingType | null>(
    initialType ?? null,
  );
  const [phase, setPhase] = useState<Phase>("intake");
  const [stepIdx, setStepIdx] = useState(0);
  const [direction, setDirection] = useState(1);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(
    initialSid ?? null,
  );
  const [isPaid, setIsPaid] = useState(!!initialSid);
  const [error, setError] = useState<string | null>(null);

  // Steps for the selected type (excluding the shared name step)
  const flowSteps = useMemo<OnboardingStepDef[]>(() => {
    if (!chosenType) return [];
    return getSteps(chosenType).filter((s) => s.key !== "nombre");
  }, [chosenType]);

  // Combined steps: name first, then flow-specific questions
  const allSteps = useMemo<OnboardingStepDef[]>(
    () => [NAME_STEP, ...flowSteps],
    [flowSteps],
  );

  // After answering the name step we show the type selector (if type not preset)
  const handleAnswer = useCallback(
    (value: string) => {
      const step = allSteps[stepIdx];
      const next = { ...answers, [step.key]: value };
      setAnswers(next);

      // Just finished the name step and type hasn't been chosen yet → show selector
      if (step.key === "nombre" && !chosenType) {
        setPhase("selectType");
        return;
      }

      if (stepIdx + 1 < allSteps.length) {
        setDirection(1);
        setStepIdx(stepIdx + 1);
      } else {
        startGeneration(next, chosenType!);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stepIdx, answers, allSteps, chosenType],
  );

  const handleTypeSelect = useCallback(
    (type: OnboardingType) => {
      setChosenType(type);
      setPhase("intake");
      setDirection(1);
      // Name was already step 0; now we jump to step 1 (first flow-specific question)
      // But allSteps will re-compute once chosenType changes, so we set to 1
      setStepIdx(1);
    },
    [],
  );

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
      };
      setSessionId(data.sessionId);
      setAudioUrl(data.audioUrl);
      setIsPaid(data.isPaid);
      setPhase(data.isPaid ? "player" : "payment");
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

  if (phase === "generating") {
    return <GeneratingScreen />;
  }

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
  const currentStep = allSteps[stepIdx];
  if (!currentStep) return null;

  // Progress: after type selection the user sees "Paso X de Y" for the flow-specific steps only
  const showProgress = chosenType != null;
  const progressCurrent = showProgress ? stepIdx - 1 : 0;
  const progressTotal = showProgress ? flowSteps.length : 1;

  return (
    <>
      <OnboardingProgress
        current={Math.max(0, progressCurrent)}
        total={Math.max(1, progressTotal)}
        sectionLabel={
          chosenType === "deep" ? currentStep.sectionLabel : undefined
        }
      />

      <div
        className={`grid place-items-center w-full min-h-screen px-6 pb-8 ${
          chosenType === "deep" && currentStep.sectionLabel ? "pt-14" : "pt-8"
        }`}
      >
        <AnimatePresence mode="wait" custom={direction}>
          <OnboardingStep
            key={currentStep.key}
            step={currentStep}
            value={answers[currentStep.key] || ""}
            onAnswer={handleAnswer}
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
