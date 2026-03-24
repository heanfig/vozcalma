import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let admin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (admin) return admin;
  const url = import.meta.env.SUPABASE_URL;
  const key =
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY ||
    import.meta.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error(
      "Configura SUPABASE_URL y una clave de servidor: SUPABASE_SERVICE_ROLE_KEY (JWT service_role) o SUPABASE_SECRET_KEY (sb_secret_… en Project Settings → API).",
    );
  }
  admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return admin;
}
