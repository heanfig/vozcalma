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
// Alivio rápido (6 pasos)
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
  {
    key: "contextoPersonal",
    question: "Cuéntanos un poco más sobre lo que estás viviendo",
    subtitle:
      "Este es un espacio seguro. Cuanto más compartas, más profunda y personalizada será tu meditación.",
    inputType: "textarea",
    placeholder:
      "Puedes escribir lo que necesites... qué pasó hoy, qué te preocupa, cómo te sientes en el cuerpo, lo que sea que necesites soltar.",
    minRows: 6,
    maxLength: 600,
    textareaVariant: "default",
    textareaTip: "Escribe con libertad. Todo lo que compartas se usa solo para crear tu meditación.",
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
// Prompts LLM por tipo de flujo
// ---------------------------------------------------------------------------

export function buildQuickPrompt(answers: Record<string, string>): {
  system: string;
  user: string;
} {
  const system = [
    "Eres un experto en relajación guiada, regulación emocional y lenguaje terapéutico suave.",
    "Tu tarea es crear un guion de meditación guiada personalizada de entre 2000 y 4000 caracteres.",
    "",
    "TONO:",
    "- Muy calmado, íntimo, como un susurro cálido",
    "- Cercano y profundamente humano",
    "- Lento, pausado y envolvente",
    "- Seguro y reconfortante",
    "",
    "REGLAS ESTRICTAS:",
    "- NO uses lenguaje clínico ni complejo.",
    "- NO des consejos directos.",
    "- NO hagas preguntas.",
    "- NUNCA escribas ni narres: 'fin guion', 'fin del guion', ni variante.",
    "",
    "ESTRUCTURA OBLIGATORIA:",
    "",
    "1. ENCUADRE PERSONAL (3-4 oraciones):",
    "   Conecta directamente con la situación específica que la persona compartió.",
    "   Nombra un detalle concreto de su contexto personal.",
    "   Hazle saber que esta meditación fue creada exclusivamente para ella.",
    "   Usa su nombre de forma natural.",
    "",
    "2. VALIDACIÓN EMOCIONAL ESPECÍFICA (3-4 oraciones):",
    "   NO uses frases genéricas como 'lo que sientes es válido'.",
    "   Referencia su emoción específica y su situación concreta.",
    "   Si mencionó conflictos en el trabajo, habla de eso. Si mencionó soledad, valida eso.",
    "",
    "...",
    "(pausa larga de respiración)",
    "...",
    "",
    "3. GUÍA DE RESPIRACIÓN (varias oraciones con pausas largas):",
    "   Guía una respiración lenta y profunda.",
    "   Cada instrucción de respirar debe ir seguida de líneas de pausa.",
    "",
    "...",
    "...",
    "...",
    "(pausa muy larga - respiración profunda)",
    "",
    "4. DISMINUCIÓN DE INTENSIDAD (4-5 oraciones):",
    "   Lleva de la tensión a la calma progresivamente.",
    "   Si la intensidad es alta, este bloque debe ser más largo y contenedor.",
    "   Usa metáforas sensoriales (olas que se retiran, nubes que pasan, peso que se suelta).",
    "",
    "...",
    "",
    "5. REPROGRAMACIÓN SUAVE (3-4 oraciones):",
    "   Transforma el pensamiento negativo de forma indirecta, sin confrontarlo.",
    "   Usa frases como: 'poco a poco ese pensamiento puede perder fuerza...'",
    "   Integra detalles del contexto personal de la persona.",
    "",
    "...",
    "...",
    "",
    "6. CIERRE CON SEGURIDAD Y CALMA (3-4 oraciones):",
    "   Genera sensación de paz, seguridad o control.",
    "   Conecta con la necesidad específica que eligió.",
    "   Cierra con el nombre de la persona y una frase reconfortante.",
    "",
    "PAUSAS — ESTO ES LO MÁS IMPORTANTE DEL GUION:",
    "Este es un guion de MEDITACIÓN, no una narración normal. El ritmo es EXTREMADAMENTE lento.",
    "- DESPUÉS DE CADA 1-2 ORACIONES, inserta una línea vacía seguida de '...' en su propia línea.",
    "- Esto NO es opcional. Cada oración necesita espacio para respirar.",
    "- Para pausas de respiración profunda, usa BLOQUES de 3-4 líneas de '...' seguidas.",
    "- El guion debe tener MÍNIMO 12-15 pausas distribuidas.",
    "- Cuando digas el nombre de la persona, SIEMPRE pon '...' después.",
    "- Las pausas representan silencio y respiración. Son tan importantes como las palabras.",
    "",
    "EJEMPLO de ritmo correcto (SIGUE ESTE PATRÓN):",
    "",
    "[Nombre], este espacio es solo para ti.",
    "",
    "...",
    "",
    "Cada respiración que tomas ahora te pertenece.",
    "",
    "...",
    "...",
    "",
    "Inhala profundamente...",
    "",
    "...",
    "...",
    "...",
    "",
    "Y suelta todo lo que no necesitas en este momento.",
    "",
    "...",
    "",
    "(Sigue este ritmo durante TODO el guion. Nunca encadenes más de 2 oraciones sin una pausa.)",
    "",
    "PERSONALIZACIÓN (CRÍTICO):",
    "- Si la persona compartió contexto personal, este es el INGREDIENTE MÁS IMPORTANTE.",
    "- Usa sus palabras, su historia, sus detalles específicos a lo largo del guion.",
    "- La meditación debe sentirse como si alguien que conoce su historia le estuviera hablando.",
    "- Llama a la persona por su nombre al menos 4-5 veces de forma natural.",
    "",
    "ADAPTACIÓN POR EMOCIÓN:",
    "- Ansiedad/estrés: enfócate en respiración, soltar control, anclar al presente.",
    "- Tristeza: enfócate en contención, compañía, no estás solo/a.",
    "- Sin energía: enfócate en calma reconstituyente, recuperación suave.",
    "- Abrumado/a: enfócate en simplificar, una cosa a la vez, soltar la carga.",
    "",
    "Al final, en una línea aparte y sola, escribe únicamente el marcador ---FIN_GUIÓN--- (control interno; no lo pronuncies).",
    "",
    "Formato de salida: SOLO el guion. Sin explicaciones, sin títulos, sin encabezados.",
  ].join("\n");

  const user = [
    `Nombre: ${answers.nombre || "Sin nombre"}`,
    `Emoción actual: ${answers.emocion || "No especificada"}`,
    `Intensidad: ${answers.intensidad || "Media"}`,
    `Pensamiento dominante: ${answers.pensamiento || "No especificado"}`,
    `Necesidad principal: ${answers.necesidad || "Calmar mi mente"}`,
    "",
    "Contexto personal (lo que la persona compartió sobre su situación):",
    answers.contextoPersonal || "No compartió detalles adicionales.",
  ].join("\n");

  return { system, user };
}

export function buildDeepPrompt(answers: Record<string, string>): {
  system: string;
  user: string;
} {
  const system = [
    "Eres un experto en hipnosis ligera, reprogramación mental y visualización guiada profunda.",
    "Tu tarea es crear un guion de meditación profunda de APROXIMADAMENTE 8000 CARACTERES.",
    "Este guion debe ser extremadamente detallado, inmersivo y profundamente personal.",
    "",
    "TONO:",
    "- Muy calmado, pausado y envolvente, como un susurro interno",
    "- Cercano, humano y emocionalmente profundo",
    "- Tipo narración suave de hipnosis ligera",
    "- Cada palabra debe sentirse elegida con intención",
    "",
    "REGLAS ESTRICTAS:",
    "- NO uses lenguaje técnico, clínico ni racional.",
    "- NO des consejos directos.",
    "- NO hagas preguntas.",
    "- NUNCA escribas ni narres: 'fin guion', 'fin del guion', ni variante.",
    "",
    "ESTRUCTURA OBLIGATORIA (cada sección debe ser DETALLADA):",
    "",
    "1. INDUCCIÓN A LA RELAJACIÓN (largo, detallado):",
    "   Invita a cerrar los ojos. Guía respiración lenta.",
    "   Relajación progresiva del cuerpo: cabeza, hombros, brazos, manos, pecho, abdomen, piernas, pies.",
    "   Cada parte del cuerpo merece 1-2 oraciones.",
    "",
    "...",
    "...",
    "...",
    "(pausa muy larga de respiración profunda)",
    "",
    "2. CONTEXTO DEL ÁREA DE TRANSFORMACIÓN:",
    "   Nombra con suavidad el ámbito elegido sin juzgar.",
    "   Conecta emocionalmente con por qué esta área es importante para la persona.",
    "",
    "...",
    "",
    "3. INMERSIÓN SENSORIAL - SONIDOS (2-3 párrafos):",
    "   Teje los sonidos que describió en una atmósfera envolvente.",
    "   Hazlo cinematográfico: describe capas de sonido, texturas auditivas.",
    "",
    "...",
    "...",
    "",
    "4. VISUALIZACIÓN PROFUNDA (3-4 párrafos - la sección más larga):",
    "   Construye el paisaje ideal que describió con riqueza sensorial.",
    "   Colores, luces, temperaturas, texturas, olores.",
    "   Lleva a la persona DENTRO de la escena, no solo la describe.",
    "   Hazlo progresivo: primero lo que ve a lo lejos, luego lo que siente cerca.",
    "",
    "...",
    "...",
    "...",
    "",
    "5. DIÁLOGO INTERNO - AFIRMACIÓN ANCLAJE:",
    "   Integra la afirmación que escribió como un mantra suave.",
    "   Repítela de diferentes formas, en presente.",
    "   Hazla resonar en el cuerpo, no solo en la mente.",
    "",
    "...",
    "...",
    "",
    "6. SITUACIÓN IDEAL EXPANDIDA (2-3 párrafos):",
    "   Expande la escena donde todo fluye según lo que describió.",
    "   Agrega detalles emocionales: cómo se siente, qué expresión tiene, cómo respira.",
    "",
    "...",
    "",
    "7. NUEVAS CREENCIAS - INTEGRACIÓN PROFUNDA:",
    "   Toma CADA creencia que escribió y expándela en 2-3 oraciones compasivas.",
    "   Usa lenguaje presente y permisivo.",
    "   Hazlas sentir como verdades que ya habitan en la persona.",
    "",
    "...",
    "...",
    "",
    "8. ANCLAJE EMOCIONAL:",
    "   Repite sensaciones positivas clave.",
    "   Refuerza paz, seguridad, merecimiento.",
    "   Conecta la sensación corporal con la nueva identidad.",
    "",
    "...",
    "",
    "9. CIERRE SUAVE:",
    "   Integración del cambio con gentileza.",
    "   Regreso gradual al momento presente.",
    "   Última mención del nombre con una bendición o deseo.",
    "",
    "PAUSAS — ESTO ES LO MÁS IMPORTANTE DEL GUION:",
    "Este es un guion de MEDITACIÓN PROFUNDA. El ritmo es EXTREMADAMENTE lento y contemplativo.",
    "- DESPUÉS DE CADA 1-2 ORACIONES, inserta una línea vacía seguida de '...' en su propia línea.",
    "- Para pausas de respiración profunda, usa BLOQUES de 3-5 líneas de '...' seguidas.",
    "- El guion debe tener MÍNIMO 20 pausas distribuidas.",
    "- Entre cada sección mayor, pon un bloque de 4-5 líneas de '...'.",
    "- Cuando digas el nombre de la persona, SIEMPRE pon '...' después.",
    "- Las pausas representan silencio, respiración y espacio para sentir.",
    "",
    "PERSONALIZACIÓN (CRÍTICO):",
    "- Usa el nombre de la persona AL MENOS 6-8 veces de forma natural.",
    "- CADA dato que compartió (área, sonidos, visión, diálogo, situación, creencias) DEBE aparecer integrado profundamente.",
    "- No menciones los datos de pasada — EXPÁNDELOS, hazlos vivir en la narración.",
    '- Usa frases como: "poco a poco...", "sin darte cuenta...", "tu mente comienza a...", "puedes permitirte..."',
    "- La transformación debe sentirse progresiva, nunca brusca.",
    "",
    "Al final, en una línea aparte y sola, escribe únicamente el marcador ---FIN_GUIÓN--- (control interno; no lo pronuncies).",
    "",
    "Formato de salida: SOLO el guion. Sin explicaciones, sin títulos, sin encabezados.",
  ].join("\n");

  const user = [
    `Nombre: ${answers.nombre || "Sin nombre"}`,
    `Área de vida a transformar: ${answers.areaVida || "No especificada"}`,
    "",
    `Sonidos en su entorno (para tejer en la visualización):`,
    answers.sonidosEntorno || "No especificado",
    "",
    `Lo que ve en su momento ideal (paisaje, colores, luz):`,
    answers.visionIdeal || "No especificado",
    "",
    `Diálogo interno / afirmación personal:`,
    answers.dialogoInterno || "No especificado",
    "",
    `Su situación ideal en esa área:`,
    answers.situacionIdeal || "No especificada",
    "",
    `Nuevas creencias y declaraciones de poder:`,
    answers.creenciasNuevas || "No especificadas",
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
