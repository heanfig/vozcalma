/**
 * Definiciones de pasos para el flujo de Alivio Rápido.
 *
 * Basado en los diseños de Stitch (project 15344559829188899043):
 * - 3.1 Apertura - Áreas de Vida (multi-select)
 * - 3.2 Enfoque - Priorización Suave (single-select, dynamicOptions)
 * - 3.3 Inicio del Día Ideal (single-select)
 * - 3.4 Momento Clave del Día (single-select)
 * - 3.5 Acción Concreta - Hacerlo Real (single-select)
 * - 3.6 Identidad - Nueva Versión de Ti (single-select)
 * - 3.7 Activación Final - Comienzo del Viaje (single-select)
 * - 3.8 Expansión a Otras Áreas (multi-select)
 * + contextoPersonal (textarea, portado)
 */
import type { OnboardingStepDef, RichSelectOption } from "./onboarding-types";

// Opciones compartidas: las 6 áreas de vida (usadas en 3.1 y referencia para 3.2)
export const AREAS_VIDA: RichSelectOption[] = [
  { value: "Mi confianza personal", icon: "self_improvement" },
  { value: "Mi vida profesional", icon: "work_outline" },
  { value: "Mis finanzas", icon: "account_balance_wallet" },
  { value: "Mi tranquilidad emocional", icon: "spa" },
  { value: "Mi disciplina y enfoque", icon: "track_changes" },
  { value: "Mis relaciones", icon: "favorite" },
];

export const QUICK_STEPS: OnboardingStepDef[] = [
  // Paso 1: Nombre (compartido, puede skipearse via prefill)
  {
    key: "nombre",
    question: "¿Cuál es tu nombre?",
    subtitle: "Nos encantaría saber cómo llamarte en tus momentos de calma.",
    inputType: "text",
    placeholder: "Escribe tu nombre aquí",
    maxLength: 50,
  },

  // Paso 2 (3.1): Apertura - Áreas de Vida (multi-select)
  {
    key: "areasVida",
    eyebrow: "Alivio rápido",
    sectionLabel: "Apertura",
    question: "Selecciona las áreas de tu vida que sientes que están listas para evolucionar",
    subtitle:
      "Antes de comenzar… no necesitas tener todo claro… solo reconocer lo que dentro de ti quiere cambiar.",
    inputType: "multi-select",
    richOptions: AREAS_VIDA,
    minSelections: 1,
    textareaTip: "Puedes elegir más de una… todo está conectado",
  },

  // Paso 3 (3.2): Enfoque - Priorización Suave (single-select desde áreas seleccionadas)
  {
    key: "areaPrioritaria",
    eyebrow: "Alivio rápido",
    sectionLabel: "Enfoque",
    question: "Elige lo que hoy se siente más importante para ti",
    subtitle: "A veces… cuando algo cambia… todo empieza a moverse.",
    inputType: "select",
    selectLayout: "bento",
    // Las opciones se resuelven dinámicamente desde areasVida
    dynamicOptions: (answers) => {
      const selected = (answers.areasVida || "")
        .split("; ")
        .map((s) => s.trim())
        .filter(Boolean);
      const allByValue = new Map(AREAS_VIDA.map((o) => [o.value, o]));
      const richOptions = selected
        .map((v) => allByValue.get(v))
        .filter((o): o is RichSelectOption => Boolean(o))
        .map((o) => ({
          ...o,
          description: describeArea(o.value),
        }));
      // Fallback: si el usuario no seleccionó nada (no debería pasar), mostrar todas
      return { richOptions: richOptions.length > 0 ? richOptions : AREAS_VIDA };
    },
  },

  // Paso 4 (3.3): Inicio del Día Ideal (single-select)
  {
    key: "inicioDiaIdeal",
    eyebrow: "Alivio rápido",
    sectionLabel: "Visualización",
    question: "Ahora deja de pensar… e imagina que este es un nuevo día en tu vida",
    subtitle: "Así comienza tu día… No lo analices, imagínalo.",
    inputType: "select",
    options: [
      "🌅 Despierto en calma",
      "⚡ Me levanto con energía",
      "🎯 Me siento claro(a) y enfocado(a)",
      "🛡️ Me levanto sin ansiedad",
      "💫 Siento control desde el inicio",
    ],
  },

  // Paso 5 (3.4): Momento Clave del Día (single-select)
  {
    key: "momentoClave",
    eyebrow: "Alivio rápido",
    sectionLabel: "Visualización",
    question: "A medida que el día avanza… algo importante sucede",
    subtitle: "Este es el momento donde más notas el cambio.",
    inputType: "select",
    options: [
      "💼 En mi trabajo",
      "💬 En una conversación importante",
      "🎯 Al tomar decisiones",
      "🏆 En un logro personal",
      "🧘 En un momento conmigo mismo(a)",
    ],
  },

  // Paso 6 (3.5): Acción Concreta - Hacerlo Real (single-select)
  {
    key: "accionConcreta",
    eyebrow: "Alivio rápido",
    sectionLabel: "Acción",
    question: "Hazlo más real… mírate dentro de ese momento",
    subtitle: "Elige lo que más se parezca a lo que ves.",
    inputType: "select",
    options: [
      "🗣️ Hablo con seguridad y fluidez",
      "💡 Tomo decisiones con claridad",
      "🚀 Logro algo que antes me costaba",
      "🧘 Me siento tranquilo(a) y enfocado(a)",
      "✨ Disfruto lo que estoy haciendo",
    ],
  },

  // Paso 7 (3.6): Identidad - Nueva Versión de Ti (single-select de traits)
  {
    key: "nuevaIdentidad",
    eyebrow: "Alivio rápido",
    sectionLabel: "Identidad",
    question: "Esa versión de ti ya existe… solo estás empezando a reconocerla",
    subtitle: "Así eres en esta nueva etapa. No es alguien diferente… eres tú.",
    inputType: "select",
    options: [
      "🔷 Seguro(a) de mí",
      "🎯 Enfocado(a)",
      "🌊 Tranquilo(a)",
      "⚡ Disciplinado(a)",
      "✨ Con claridad y dirección",
    ],
  },

  // Paso 8 (3.7): Activación Final - Comienzo del Viaje (single-select / commitment)
  {
    key: "activacionFinal",
    eyebrow: "Alivio rápido",
    sectionLabel: "Activación",
    question: "Este es tu punto de inicio",
    subtitle: "¿Cómo quieres comenzar este viaje hacia tu versión más plena?",
    inputType: "select",
    options: [
      "🌱 Con paciencia y cuidado conmigo",
      "🔥 Con determinación y foco",
      "🌊 Dejando fluir el proceso",
      "💫 Con apertura a lo nuevo",
      "🕊️ Con paz y aceptación",
    ],
  },

  // Paso 9 (3.8): Expansión a Otras Áreas (multi-select)
  {
    key: "expansionOtrasAreas",
    eyebrow: "Alivio rápido",
    sectionLabel: "Expansión",
    question: "Y mientras eso sucede…",
    subtitle: "otras partes de tu vida también cambian. Esto también empieza a mejorar.",
    inputType: "multi-select",
    richOptions: [
      { value: "Mi tranquilidad mental", icon: "spa" },
      { value: "Mi energía diaria", icon: "bolt" },
      { value: "Mi dinero", icon: "account_balance_wallet" },
      { value: "Mis relaciones", icon: "favorite" },
      { value: "Mi seguridad personal", icon: "verified_user" },
    ],
    minSelections: 1,
  },

  // Paso 10: Contexto Personal (textarea, portado del flujo anterior)
  {
    key: "contextoPersonal",
    eyebrow: "Alivio rápido",
    sectionLabel: "Tu historia",
    question: "Cuéntanos un poco más sobre lo que estás viviendo",
    subtitle:
      "Este es un espacio seguro. Cuanto más compartas, más profunda y personalizada será tu meditación.",
    inputType: "textarea",
    placeholder:
      "Puedes escribir lo que necesites... qué pasó hoy, qué te preocupa, cómo te sientes en el cuerpo, lo que sea que necesites soltar.",
    minRows: 6,
    maxLength: 800,
    textareaVariant: "default",
    textareaTip: "Escribe con libertad. Todo lo que compartas se usa solo para crear tu meditación.",
  },
];

/** Descripciones de cada área de vida (para el paso de priorización). */
function describeArea(value: string): string {
  const map: Record<string, string> = {
    "Mi confianza personal": "Fortalecer mi seguridad interna y autoimagen.",
    "Mi vida profesional": "Encontrar propósito y balance en mi carrera.",
    "Mis finanzas": "Estabilidad y una relación sana con el dinero.",
    "Mi tranquilidad emocional": "Reducir el ruido mental y vivir en paz.",
    "Mi disciplina y enfoque": "Consistencia y claridad en mis acciones.",
    "Mis relaciones": "Conexiones profundas y vínculos saludables.",
  };
  return map[value] || "";
}
