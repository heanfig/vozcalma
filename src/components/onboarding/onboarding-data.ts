/**
 * Barrel file — re-exporta todos los types, steps y prompts del sistema de onboarding.
 * Mantiene compatibilidad con imports existentes que apuntan a este archivo.
 */
export type {
  OnboardingType,
  StepInputType,
  RichSelectOption,
  InspirationCard,
  OnboardingStepDef,
  DynamicOptionsFn,
} from "./onboarding-types";

export { QUICK_STEPS } from "./onboarding-steps-quick";
export { DEEP_STEPS } from "./onboarding-steps-deep";
export { buildQuickPrompt, buildDeepPrompt, buildPrompt } from "./onboarding-prompts";

import type { OnboardingType, OnboardingStepDef } from "./onboarding-types";
import { QUICK_STEPS } from "./onboarding-steps-quick";
import { DEEP_STEPS } from "./onboarding-steps-deep";

export function getSteps(type: OnboardingType): OnboardingStepDef[] {
  return type === "quick" ? QUICK_STEPS : DEEP_STEPS;
}
