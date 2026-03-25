/**
 * Exporta guiones aprobados para fine-tuning (formato JSONL tipo OpenAI: messages[]).
 *
 * Criterio de inclusión:
 * - Fila en `meditation_artifacts` con `approved_for_training = true`
 * - `script_text` no nulo y con longitud mínima razonable
 *
 * Marcar filas: `update meditation_artifacts set approved_for_training = true where session_id = '…';`
 *
 * Uso: node --env-file=.env scripts/export-training-jsonl.mjs [salida.jsonl]
 */
import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "node:fs";

const outPath = process.argv[2] || "training-meditations.jsonl";

const url = process.env.SUPABASE_URL;
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error(
    "Requiere SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY o SUPABASE_SECRET_KEY.",
  );
  process.exit(1);
}

const SYSTEM =
  "Eres un guionista experto en meditación guiada en español LATAM. Tu salida es solo el guion para TTS, sin encabezados técnicos.";

function buildUserContent(row) {
  const intake = row.intake_json || {};
  const plan = row.plan_json || {};
  const parts = [
    `Emoción: ${intake.emotion ?? ""}`,
    `Contexto: ${intake.context ?? ""}`,
    `Cuerpo/mente: ${intake.bodySignals ?? ""}`,
    `Estado deseado: ${intake.desiredState ?? ""}`,
    plan?.sections
      ? `Plan (referencia): ${JSON.stringify(plan.sections)}`
      : "",
  ];
  return parts.filter(Boolean).join("\n");
}

function stripFinMarker(text) {
  const t = String(text || "");
  const idx = t.indexOf("---FIN_GUIÓN---");
  return idx >= 0 ? t.slice(0, idx).trim() : t.trim();
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data, error } = await supabase
  .from("meditation_artifacts")
  .select("intake_json, plan_json, script_text")
  .eq("approved_for_training", true)
  .not("script_text", "is", null);

if (error) {
  console.error(error.message);
  process.exit(1);
}

const rows = (data || []).filter(
  (r) => r.script_text && String(r.script_text).trim().length >= 80,
);

let lines = 0;
const chunks = [];
for (const row of rows) {
  const assistant = stripFinMarker(row.script_text);
  if (!assistant) continue;
  const record = {
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: buildUserContent(row) },
      { role: "assistant", content: assistant },
    ],
  };
  chunks.push(JSON.stringify(record));
  lines += 1;
}

writeFileSync(outPath, chunks.join("\n") + (chunks.length ? "\n" : ""), "utf8");
console.log(`Escritas ${lines} líneas en ${outPath}`);
