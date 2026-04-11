/**
 * Definiciones de pasos para el flujo de Reprogramación Profunda.
 *
 * 8 journaling screens basados en diseños Stitch:
 * - 4.1 Identidad — "¿Quién eres en esa nueva versión de tu vida?"
 * - 4.2 Momento Poderoso — "¿Cuál sería un momento específico del cambio?"
 * - 4.3 Activación Final — commitment / next step
 * - 4.4 Mensaje al Futuro — "Si esa versión futura pudiera hablarte hoy..."
 * - 4.5 Sensación Interna — "¿Cómo se siente esa versión?"
 * - 4.6 Vida Ideal General — "¿Cómo se vería tu vida ideal?"
 * - 4.7 Día Ideal — "Describe un día perfecto en esa nueva vida"
 * - 4.8 Vacíos Actuales — "¿Qué áreas sientes que necesitan cambiar?"
 * + contextoPersonal (textarea, portado)
 */
import type { OnboardingStepDef } from "./onboarding-types";

export const DEEP_STEPS: OnboardingStepDef[] = [
  // Paso 1: Nombre (compartido)
  {
    key: "nombre",
    question: "¿Cuál es tu nombre?",
    subtitle: "Nos encantaría saber cómo llamarte en tus momentos de calma.",
    inputType: "text",
    placeholder: "Escribe tu nombre aquí",
    maxLength: 50,
  },

  // Paso 2 (4.1): Identidad - Journaling
  {
    key: "identidadNueva",
    eyebrow: "Reprogramación profunda",
    sectionLabel: "Identidad",
    question: "¿Quién eres en esa nueva versión de tu vida?",
    subtitle:
      "¿Cómo piensas, actúas y te comportas en esa realidad? Ya no eres quien solías ser.",
    inputType: "textarea",
    placeholder:
      "Escribe libremente desde esa versión expandida de ti. No hay respuestas correctas.",
    minRows: 6,
    maxLength: 800,
    textareaVariant: "quote",
    textareaTip: "Espacio de introspección libre",
  },

  // Paso 3 (4.2): Momento Poderoso - Journaling
  {
    key: "momentoPoderoso",
    eyebrow: "Reprogramación profunda",
    sectionLabel: "Momento clave",
    question: "¿Cuál sería un momento específico de ese día donde más sentirías el cambio?",
    subtitle: "Identifica esa escena emocional central.",
    inputType: "textarea",
    placeholder: "Visualiza a las personas y el lugar. Nota los sonidos, la temperatura del aire y la expresión en los rostros de quienes te rodean.",
    minRows: 6,
    maxLength: 800,
    textareaVariant: "default",
    textareaTip: "Describe la escena como si la estuvieras viviendo ahora",
  },

  // Paso 4 (4.3): Activación Final - Journaling
  {
    key: "activacionFinal",
    eyebrow: "Reprogramación profunda",
    sectionLabel: "Activación",
    question: "¿Qué estás dispuesto(a) a hacer para activar ese cambio hoy?",
    subtitle: "Escribe el compromiso que sale desde tu centro. No tiene que ser grande, solo verdadero.",
    inputType: "textarea",
    placeholder: "Desde ese lugar, ¿qué eliges empezar a hacer diferente a partir de ahora?",
    minRows: 5,
    maxLength: 600,
    textareaVariant: "centered",
    textareaTip: "Algo concreto y honesto",
  },

  // Paso 5 (4.4): Mensaje al Futuro - Journaling
  {
    key: "mensajeAlFuturo",
    eyebrow: "Reprogramación profunda",
    sectionLabel: "Mensaje al futuro",
    question: "Si esa versión futura de ti pudiera hablarte hoy… ¿qué crees que te diría?",
    subtitle: "Escribe lo primero que venga a tu mente. Tu yo futuro ya está ahí esperándote.",
    inputType: "textarea",
    placeholder: "Escribe como si esa voz viniera desde adentro...",
    minRows: 5,
    maxLength: 600,
    textareaVariant: "quote",
    textareaTip: "Escribe en primera persona, como una carta",
  },

  // Paso 6 (4.5): Sensación Interna - Journaling
  {
    key: "sensacionInterna",
    eyebrow: "Reprogramación profunda",
    sectionLabel: "Sensación interna",
    question: "¿Cómo se siente esa versión de ti viviendo esa realidad?",
    subtitle: "Describe emociones, sensaciones y energía. Habita esa sensación ahora mismo.",
    inputType: "textarea",
    placeholder: "Cuerpo: busca calor, ligereza o expansión. Mente: ¿hay silencio, claridad o paz?",
    minRows: 6,
    maxLength: 700,
    textareaVariant: "default",
    textareaTip: "Conecta con las sensaciones físicas, no solo con las ideas",
  },

  // Paso 7 (4.6): Vida Ideal General - Journaling
  {
    key: "vidaIdealGeneral",
    eyebrow: "Reprogramación profunda",
    sectionLabel: "Vida ideal",
    question: "Si todo comenzara a alinearse para ti… ¿cómo se vería tu vida ideal?",
    subtitle: "Describe tu realidad si no existieran límites. Permítete soñar sin juicios.",
    inputType: "textarea",
    placeholder: "Entrada libre. Sin filtros. Esta es tu visión.",
    minRows: 7,
    maxLength: 900,
    textareaVariant: "default",
    textareaTip: "Sin filtros. Sin límites.",
  },

  // Paso 8 (4.7): Día Ideal - Journaling
  {
    key: "diaIdeal",
    eyebrow: "Reprogramación profunda",
    sectionLabel: "Día ideal",
    question: "Describe cómo sería un día perfecto en esa nueva vida",
    subtitle: "Desde que despiertas hasta que termina el día… ¿qué sucede?",
    inputType: "textarea",
    placeholder: "Visualización activa. Siente cada detalle de este día: la luz, los sonidos, las personas, tus decisiones.",
    minRows: 8,
    maxLength: 1000,
    textareaVariant: "default",
    textareaTip: "Sé específico: texturas, aromas, momentos",
  },

  // Paso 9 (4.8): Vacíos Actuales - Journaling
  {
    key: "vaciosActuales",
    eyebrow: "Reprogramación profunda",
    sectionLabel: "Escritura consciente",
    question: "¿Qué áreas de tu vida sientes que hoy necesitan cambiar o mejorar?",
    subtitle:
      "Identificar tus vacíos es el primer paso para llenarlos con intención. No hay respuestas correctas, solo verdades personales.",
    inputType: "textarea",
    placeholder: "Tómate un momento para ser honesto(a) contigo mismo(a).",
    minRows: 6,
    maxLength: 800,
    textareaVariant: "quote",
    textareaTip: "La honestidad aquí es el primer acto de transformación",
  },

  // Paso 10: Contexto Personal (portado)
  {
    key: "contextoPersonal",
    eyebrow: "Reprogramación profunda",
    sectionLabel: "Tu historia",
    question: "Un último detalle: ¿hay algo más que quieras compartir?",
    subtitle:
      "Este es un espacio seguro. Cualquier detalle adicional hará tu meditación aún más personal.",
    inputType: "textarea",
    placeholder:
      "Puedes escribir lo que necesites... algo que esté en tu corazón, una memoria, una intención específica.",
    minRows: 5,
    maxLength: 800,
    textareaVariant: "default",
    textareaTip: "Todo lo que compartas se usa solo para crear tu meditación",
  },
];
