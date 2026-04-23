import type { APIRoute } from "astro";
import { json, withAdmin } from "../../../lib/api-utils";
import { getSupabaseAdmin } from "../../../lib/supabase-server";

function parseIntSafe(v: string | null, fallback: number): number {
  if (!v) return fallback;
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export const GET: APIRoute = withAdmin(async ({ url }) => {
  const supabase = getSupabaseAdmin();
  const sp = url.searchParams;
  const limit = Math.min(parseIntSafe(sp.get("limit"), 25), 100);
  const offset = parseIntSafe(sp.get("offset"), 0);
  const paid = sp.get("paid");
  const type = sp.get("type");
  const since = sp.get("since");
  const until = sp.get("until");
  const search = (sp.get("search") || "").trim();

  let query = supabase
    .from("onboarding_sessions")
    .select(
      "id, type, is_paid, paid_at, amount_cents, currency, coupon_code, audio_url, created_at, updated_at, intake_json, utm_source, utm_campaign, payment_reference",
      { count: "exact" },
    )
    .order("created_at", { ascending: false });

  if (paid === "true") query = query.eq("is_paid", true);
  if (paid === "false") query = query.eq("is_paid", false);
  if (type === "quick" || type === "deep") query = query.eq("type", type);
  if (since) query = query.gte("created_at", since);
  if (until) query = query.lte("created_at", until);
  if (search) {
    const esc = search.replace(/[%_]/g, "\\$&");
    query = query.or(
      `intake_json->>nombre.ilike.%${esc}%,intake_json->>email.ilike.%${esc}%,coupon_code.ilike.%${esc}%,payment_reference.ilike.%${esc}%`,
    );
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) return json({ error: error.message }, 500);

  return json({
    sessions: data || [],
    total: count || 0,
    limit,
    offset,
  });
});
