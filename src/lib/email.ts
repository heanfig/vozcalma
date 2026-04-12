/**
 * Wrapper de Resend para envío de emails transaccionales.
 *
 * Template en español, branded con colores de VozCalma.
 *
 * ENV:
 * - RESEND_API_KEY: API key de Resend (https://resend.com/api-keys)
 * - EMAIL_FROM: Remitente con dominio verificado (ej "VozCalma <noreply@vozcalma.app>")
 */
import { Resend } from "resend";

let client: Resend | null = null;

function getApiKey(): string {
  const key =
    (import.meta.env.RESEND_API_KEY as string | undefined) ||
    process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error("RESEND_API_KEY no configurada");
  }
  return key;
}

function getClient(): Resend {
  if (client) return client;
  client = new Resend(getApiKey());
  return client;
}

function getFrom(): string {
  return (
    (import.meta.env.EMAIL_FROM as string | undefined) ||
    process.env.EMAIL_FROM ||
    "VozCalma <noreply@vozcalma.app>"
  );
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return map[c] || c;
  });
}

// ============================================================================
// Template: meditación lista
// ============================================================================

export async function sendMeditationReadyEmail(params: {
  email: string;
  name: string;
  playUrl: string;
}): Promise<void> {
  const { email, name, playUrl } = params;
  const safeName = escapeHtml(name);
  const safePlayUrl = escapeHtml(playUrl);

  const html = `<!doctype html>
<html lang="es">
<body style="margin:0;padding:32px;font-family:'Plus Jakarta Sans',system-ui,sans-serif;background:#F5F3F5;color:#1b1c1e">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:24px;padding:40px;box-shadow:0 8px 34px rgba(79,23,206,.08)">
    <p style="font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#4f17ce;font-weight:700;margin:0 0 8px">VozCalma</p>
    <h1 style="font-family:'Noto Serif',serif;font-size:28px;line-height:1.2;margin:8px 0 16px;color:#1b1c1e">
      Tu meditación está lista, ${safeName}
    </h1>
    <p style="color:#484455;line-height:1.7;font-size:16px;margin:16px 0">
      Tu sesión personalizada ya fue creada. Busca un momento de calma, ponte los audífonos y dale play cuando estés listo/a.
    </p>
    <p style="margin:32px 0 24px">
      <a href="${safePlayUrl}" style="display:inline-block;background:#4f17ce;color:#fff;padding:14px 28px;border-radius:999px;text-decoration:none;font-weight:600;font-size:15px">
        Escuchar mi meditación
      </a>
    </p>
    <p style="color:#7a7a85;font-size:12px;margin:24px 0 0;line-height:1.5">
      Este enlace expira en 90 días. Fue creado exclusivamente para ti.
    </p>
  </div>
  <p style="text-align:center;color:#7a7a85;font-size:11px;margin-top:24px">
    © ${new Date().getFullYear()} VozCalma — El Santuario Digital
  </p>
</body>
</html>`;

  const res = await getClient().emails.send({
    from: getFrom(),
    to: email,
    subject: `🕊️ Tu meditación está lista, ${name}`,
    html,
  });

  if (res.error) {
    throw new Error(`Resend error: ${res.error.message}`);
  }
}

// ============================================================================
// Template: meditación falló
// ============================================================================

export async function sendMeditationFailedEmail(params: {
  email: string;
  name: string;
}): Promise<void> {
  const { email, name } = params;
  const safeName = escapeHtml(name);

  const html = `<!doctype html>
<html lang="es">
<body style="margin:0;padding:32px;font-family:'Plus Jakarta Sans',system-ui,sans-serif;background:#F5F3F5;color:#1b1c1e">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:24px;padding:40px;box-shadow:0 8px 34px rgba(79,23,206,.08)">
    <p style="font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#4f17ce;font-weight:700;margin:0 0 8px">VozCalma</p>
    <h1 style="font-family:'Noto Serif',serif;font-size:24px;line-height:1.2;margin:8px 0 16px;color:#1b1c1e">
      Hola ${safeName}, algo salió mal
    </h1>
    <p style="color:#484455;line-height:1.7;font-size:16px;margin:16px 0">
      No pudimos terminar de crear tu meditación en este momento. No te preocupes — puedes intentarlo de nuevo cuando quieras.
    </p>
    <p style="margin:32px 0 24px">
      <a href="https://vozcalma.app" style="display:inline-block;background:#4f17ce;color:#fff;padding:14px 28px;border-radius:999px;text-decoration:none;font-weight:600;font-size:15px">
        Volver a intentar
      </a>
    </p>
    <p style="color:#7a7a85;font-size:12px;margin:24px 0 0">
      Si el problema continúa, responde a este correo y te ayudaremos.
    </p>
  </div>
</body>
</html>`;

  const res = await getClient().emails.send({
    from: getFrom(),
    to: email,
    subject: `🌱 Hola ${name}, tuvimos un problema con tu meditación`,
    html,
  });

  if (res.error) {
    throw new Error(`Resend error: ${res.error.message}`);
  }
}
