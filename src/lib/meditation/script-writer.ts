import { completeChat, type ChatMessage } from "../openrouter";
import type { IntakeData } from "./intake";
import {
  buildPhase3ContextualRules,
  formatPlanForPrompt,
  type MeditationPlan,
} from "./planner";
import { buildClosingReflection } from "./reflection";

export type GenerateScriptOptions = {
  /** Líneas de estilo desde RAG (top-K pequeño); no copiar literal, solo tono. */
  styleHints?: string[];
};

function totalWordBudget(plan: MeditationPlan): number {
  return plan.sections.reduce((sum, s) => sum + s.maxWordsApprox, 0);
}

function buildSystemPrompt(plan: MeditationPlan): string {
  const budget = totalWordBudget(plan);
  return [
    "Eres un guionista experto en meditacion guiada en espanol LATAM.",
    "Pipeline: una sola generacion (sin borradores intermedios). Respeta el orden y los presupuestos de las cuatro fases.",
    "Tu salida debe ser EXCLUSIVAMENTE el guion final para audio TTS.",
    "No agregues encabezados tecnicos ni explicaciones.",
    "Duracion fija aproximada: 3 minutos (180 segundos).",
    `Presupuesto global orientativo: como mucho unas ${budget} palabras en total (distribuidas segun cada fase). No te excedas: mejor mas pausas … que mas texto.`,
    "Estructura obligatoria en este orden: (1) Preparacion fisica y respiracion, (2) Liberacion y anclaje, (3) Visualizacion inmersiva personalizada al contexto, (4) Retorno e integracion con reflexion final.",
    "Estilo: calido, amoroso, compasivo y pausado, en segunda persona.",
    "Haz que la persona se sienta profundamente acompanada, segura y sostenida en cada bloque.",
    "Frases cortas y pausadas; usa puntos suspensivos … donde el oyente deba hacer una pausa de respiracion o silencio.",
    "Si tienes un primer nombre valido, usalo con carino al menos dos veces. NUNCA uses la palabra 'Usuario' como si fuera un nombre.",
    "Si no hay nombre claro, habla en segunda persona sin inventar un nombre ficticio.",
    "Evita consejos medicos, diagnosticos o lenguaje clinico.",
    "Nunca escribas ni narres: fin guion, fin del guion, fin de guion, ni ninguna variante de eso.",
    "Si hay 'lineas de estilo' de referencia, inspirate en el tono sin copiar frases literalmente.",
    "Al final, en una linea aparte y sola, escribe unicamente el marcador ---FIN_GUIÓN--- (es solo control interno; no lo pronuncies).",
  ].join("\n");
}

function buildUserPrompt(
  intake: IntakeData,
  plan: MeditationPlan,
  options?: GenerateScriptOptions,
): string {
  const rawName = intake.name?.trim() || "";
  const firstName = rawName && !/^usuario$/i.test(rawName) ? rawName : "";
  const lines = [
    firstName ? `Primer nombre del oyente (usar con carino): ${firstName}` : "Sin nombre: solo segunda persona, sin llamar 'Usuario'.",
    `Emocion actual: ${intake.emotion ?? "No especificada"}`,
    `Contexto: ${intake.context ?? "No especificado"}`,
    `Senales corporales/mentales: ${intake.bodySignals ?? "No especificadas"}`,
    `Anhelo de hoy / estado deseado: ${intake.desiredState ?? "Calma"}`,
    "",
    "Plan de fases (3 minutos; respeta tiempos y presupuestos de palabras por bloque):",
    formatPlanForPrompt(plan),
    "",
    buildPhase3ContextualRules(intake),
    buildClosingReflection(intake),
  ];
  const hints = options?.styleHints?.filter(Boolean) ?? [];
  if (hints.length) {
    lines.push(
      "",
      "Lineas de estilo de referencia (tono aprobado; no copiar literalmente):",
      ...hints.map((h) => `- ${h}`),
    );
  }
  lines.push("", "Genera el guion completo ahora.");
  return lines.join("\n");
}

export async function generateMeditationScript(
  intake: IntakeData,
  plan: MeditationPlan,
  options?: GenerateScriptOptions,
): Promise<string> {
  const messages: ChatMessage[] = [
    { role: "system", content: buildSystemPrompt(plan) },
    { role: "user", content: buildUserPrompt(intake, plan, options) },
  ];
  return completeChat(messages, { maxTokens: 2600 });
}
