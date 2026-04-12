/**
 * Definiciones de pasos para el flujo de Alivio Rápido.
 *
 * Versión radicalmente simplificada basada en feedback del manager:
 * - 1 solo paso de selección de categoría (9 categorías)
 * - Si elige "Situaciones específicas", aparece un textarea condicional
 * - Para otras categorías, el backend busca una meditación pre-generada
 *   en filesystem y la devuelve. Si no existe, LLM fallback.
 */
import type { OnboardingStepDef, RichSelectOption } from "./onboarding-types";

export const QUICK_CATEGORIES: RichSelectOption[] = [
  { value: "Calmar la mente", icon: "psychology", description: "Para bajar el ruido mental y encontrar quietud." },
  { value: "Sueño y descanso", icon: "bedtime", description: "Para soltar el día y prepararte para dormir." },
  { value: "Gestión emocional", icon: "mood", description: "Para acompañar emociones difíciles con presencia." },
  { value: "Crecimiento personal", icon: "trending_up", description: "Para conectarte con tu versión más plena." },
  { value: "Enfoque y productividad", icon: "target", description: "Para recuperar claridad y concentración." },
  { value: "Mindfulness / Presencia", icon: "spa", description: "Para volver al aquí y ahora." },
  { value: "Relaciones y emociones sociales", icon: "diversity_3", description: "Para cuidar los vínculos que te importan." },
  { value: "Iniciar la mañana (energía, intención)", icon: "wb_sunny", description: "Para abrir el día con claridad y propósito." },
  { value: "Situaciones específicas", icon: "edit_note", description: "Cuéntanos qué estás viviendo. Tu sesión será única.", wide: true },
];

export const QUICK_STEPS: OnboardingStepDef[] = [
  // Paso 1: Nombre
  {
    key: "nombre",
    question: "¿Cuál es tu nombre?",
    subtitle: "Nos encantaría saber cómo llamarte en tus momentos de calma.",
    inputType: "text",
    placeholder: "Escribe tu nombre aquí",
    maxLength: 50,
  },

  // Paso 2: Categoría (bento select)
  {
    key: "categoria",
    eyebrow: "Alivio rápido",
    sectionLabel: "Elige tu camino",
    question: "¿Qué necesitas sanar hoy?",
    subtitle:
      "Escoge la categoría que mejor describe lo que buscas. Crearemos tu meditación desde ahí.",
    inputType: "select",
    selectLayout: "bento",
    richOptions: QUICK_CATEGORIES,
  },

  // Paso 3: Situación específica (solo si escoge esa categoría)
  {
    key: "situacionEspecifica",
    eyebrow: "Alivio rápido",
    sectionLabel: "Tu situación",
    question: "Cuéntanos qué estás viviendo",
    subtitle:
      "Este es un espacio seguro. Cuanto más compartas, más personalizada será tu meditación.",
    inputType: "textarea",
    placeholder:
      "Describe qué estás sintiendo, qué te pasó, o qué necesitas soltar...",
    minRows: 6,
    maxLength: 1000,
    showIf: (answers) => answers.categoria === "Situaciones específicas",
  },
];
