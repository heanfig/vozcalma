import type { APIRoute } from "astro";
import { json, withAdmin } from "../../../lib/api-utils";
import { getSupabaseAdmin } from "../../../lib/supabase-server";

export const GET: APIRoute = withAdmin(async ({ url }) => {
  const supabase = getSupabaseAdmin();
  const sp = url.searchParams;
  const granularity = (sp.get("granularity") || "day") === "month" ? "month" : "day";
  const since = sp.get("since");
  const until = sp.get("until");

  let query = supabase
    .from("meditation_costs")
    .select("created_at, llm_cost_usd, tts_cost_usd, source, session_id, tts_chars, llm_total_tokens")
    .order("created_at", { ascending: false })
    .limit(5000);

  if (since) query = query.gte("created_at", since);
  if (until) query = query.lte("created_at", until);

  const { data, error } = await query;
  if (error) return json({ error: error.message }, 500);

  // Agregar por granularidad
  const buckets = new Map<
    string,
    { generations: number; llm_usd: number; tts_usd: number; total_usd: number; pregen: number }
  >();

  for (const row of data || []) {
    const d = new Date(row.created_at as string);
    const key =
      granularity === "month"
        ? `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
        : d.toISOString().slice(0, 10);
    const bucket =
      buckets.get(key) ||
      { generations: 0, llm_usd: 0, tts_usd: 0, total_usd: 0, pregen: 0 };
    bucket.generations++;
    bucket.llm_usd += Number(row.llm_cost_usd || 0);
    bucket.tts_usd += Number(row.tts_cost_usd || 0);
    bucket.total_usd = bucket.llm_usd + bucket.tts_usd;
    if (row.source === "pregen") bucket.pregen++;
    buckets.set(key, bucket);
  }

  const series = Array.from(buckets.entries())
    .map(([period, v]) => ({ period, ...v }))
    .sort((a, b) => (a.period < b.period ? 1 : -1));

  // Top sesiones más caras (de los últimos `data`)
  const topExpensive = (data || [])
    .map((r) => ({
      session_id: r.session_id,
      total_usd: Number(r.llm_cost_usd || 0) + Number(r.tts_cost_usd || 0),
      llm_usd: Number(r.llm_cost_usd || 0),
      tts_usd: Number(r.tts_cost_usd || 0),
      tts_chars: r.tts_chars,
      llm_total_tokens: r.llm_total_tokens,
      created_at: r.created_at,
    }))
    .sort((a, b) => b.total_usd - a.total_usd)
    .slice(0, 20);

  return json({ series, top_expensive: topExpensive, total_rows: data?.length || 0 });
});
