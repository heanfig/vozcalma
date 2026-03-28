export type OnboardingType = "quick" | "deep";

export type StepInputType = "text" | "select" | "textarea";

export interface RichSelectOption {
  value: string;
  description?: string;
  icon?: string;
  featured?: boolean;
  wide?: boolean;
}

export interface InspirationCard {
  title: string;
  body: string;
  icon?: string;
}

export interface OnboardingStepDef {
  key: string;
  question: string;
  subtitle?: string;
  inputType: StepInputType;
  placeholder?: string;
  options?: string[];
  eyebrow?: string;
  sectionLabel?: string;
  selectLayout?: "list" | "bento";
  richOptions?: RichSelectOption[];
  suggestions?: string[];
  minRows?: number;
  /** Presentación del campo largo */
  textareaVariant?: "default" | "quote" | "centered";
  textareaTip?: string;
  inspirationCards?: InspirationCard[];
  /** Límite de caracteres para inputs de texto/textarea */
  maxLength?: number;
}

// ---------------------------------------------------------------------------
// Alivio rápido (5 pasos)
// ---------------------------------------------------------------------------
export const QUICK_STEPS: OnboardingStepDef[] = [
  {
    key: "nombre",
    question: "¿Cuál es tu nombre?",
    subtitle:
      "Nos encantaría saber cómo llamarte en tus momentos de calma.",
    inputType: "text",
    placeholder: "Escribe tu nombre aquí",
    maxLength: 50,
  },
  {
    key: "emocion",
    question: "¿Cómo te sientes ahora mismo?",
    subtitle: "Elige la emoción que mejor describe tu estado actual.",
    inputType: "select",
    options: [
      "😰 Ansioso(a)",
      "😩 Estresado(a)",
      "😢 Triste",
      "😵‍💫 Abrumado(a)",
      "😴 Sin energía",
    ],
  },
  {
    key: "intensidad",
    question: "¿Qué tan fuerte es este sentimiento?",
    subtitle: "Esto nos ayuda a ajustar el tono de tu sesión.",
    inputType: "select",
    options: ["🟢 Baja", "🟡 Media", "🔴 Alta"],
  },
  {
    key: "pensamiento",
    question: "¿Qué frase se parece más a lo que estás pensando?",
    subtitle: "Identifica el pensamiento que queremos transformar.",
    inputType: "select",
    options: [
      "💭 No puedo con esto",
      "🌊 Todo me supera",
      "💔 No soy suficiente",
      "☁️ Nada va a mejorar",
      "🌀 Estoy perdiendo el control",
    ],
  },
  {
    key: "necesidad",
    question: "¿Qué necesitas en este momento?",
    subtitle: "Define el objetivo principal de tu sesión.",
    inputType: "select",
    options: [
      "🧘 Calmar mi mente",
      "🛡️ Sentirme seguro(a)",
      "😴 Dormir mejor",
      "💡 Tener claridad",
      "⚡ Recuperar energía",
    ],
  },
];

// ---------------------------------------------------------------------------
// Reprogramación profunda (nombre + 6 pasos de intake profundo)
// ---------------------------------------------------------------------------
export const DEEP_STEPS: OnboardingStepDef[] = [
  {
    key: "nombre",
    question: "¿Cuál es tu nombre?",
    subtitle:
      "Nos encantaría saber cómo llamarte en tus momentos de calma.",
    inputType: "text",
    placeholder: "Escribe tu nombre aquí",
  },
  {
    key: "areaVida",
    eyebrow: "Reprogramación profunda",
    sectionLabel: "Diagnóstico",
    question: "¿Qué área de tu vida quieres transformar?",
    subtitle:
      "Tu respuesta nos permite personalizar la meditación y las afirmaciones para ti.",
    inputType: "select",
    selectLayout: "bento",
    richOptions: [
      { value: "Laboral", icon: "work" },
      { value: "Amorosa", icon: "favorite", featured: true },
      { value: "Dinero", icon: "payments" },
      { value: "Autoestima", icon: "self_improvement", wide: true },
      { value: "Salud", icon: "ecg_heart" },
    ],
  },
  {
    key: "sonidosEntorno",
    eyebrow: "Reprogramación profunda",
    sectionLabel: "Bloque sensorial",
    question: "¿Qué sonidos hay alrededor?",
    subtitle:
      "Cierra los ojos un instante y deja que el entorno te hable. Identifica la textura de tu presente.",
    inputType: "select",
    selectLayout: "bento",
    richOptions: [
      {
        value: "Naturaleza",
        description: "Viento, lluvia, pájaros o el susurro de los árboles.",
        icon: "forest",
      },
      {
        value: "Silencio",
        description: "Una quietud profunda, el espacio entre pensamientos.",
        icon: "blur_on",
      },
      {
        value: "Voces o ciudad",
        description:
          "Conversaciones lejanas, el ritmo del tráfico o el pulso de la vida a tu alrededor.",
        icon: "record_voice_over",
        wide: true,
      },
      {
        value: "Música",
        description: "Melodías ambientales, ritmos suaves o una canción de fondo.",
        icon: "music_note",
      },
      {
        value: "Otros",
        description: "Sonidos mecánicos, electrodomésticos o ruidos indefinidos.",
        icon: "more_horiz",
      },
    ],
  },
  {
    key: "visionIdeal",
    eyebrow: "Reprogramación profunda",
    sectionLabel: "Bloque sensorial",
    question: "¿Qué ves en ese momento ideal?",
    subtitle:
      "Cierra los ojos por un instante. Describe el paisaje, los colores y la luz que te rodea.",
    inputType: "textarea",
    placeholder: "Empieza a escribir aquí...",
    minRows: 6,
    maxLength: 500,
    suggestions: ["Bosque frondoso", "Atardecer dorado", "Mar en calma"],
  },
  {
    key: "dialogoInterno",
    eyebrow: "Reprogramación profunda",
    sectionLabel: "Bloque sensorial",
    question: "¿Qué te dices a ti mismo(a)?",
    subtitle:
      "Escribe una afirmación que resuene con tu paz interior. Algo que desees sembrar hoy en tu diálogo interno.",
    inputType: "textarea",
    placeholder: "Escribe tu intención aquí...",
    minRows: 4,
    maxLength: 300,
    textareaVariant: "quote",
  },
  {
    key: "situacionIdeal",
    eyebrow: "Reprogramación profunda",
    sectionLabel: "Bloque de deseo",
    question: "¿Cómo sería tu situación ideal en esa área?",
    subtitle:
      "Cierra los ojos un instante. Visualiza el escenario donde todo fluye en armonía. No hay límites.",
    inputType: "textarea",
    placeholder: "Escribe tu visión aquí...",
    minRows: 5,
    maxLength: 500,
    textareaVariant: "centered",
  },
  {
    key: "creenciasNuevas",
    eyebrow: "Reprogramación profunda",
    sectionLabel: "Integración",
    question: "¿Qué creencias nuevas tienes?",
    subtitle:
      "Este es el espacio donde el viejo relato se disuelve. Escribe las verdades que sostendrán tu nueva realidad.",
    inputType: "textarea",
    placeholder: "Comienza a escribir tus nuevas declaraciones de poder...",
    minRows: 8,
    maxLength: 800,
    textareaTip: 'Usa el presente: "Yo soy…", "Yo merezco…"',
    inspirationCards: [
      {
        title: "Claridad mental",
        body: "Sustituye la duda por la certeza. Define cómo quieres percibir tus capacidades a partir de hoy.",
        icon: "lightbulb",
      },
      {
        title: "Abundancia interior",
        body: "Reconoce tu valor. Escribe sobre la paz y el merecimiento que ahora habitan en ti.",
        icon: "energy_savings_leaf",
      },
    ],
  },
];

export function getSteps(type: OnboardingType): OnboardingStepDef[] {
  return type === "quick" ? QUICK_STEPS : DEEP_STEPS;
}

// ---------------------------------------------------------------------------
// Prompts LLM por tipo de flujo (extraídos de docs/onboarding/Flujo general.md)
// ---------------------------------------------------------------------------

export function buildQuickPrompt(answers: Record<string, string>): {
  system: string;
  user: string;
} {
  const system = [
    "Actúa como un experto en relajación guiada, regulación emocional y lenguaje terapéutico suave.",
    "Tu tarea es crear un guion de audio corto (entre 2 y 4 minutos) para ayudar a una persona a calmar su mente y reducir su ansiedad o malestar emocional.",
    "",
    "El tono debe ser:",
    "- Muy calmado",
    "- Cercano y humano",
    "- Lento y envolvente",
    "- Seguro y reconfortante",
    "",
    "NO uses lenguaje clínico ni complejo.",
    "NO des consejos directos.",
    "NO hagas preguntas.",
    "",
    "Usa frases cortas, pausadas y fluidas, como si estuvieras guiando una respiración.",
    "",
    "Incluye:",
    "1. Llamar a la persona por su nombre (varias veces de forma natural)",
    "2. Validación emocional (hacer sentir que lo que siente es válido)",
    "3. Disminución de intensidad (llevar de tensión a calma)",
    "4. Reprogramación suave del pensamiento negativo",
    "5. Generación de sensación de seguridad, calma o control",
    "6. Cierre con tranquilidad",
    "",
    "Instrucciones clave:",
    "- Si la intensidad es alta, el inicio debe ser más contenedor y lento.",
    "- Si la emoción es ansiedad o estrés, enfócate en respiración y soltar control.",
    "- Si la emoción es tristeza, enfócate en contención y compañía.",
    "- Si la emoción es sentirse sin energía, enfócate en calma y recuperación suave.",
    "",
    "Reprograma el pensamiento negativo de forma indirecta, sin confrontarlo.",
    'Ejemplo: en lugar de decir "eso no es cierto", suavízalo con frases como:',
    '"poco a poco ese pensamiento puede perder fuerza..."',
    "",
    "El texto debe sentirse como un susurro mental, no como instrucciones.",
    "Usa puntos suspensivos … donde el oyente deba hacer una pausa de respiración o silencio.",
    "Nunca escribas ni narres: fin guion, fin del guion, ni variante de eso.",
    "Al final, en una línea aparte y sola, escribe únicamente el marcador ---FIN_GUIÓN--- (control interno; no lo pronuncies).",
    "",
    "Formato de salida: Solo entrega el guion del audio, sin explicaciones adicionales.",
  ].join("\n");

  const user = [
    `Nombre: ${answers.nombre || "Sin nombre"}`,
    `Emoción actual: ${answers.emocion || "No especificada"}`,
    `Intensidad: ${answers.intensidad || "Media"}`,
    `Pensamiento dominante: ${answers.pensamiento || "No especificado"}`,
    `Necesidad principal: ${answers.necesidad || "Calmar mi mente"}`,
  ].join("\n");

  return { system, user };
}

export function buildDeepPrompt(answers: Record<string, string>): {
  system: string;
  user: string;
} {
  const system = [
    "Actúa como un experto en hipnosis ligera, reprogramación mental y visualización guiada.",
    "Tu tarea es crear un guion de audio profundo (entre 5 y 8 minutos) que ayude a una persona a transformar un área concreta de su vida, integrar una visión sensorial rica, un diálogo interno nuevo y creencias que sostengan su nueva realidad.",
    "",
    "El tono debe ser:",
    "- Muy calmado, pausado y envolvente",
    "- Cercano, humano y emocional",
    "- Tipo narración suave, casi como un susurro interno",
    "",
    "NO uses lenguaje técnico, clínico ni racional.",
    "NO des consejos directos.",
    "NO hagas preguntas.",
    "",
    "Usa frases cortas, con ritmo lento, dejando espacio para respirar.",
    "",
    "Estructura obligatoria del audio:",
    "1. Inducción a la relajación: invitar a cerrar los ojos, respiración lenta, relajar cuerpo progresivamente",
    "2. Contexto del área de transformación: nombrar con suavidad el ámbito que la persona eligió (trabajo, amor, dinero, autoestima, salud, etc.) sin juzgar",
    "3. Sonido y entorno: tejer el tipo de sonidos que describió (naturaleza, silencio, ciudad, música, otros) en la atmósfera de la visualización",
    "4. Visualización de lo que ve en su momento ideal: paisaje, luz, colores, sensaciones visuales que compartió",
    "5. Diálogo interno: integrar la afirmación o frase que se dice a sí misma como ancla suave en presente",
    "6. Situación ideal en esa área: expandir la escena donde todo fluye en armonía según lo que describió",
    "7. Nuevas creencias: reforzar las declaraciones nuevas que escribió, en lenguaje presente y compasivo",
    "8. Anclaje emocional: repetir sensaciones positivas, reforzar paz o seguridad",
    "9. Cierre suave: integración del cambio, tranquilidad",
    "",
    "Instrucciones clave:",
    "- Usa el nombre de la persona varias veces de forma natural",
    '- Evita frases como "debes" o "tienes que"',
    '- Usa frases como: "poco a poco...", "sin darte cuenta...", "tu mente comienza a...", "puedes permitirte..."',
    "- La transformación debe sentirse progresiva, no brusca",
    "- La visualización debe ser emocional y sensorial, no solo abstracta",
    "- Usa puntos suspensivos … donde el oyente deba hacer una pausa de respiración o silencio.",
    "- Nunca escribas ni narres: fin guion, fin del guion, ni variante de eso.",
    "- Al final, en una línea aparte y sola, escribe únicamente el marcador ---FIN_GUIÓN--- (control interno; no lo pronuncies).",
    "",
    "Formato de salida: Solo entrega el guion del audio, sin explicaciones adicionales.",
  ].join("\n");

  const user = [
    `Nombre: ${answers.nombre || "Sin nombre"}`,
    `Área de vida a transformar: ${answers.areaVida || "No especificada"}`,
    `Sonidos en el entorno (sensorial): ${answers.sonidosEntorno || "No especificado"}`,
    `Qué ve en su momento ideal (visual): ${answers.visionIdeal || "No especificado"}`,
    `Diálogo interno / afirmación: ${answers.dialogoInterno || "No especificado"}`,
    `Situación ideal en esa área: ${answers.situacionIdeal || "No especificada"}`,
    `Nuevas creencias / declaraciones: ${answers.creenciasNuevas || "No especificadas"}`,
  ].join("\n");

  return { system, user };
}

export function buildPrompt(
  type: OnboardingType,
  answers: Record<string, string>,
) {
  return type === "quick"
    ? buildQuickPrompt(answers)
    : buildDeepPrompt(answers);
}
