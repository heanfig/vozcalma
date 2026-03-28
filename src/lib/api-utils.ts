/**
 * Utilidades compartidas para endpoints de API.
 */

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
