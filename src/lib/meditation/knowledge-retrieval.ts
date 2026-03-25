import type { SupabaseClient } from "@supabase/supabase-js";
import type { IntakeData } from "./intake";

const RAG_TOP_K = 2;

/**
 * Normaliza la emoción del intake a una clave corta para coincidir con `emotion_key` en BD.
 */
export function emotionKeyFromIntake(intake: IntakeData): string {
  const raw = (intake.emotion ?? "").trim().toLowerCase();
  if (!raw) return "general";
  if (/ansiedad|ansios|nervio|preocup/i.test(raw)) return "ansiedad";
  if (/estr[eé]s|agobi|presi[oó]n/i.test(raw)) return "estres";
  if (/cansancio|agot|fatiga/i.test(raw)) return "cansancio";
  if (/triste|tristeza|baj[oó]n/i.test(raw)) return "tristeza";
  if (/ira|rabia|enojo|enfado/i.test(raw)) return "ira";
  return "general";
}

export type KnowledgeRetrievalResult = {
  styleHints: string[];
};

/**
 * Recupera hasta K líneas de estilo aprobadas (RAG barato: resúmenes, no guiones enteros).
 * Si la tabla no existe o falla la consulta, devuelve array vacío.
 */
export async function fetchKnowledgeStyleHints(
  supabase: SupabaseClient,
  intake: IntakeData,
): Promise<KnowledgeRetrievalResult> {
  const key = emotionKeyFromIntake(intake);
  try {
    const { data, error } = await supabase
      .from("meditation_knowledge_snippets")
      .select("snippet_text, emotion_key")
      .eq("is_active", true)
      .in("emotion_key", [key, "general"]);

    if (error || !data?.length) {
      return { styleHints: [] };
    }

    const score = (k: string) => (k === key ? 0 : k === "general" ? 1 : 2);
    const merged = [...data].sort(
      (a, b) => score(a.emotion_key) - score(b.emotion_key),
    );
    const seen = new Set<string>();
    const styleHints: string[] = [];
    for (const row of merged) {
      const t = String(row.snippet_text || "").trim();
      if (!t || seen.has(t)) continue;
      seen.add(t);
      styleHints.push(t);
      if (styleHints.length >= RAG_TOP_K) break;
    }
    return { styleHints };
  } catch {
    return { styleHints: [] };
  }
}
