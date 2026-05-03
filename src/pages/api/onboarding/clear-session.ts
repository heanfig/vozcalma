/**
 * POST /api/onboarding/clear-session
 *
 * Limpia la cookie `vc_session` para permitir que otra persona use el mismo
 * navegador sin heredar el nombre/saludo del usuario anterior.
 */
import type { APIRoute } from "astro";
import { json } from "../../../lib/api-utils";
import { clearSessionCookie } from "../../../lib/session-cookie";

export const POST: APIRoute = async ({ cookies }) => {
  clearSessionCookie(cookies);
  return json({ ok: true });
};
