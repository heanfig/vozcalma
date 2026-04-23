/**
 * Utilidades compartidas para endpoints de API.
 */
import type { APIContext, APIRoute } from "astro";
import { requireAdmin } from "./admin-auth";

export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Extrae el userId de Clerk del contexto.
 * Retorna el userId (string) si está autenticado, o un Response 401 si no.
 */
export function requireAuth(context: { locals: { auth: () => { userId: string | null } } }): string | Response {
  const { userId } = context.locals.auth();
  if (!userId) return json({ error: "No autorizado" }, 401);
  return userId;
}

/**
 * Wrapper para endpoints admin. Valida dual auth (Bearer ADMIN_API_SECRET O cookie
 * firmada `vc_admin`) antes de invocar el handler.
 */
export function withAdmin(handler: APIRoute): APIRoute {
  return async (context: APIContext) => {
    const denied = requireAdmin(context.request, context.cookies);
    if (denied) return denied;
    return handler(context);
  };
}
