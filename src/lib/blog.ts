export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  date: string;
  content: string[];
};

export const blogPosts: BlogPost[] = [
  {
    slug: "respiracion-4-6-para-bajar-estres",
    title: "Respiración 4-6 para bajar el estrés en minutos",
    description:
      "Aprende una técnica sencilla para regular tu respiración y reducir la activación física del estrés en pocos minutos.",
    date: "2026-03-24",
    content: [
      "Cuando el cuerpo está en alerta, la respiración se vuelve corta y rápida. La técnica 4-6 busca recuperar un ritmo más calmado.",
      "Inhala por la nariz contando 4 segundos y exhala lentamente por la boca contando 6 segundos. Repite entre 8 y 12 ciclos.",
      "No se trata de hacerlo perfecto, sino constante. Si te mareas, vuelve a un ritmo natural y retoma más suave.",
      "Puedes usar esta respiración antes de dormir, antes de una reunión o en momentos de ansiedad puntual.",
    ],
  },
  {
    slug: "rutina-nocturna-para-dormir-mejor",
    title: "Rutina nocturna de 10 minutos para dormir mejor",
    description:
      "Una secuencia breve de relajación para cerrar el día con menos tensión y mejorar la calidad del descanso.",
    date: "2026-03-24",
    content: [
      "Apaga pantallas al menos 20 minutos antes de acostarte. La estimulación visual prolongada dificulta la transición al sueño.",
      "Haz tres respiraciones profundas y luego relaja el cuerpo por zonas: mandíbula, cuello, hombros, pecho y piernas.",
      "Termina con una intención simple: descansar, soltar y recuperar energía. Repetir esta rutina crea una señal de seguridad para tu mente.",
    ],
  },
  {
    slug: "meditacion-guiada-para-ansiedad-ligera",
    title: "Meditación guiada para ansiedad ligera",
    description:
      "Qué hacer cuando notas preocupación constante y cómo usar una sesión guiada para volver al presente.",
    date: "2026-03-24",
    content: [
      "La ansiedad ligera suele sentirse como pensamientos repetitivos y tensión corporal. Un ancla útil es volver a la respiración y al cuerpo.",
      "Durante la meditación, nombra en silencio lo que aparece: pensamiento, emoción, sensación. No luches contra ello; obsérvalo y vuelve al aire que entra y sale.",
      "Al finalizar, realiza una acción concreta y pequeña: tomar agua, estirar 2 minutos o caminar despacio.",
    ],
  },
];
