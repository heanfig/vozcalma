import { completeChat, type ChatMessage } from "../openrouter";
import type { IntakeData } from "./intake";
import type { MeditationPlan } from "./planner";
import { buildClosingReflection } from "./reflection";

function buildSystemPrompt(): string {
  return [
    "Eres un guionista experto en meditacion guiada en espanol LATAM.",
    "Tu salida debe ser EXCLUSIVAMENTE el guion final para audio TTS.",
    "No agregues encabezados tecnicos ni explicaciones.",
    "Duracion fija aproximada: 3 minutos (180 segundos).",
    "Estilo: calido, amoroso, compasivo y pausado, en segunda persona.",
    "Haz que la persona se sienta profundamente acompanada, segura y sostenida en cada bloque.",
    "Estructura obligatoria: respiracion inicial, liberacion emocional, visualizacion deseada, reflexion final, cierre.",
    "Si tienes un primer nombre valido, usalo con carino al menos dos veces. NUNCA uses la palabra 'Usuario' como si fuera un nombre.",
    "Si no hay nombre claro, habla en segunda persona sin inventar un nombre ficticio.",
    "Evita consejos medicos, diagnosticos o lenguaje clinico.",
    "Termina con la linea exacta: ---FIN_GUIÓN---",
  ].join("\n");
}

function buildUserPrompt(intake: IntakeData, plan: MeditationPlan): string {
  const rawName = intake.name?.trim() || "";
  const firstName = rawName && !/^usuario$/i.test(rawName) ? rawName : "";
  return [
    firstName ? `Primer nombre del oyente (usar con carino): ${firstName}` : "Sin nombre: solo segunda persona, sin llamar 'Usuario'.",
    `Emocion actual: ${intake.emotion ?? "No especificada"}`,
    `Contexto: ${intake.context ?? "No especificado"}`,
    `Senales corporales/mentales: ${intake.bodySignals ?? "No especificadas"}`,
    `Anhelo de hoy / estado deseado: ${intake.desiredState ?? "Calma"}`,
    `Plan de secciones (3 minutos): ${JSON.stringify(plan.sections)}`,
    buildClosingReflection(intake),
    "Genera el guion completo ahora.",
  ].join("\n");
}

export async function generateMeditationScript(
  intake: IntakeData,
  plan: MeditationPlan,
): Promise<string> {
  const messages: ChatMessage[] = [
    { role: "system", content: buildSystemPrompt() },
    { role: "user", content: buildUserPrompt(intake, plan) },
  ];
  return completeChat(messages);
}
