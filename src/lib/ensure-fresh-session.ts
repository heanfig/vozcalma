/**
 * Si la cookie `vc_session` apunta a un onboarding_session que ya está pagado
 * (flow anterior completado), rotamos el sessionId conservando nombre/UTM.
 *
 * Esto evita el caso en que un usuario con cookie persistente intente iniciar
 * una nueva meditación y obtenga "Esta sesión ya fue pagada" en checkout.
 *
 * Debe ejecutarse al inicio de las páginas de onboarding, ANTES de firmar el
 * CSRF token, para que todo (cookie, CSRF, sessionId rendered) quede alineado.
 */
import type { AstroCookies } from "astro";
import {
  readSession,
  createSession,
  setSessionCookie,
  type SessionPayload,
} from "./session-cookie";
import { getSupabaseAdmin } from "./supabase-server";

export async function ensureFreshSession(
  cookies: AstroCookies,
): Promise<SessionPayload | null> {
  const session = readSession(cookies);
  if (!session) return null;

  const supabase = getSupabaseAdmin();
  const { data: row } = await supabase
    .from("onboarding_sessions")
    .select("is_paid, audio_url")
    .eq("id", session.sessionId)
    .maybeSingle();

  // Solo rotamos si la sesión está consumida (audio entregado). Si está paga
  // pero sin audio, el usuario está en medio del flow (intake) y debe
  // conservar la misma sessionId para que el endpoint /generate la encuentre.
  if (!row || !row.is_paid || !row.audio_url) return session;

  const fresh = createSession(session.name, {
    utm_source: session.utm_source,
    utm_medium: session.utm_medium,
    utm_campaign: session.utm_campaign,
    coupon_code: session.coupon_code,
  });
  setSessionCookie(cookies, fresh.cookieValue);
  return {
    name: fresh.name,
    sessionId: fresh.sessionId,
    createdAt: fresh.createdAt,
    utm_source: fresh.utm_source,
    utm_medium: fresh.utm_medium,
    utm_campaign: fresh.utm_campaign,
    coupon_code: fresh.coupon_code,
  };
}
