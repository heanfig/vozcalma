import type { APIRoute } from "astro";
import { json, withAdmin } from "../../../../lib/api-utils";
import { getSupabaseAdmin } from "../../../../lib/supabase-server";

type DiscountType = "full" | "percent" | "fixed";

interface PatchBody {
  description?: string | null;
  discount_type?: DiscountType;
  discount_value?: number;
  max_uses?: number | null;
  valid_until?: string | null;
  is_active?: boolean;
  notes?: string | null;
}

export const GET: APIRoute = withAdmin(async ({ params }) => {
  const code = (params.code || "").toUpperCase();
  if (!code) return json({ error: "code requerido" }, 400);

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("coupons")
    .select("*")
    .eq("code", code)
    .maybeSingle();
  if (error) return json({ error: error.message }, 500);
  if (!data) return json({ error: "Cupón no encontrado" }, 404);
  return json({ coupon: data });
});

export const PATCH: APIRoute = withAdmin(async ({ request, params }) => {
  const code = (params.code || "").toUpperCase();
  if (!code) return json({ error: "code requerido" }, 400);

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }

  const update: Record<string, unknown> = {};
  if ("description" in body) update.description = body.description ?? null;
  if ("discount_type" in body) {
    if (
      body.discount_type !== "full" &&
      body.discount_type !== "percent" &&
      body.discount_type !== "fixed"
    ) {
      return json({ error: "discount_type inválido" }, 400);
    }
    update.discount_type = body.discount_type;
  }
  if ("discount_value" in body) {
    const v = Number(body.discount_value);
    if (!Number.isFinite(v) || v < 0) {
      return json({ error: "discount_value inválido" }, 400);
    }
    update.discount_value = v;
  }
  if ("max_uses" in body) update.max_uses = body.max_uses ?? null;
  if ("valid_until" in body) update.valid_until = body.valid_until ?? null;
  if ("is_active" in body) update.is_active = !!body.is_active;
  if ("notes" in body) update.notes = body.notes ?? null;

  if (Object.keys(update).length === 0) {
    return json({ error: "Nada para actualizar" }, 400);
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("coupons")
    .update(update)
    .eq("code", code)
    .select("*")
    .maybeSingle();
  if (error) return json({ error: error.message }, 500);
  if (!data) return json({ error: "Cupón no encontrado" }, 404);
  return json({ coupon: data });
});
