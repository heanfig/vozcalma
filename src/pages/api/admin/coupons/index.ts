import type { APIRoute } from "astro";
import { json, withAdmin } from "../../../../lib/api-utils";
import { getSupabaseAdmin } from "../../../../lib/supabase-server";

type DiscountType = "full" | "percent" | "fixed";

interface CreateBody {
  code?: string;
  description?: string | null;
  discount_type?: DiscountType;
  discount_value?: number;
  max_uses?: number | null;
  valid_until?: string | null;
  is_active?: boolean;
  notes?: string | null;
}

export const GET: APIRoute = withAdmin(async () => {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("coupons")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return json({ error: error.message }, 500);
  return json({ coupons: data || [] });
});

export const POST: APIRoute = withAdmin(async ({ request }) => {
  let body: CreateBody;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }

  const code = (body.code || "").trim().toUpperCase();
  if (!/^[A-Z0-9_-]{3,32}$/.test(code)) {
    return json(
      { error: "Código inválido (3-32, A-Z 0-9 _ -)" },
      400,
    );
  }
  const discountType = body.discount_type;
  if (discountType !== "full" && discountType !== "percent" && discountType !== "fixed") {
    return json({ error: "discount_type inválido" }, 400);
  }
  const discountValue = Number(body.discount_value || 0);
  if (!Number.isFinite(discountValue) || discountValue < 0) {
    return json({ error: "discount_value inválido" }, 400);
  }
  if (discountType === "percent" && discountValue > 100) {
    return json({ error: "percent no puede pasar 100" }, 400);
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("coupons")
    .insert({
      code,
      description: body.description ?? null,
      discount_type: discountType,
      discount_value: discountValue,
      max_uses: body.max_uses ?? null,
      valid_until: body.valid_until ?? null,
      is_active: body.is_active ?? true,
      notes: body.notes ?? null,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      return json({ error: "Ya existe un cupón con ese código" }, 409);
    }
    return json({ error: error.message }, 500);
  }

  return json({ coupon: data });
});
