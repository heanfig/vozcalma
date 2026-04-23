import type { APIRoute } from "astro";
import { json } from "../../../lib/api-utils";
import { clearAdminCookie } from "../../../lib/admin-auth";

export const POST: APIRoute = async ({ cookies }) => {
  clearAdminCookie(cookies);
  return json({ ok: true });
};
