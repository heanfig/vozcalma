import type { IntakeData } from "./intake";

export const MEDITATION_PHASE_IDS = [
  "preparacion_fisica",
  "liberacion_anclaje",
  "visualizacion_contextual",
  "retorno_integracion",
] as const;

export type MeditationPhaseId = (typeof MEDITATION_PHASE_IDS)[number];

export type MeditationPlanSection = {
  id: MeditationPhaseId;
  name: string;
  seconds: number;
  goal: string;
  /** Presupuesto orientativo de palabras para ~3 min de audio en total. */
  maxWordsApprox: number;
};

export type MeditationPlan = {
  totalSeconds: number;
  sections: MeditationPlanSection[];
};

/**
 * Lista compacta para el prompt (evita JSON grande y reduce tokens de entrada).
 */
export function formatPlanForPrompt(plan: MeditationPlan): string {
  return plan.sections
    .map(
      (s) =>
        `- [${s.name} · ~${s.seconds}s · máx. ~${s.maxWordsApprox} palabras] ${s.goal}`,
    )
    .join("\n");
}

/**
 * Reglas explícitas de la Fase 3 (visualización contextual) para el user prompt.
 */
export function buildPhase3ContextualRules(intake: IntakeData): string {
  const ctx = (intake.context ?? "").trim();
  const desired = (intake.desiredState ?? "calma y claridad").trim();
  const hasSocial =
    /reuni[oó]n|jefe|trabajo|equipo|oficina|social|presentaci[oó]n|entrevista/i.test(
      ctx,
    );
  const lines = [
    `Fase 3 — Visualización: la escena o metáfora debe conectar con el contexto ("${ctx || "su día"}") y el anhelo "${desired}".`,
    "No uses solo playa o bosque genérico si el contexto describe una situación concreta (trabajo, familia, salud).",
    "Si hay anticipación social o laboral (reunión, jefe, presentación), sitúa al oyente en esa situación con seguridad, calma y presencia; no lo alejes de lo que vive.",
    "La imagen es amorosa y compasiva; refuerza recursos internos (respiración, anclaje, límites suaves) dentro de la escena.",
  ];
  if (hasSocial) {
    lines.push(
      "Prioridad: la visualización incluye explícitamente la situación social o laboral mencionada, con el oyente actuando con seguridad y serenidad.",
    );
  }
  return lines.join("\n");
}

export function buildMeditationPlan(intake: IntakeData): MeditationPlan {
  return {
    totalSeconds: 180,
    sections: [
      {
        id: "preparacion_fisica",
        name: "Preparación física y respiración",
        seconds: 35,
        goal: `Aterrizar en el cuerpo, acomodar la postura y regular el sistema nervioso con respiración suave, reconociendo la emoción "${intake.emotion ?? "actual"}".`,
        maxWordsApprox: 70,
      },
      {
        id: "liberacion_anclaje",
        name: "Liberación y anclaje",
        seconds: 45,
        goal: `Soltar tensión vinculada a "${intake.context ?? "la situación actual"}"; nombrar con ternura señales corporales como "${intake.bodySignals ?? "tensión"}" y crear un anclaje seguro.`,
        maxWordsApprox: 85,
      },
      {
        id: "visualizacion_contextual",
        name: "Visualización inmersiva personalizada",
        seconds: 55,
        goal: `Guiar una imagen interna que conecte contexto y anhelo "${intake.desiredState ?? "calma y claridad"}".`,
        maxWordsApprox: 100,
      },
      {
        id: "retorno_integracion",
        name: "Retorno e integración",
        seconds: 45,
        goal: `Volver gradualmente al aquí y ahora; cerrar con reflexión breve y amorosa sin pedir que elija una frase: la afirmación surge del contexto (${intake.desiredState ?? "calma"}).`,
        maxWordsApprox: 75,
      },
    ],
  };
}
