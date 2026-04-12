/**
 * Definiciones de pasos para el flujo de Reprogramación Profunda.
 *
 * Versión simplificada basada en feedback del manager:
 * 7 preguntas journaling más concretas y accesibles que las anteriores.
 * Todas usan el textarea unificado.
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

  // Paso 2: ¿Qué te trajo a este momento?
  {
    key: "queTrajoMomento",
    eyebrow: "Reprogramación profunda",
    sectionLabel: "Punto de partida",
    question: "¿Qué te trajo a este momento de tu vida y por qué sientes que es importante para ti estar aquí ahora?",
    subtitle:
      "No hay respuesta correcta. Escribe lo primero que sientas — lo que tu voz interior necesita expresar.",
    inputType: "textarea",
    placeholder: "Escribe con libertad lo que sientas en este momento...",
    minRows: 6,
    maxLength: 1000,
  },

  // Paso 3: ¿Herida emocional de la infancia?
  {
    key: "heridaInfancia",
    eyebrow: "Reprogramación profunda",
    sectionLabel: "Raíces",
    question: "¿Sientes que hay alguna herida emocional de tu infancia que aún te afecta hoy? ¿Cuál crees que es?",
    subtitle:
      "Este es un espacio seguro. Nadie leerá esto más que tú. Escribe con honestidad, sin filtros.",
    inputType: "textarea",
    placeholder: "Puedes describir lo que recuerdas o lo que sientes que sigue presente en ti...",
    minRows: 6,
    maxLength: 1000,
  },

  // Paso 4: ¿Quién eres hoy como adulto/a?
  {
    key: "quienEresHoy",
    eyebrow: "Reprogramación profunda",
    sectionLabel: "Tu presente",
    question: "¿Quién eres hoy como adulto/a? ¿Cómo te describes y cómo sientes que te estás tratando a ti mismo/a?",
    subtitle:
      "Una imagen honesta de quién eres ahora — sin juicios, solo observando con cariño.",
    inputType: "textarea",
    placeholder: "Describe cómo te ves, cómo te tratas, cómo te hablas a ti mismo/a...",
    minRows: 6,
    maxLength: 1000,
  },

  // Paso 5: ¿Qué quieres transformar?
  {
    key: "queQuieresTransformar",
    eyebrow: "Reprogramación profunda",
    sectionLabel: "Transformación",
    question: "¿Qué aspectos de ti o de tu vida quisieras transformar o sanar?",
    subtitle:
      "Lo que aquí nombres comenzará a moverse. Escribe con intención.",
    inputType: "textarea",
    placeholder: "Puede ser algo interno, algo externo, o ambas cosas...",
    minRows: 6,
    maxLength: 1000,
  },

  // Paso 6: ¿Qué hace falta para sentirte en paz?
  {
    key: "queHaceFalta",
    eyebrow: "Reprogramación profunda",
    sectionLabel: "Lo que anhelas",
    question: "¿Qué sientes que hace falta hoy en tu vida para sentirte en paz, pleno/a o feliz?",
    subtitle:
      "Lo que falta a veces no es algo que se agrega — a veces es algo que se permite.",
    inputType: "textarea",
    placeholder: "Puede ser una sensación, una persona, una experiencia, una decisión...",
    minRows: 6,
    maxLength: 1000,
  },

  // Paso 7: ¿Qué te hace feliz?
  {
    key: "queTeHaceFeliz",
    eyebrow: "Reprogramación profunda",
    sectionLabel: "Tu luz",
    question: "¿Qué cosas, momentos o experiencias realmente te hacen sentir feliz y conectado/a contigo mismo/a?",
    subtitle:
      "Esos destellos donde todo se siente en su lugar. Nómbralos para que puedan crecer.",
    inputType: "textarea",
    placeholder: "Momentos pequeños o grandes, cualquiera que te haga sentir verdaderamente tú...",
    minRows: 6,
    maxLength: 1000,
  },

  // Paso 8: Día ideal
  {
    key: "diaIdeal",
    eyebrow: "Reprogramación profunda",
    sectionLabel: "Tu visión",
    question: "Si pudieras diseñar un día ideal en tu vida, ¿cómo sería ese día?",
    subtitle:
      "Desde que despiertas hasta que cierras los ojos. Describe texturas, momentos, personas.",
    inputType: "textarea",
    placeholder: "Siente cada detalle de ese día como si lo estuvieras viviendo ahora...",
    minRows: 7,
    maxLength: 1200,
  },
];
