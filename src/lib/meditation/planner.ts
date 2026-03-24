import type { IntakeData } from "./intake";

export type MeditationPlan = {
  totalSeconds: number;
  sections: Array<{
    name: string;
    seconds: number;
    goal: string;
  }>;
};

export function buildMeditationPlan(intake: IntakeData): MeditationPlan {
  return {
    totalSeconds: 180,
    sections: [
      {
        name: "Aterrizaje y respiracion",
        seconds: 35,
        goal: `Regular el sistema nervioso con respiracion suave y conectar con la emocion "${intake.emotion ?? "actual"}".`,
      },
      {
        name: "Liberacion de tension",
        seconds: 45,
        goal: `Soltar tension asociada a "${intake.context ?? "la situacion actual"}", nombrando señales corporales como "${intake.bodySignals ?? "tension"}".`,
      },
      {
        name: "Visualizacion y estado deseado",
        seconds: 55,
        goal: `Guiar una imagen interna que lleve a "${intake.desiredState ?? "calma y claridad"}".`,
      },
      {
        name: "Reflexion e integracion",
        seconds: 45,
        goal: `Cerrar con una reflexion breve y amorosa que integre lo vivido hoy, sin pedirle al oyente que elija una frase: la afirmacion surge del contexto (${intake.desiredState ?? "calma"}).`,
      },
    ],
  };
}
