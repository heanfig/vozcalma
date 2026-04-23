import type { APIRoute } from "astro";
import { json } from "../../../lib/api-utils";
import { setAdminCookie, verifyAdminPassword } from "../../../lib/admin-auth";
import { rateLimit } from "../../../lib/rate-limit";

type Body = {
  password?: string;
};

function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export const POST: APIRoute = async ({ request, cookies }) => {
  const ip = clientIp(request);
  const rl = rateLimit(`admin-login:${ip}`, 5, 5 * 60 * 1000);
  if (!rl.allowed) {
    return json(
      { error: "Demasiados intentos. Espera unos minutos." },
      429,
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }

  const password = (body.password || "").trim();
  if (!password) {
    return json({ error: "Contraseña requerida" }, 400);
  }

  if (!verifyAdminPassword(password)) {
    return json({ error: "Contraseña incorrecta" }, 401);
  }

  setAdminCookie(cookies);
  return json({ ok: true });
};
