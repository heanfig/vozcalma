/**
 * Aplica supabase/migrations/001_initial.sql usando DATABASE_URL.
 * Obtén la URI en Supabase → Project Settings → Database → Connection string (URI).
 *
 * Uso: node --env-file=.env scripts/apply-migration.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error(
    "Define DATABASE_URL en .env (cadena URI con contraseña de Postgres del proyecto).",
  );
  process.exit(1);
}

const sql = readFileSync(join(root, "supabase/migrations/001_initial.sql"), "utf8");
const client = new pg.Client({ connectionString: url });

try {
  await client.connect();
  await client.query(sql);
  console.log("Migración aplicada correctamente.");
} catch (e) {
  console.error(e);
  process.exit(1);
} finally {
  await client.end();
}
