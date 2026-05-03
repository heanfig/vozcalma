/**
 * Tipos compartidos del sistema de onboarding.
 *
 * Extraído de onboarding-data.ts para aislar data de tipos y permitir
 * split por flujo (quick / deep) y por prompts.
 */

export type OnboardingType = "quick" | "deep";

export type StepInputType = "text" | "select" | "textarea" | "multi-select";

export interface RichSelectOption {
  value: string;
  description?: string;
  icon?: string;
  featured?: boolean;
  wide?: boolean;
  subtle?: boolean;
}

export interface InspirationCard {
  title: string;
  body: string;
  icon?: string;
}

/**
 * Resolver dinámico de opciones basado en respuestas previas.
 * Útil para pantallas como "areaPrioritaria" que muestran solo
 * las áreas que el usuario seleccionó en un paso anterior.
 */
export type DynamicOptionsFn = (answers: Record<string, string>) => {
  options?: string[];
  richOptions?: RichSelectOption[];
};

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
  /** Selecciones mínimas para multi-select */
  minSelections?: number;
  /** Selecciones máximas para multi-select */
  maxSelections?: number;
  /** Resuelve options/richOptions dinámicamente desde answers previas */
  dynamicOptions?: DynamicOptionsFn;
  /** Si retorna false, el paso se omite del flujo (p.ej. pasos condicionales). */
  showIf?: (answers: Record<string, string>) => boolean;
}
