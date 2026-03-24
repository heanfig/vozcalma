export type IntakeData = {
  name?: string;
  emotion?: string;
  context?: string;
  bodySignals?: string;
  desiredState?: string;
  /** Derivado internamente para el guion; ya no se pregunta al usuario. */
  affirmation?: string;
};

export type IntakeStep = {
  key: keyof IntakeData;
  question: string;
  quickOptions?: string[];
};

export const INTAKE_STEPS: IntakeStep[] = [
  {
    key: "emotion",
    question:
      "Me alegra acompañarte. ¿Cómo se siente tu corazón hoy, o qué emoción te gustaría soltar con cariño?",
    quickOptions: ["Ansiedad", "Estrés", "Cansancio"],
  },
  {
    key: "context",
    question:
      "Gracias por abrirte. ¿Qué situación de tu día está alimentando esa emoción?",
  },
  {
    key: "bodySignals",
    question:
      "Cuando esto aparece, ¿cómo lo notas en tu cuerpo o en tu mente (por ejemplo, tensión, nudo en el pecho o pensamientos acelerados)?",
  },
  {
    key: "desiredState",
    question:
      "Pensando en tu día de hoy, ¿qué te ayudaría a sentir un poco más de paz o alivio en este momento?",
  },
];

export function normalizeAnswer(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function getCurrentStepIndex(intake: IntakeData): number {
  const idx = INTAKE_STEPS.findIndex((step) => {
    const value = intake[step.key];
    return !value || !String(value).trim();
  });
  return idx < 0 ? INTAKE_STEPS.length : idx;
}

export function getCurrentStep(intake: IntakeData): IntakeStep | null {
  const idx = getCurrentStepIndex(intake);
  if (idx >= INTAKE_STEPS.length) return null;
  return INTAKE_STEPS[idx];
}

export function applyAnswer(intake: IntakeData, rawAnswer: string): IntakeData {
  const idx = getCurrentStepIndex(intake);
  if (idx >= INTAKE_STEPS.length) return intake;
  const answer = normalizeAnswer(rawAnswer);
  if (!answer) return intake;
  const step = INTAKE_STEPS[idx];
  return { ...intake, [step.key]: answer };
}

export function isIntakeComplete(intake: IntakeData): boolean {
  return getCurrentStepIndex(intake) >= INTAKE_STEPS.length;
}
