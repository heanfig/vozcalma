import type { IntakeData } from "./intake";

export function buildClosingReflection(intake: IntakeData): string {
  const name = intake.name?.trim();
  const safeName = name && !/^usuario$/i.test(name) ? name : "";
  const desiredState = intake.desiredState?.trim() || "calma";
  if (safeName) {
    return `Incluye una reflexion final breve y amorosa para ${safeName}, integrando lo compartido y el anhelo de ${desiredState}, sin pedirle que elija una frase: tu guion la formula con ternura.`;
  }
  return `Incluye una reflexion final breve y amorosa en segunda persona, integrando lo compartido y el anhelo de ${desiredState}, sin pedirle que elija una frase: tu guion la formula con ternura.`;
}
