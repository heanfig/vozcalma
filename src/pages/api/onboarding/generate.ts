/**
 * POST /api/onboarding/generate
 *
 * Genera una meditación personalizada:
 * - Valida cookie firmada + CSRF token
 * - Aplica rate limit por sessionId
 * - Delega la lógica pesada a generateMeditation() (pipeline extraído)
 *
 * Retorna { sessionId, audioUrl, scriptText, playUrl, source }
 */
import type { APIRoute } from "astro";
import { getSupabaseAdmin } from "../../../lib/supabase-server";
import type { OnboardingType } from "../../../components/onboarding/onboarding-data";
import { json } from "../../../lib/api-utils";
import { readSession } from "../../../lib/session-cookie";
import { verifyCsrfToken } from "../../../lib/csrf";
import { rateLimit } from "../../../lib/rate-limit";
import { generateMeditation } from "../../../lib/meditation/generate-pipeline";
import { sendMeditationReadyEmail, sendMeditationFailedEmail } from "../../../lib/email";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const POST: APIRoute = async ({ request, cookies }) => {
  // --- Security: require signed session cookie + valid CSRF token ---
  const session = readSession(cookies);
  if (!session) {
    return json(
      {
        error:
          "Sesión inválida. Por favor inicia el ritual desde la página principal.",
      },
      401,
    );
  }

  const csrfHeader = request.headers.get("x-csrf-token");
  const csrf = verifyCsrfToken(csrfHeader);
  if (!csrf.valid || csrf.sessionId !== session.sessionId) {
    return json({ error: "Token CSRF inválido o expirado" }, 403);
  }

  // Rate limit: 3 generaciones por session en 10 minutos
  const rl = rateLimit(`gen:${session.sessionId}`, 3, 10 * 60 * 1000);
  if (!rl.allowed) {
    return json(
      {
        error:
          "Has generado varias meditaciones recientemente. Intenta de nuevo más tarde.",
        retryAt: rl.resetAt,
      },
      429,
    );
  }

  // --- Parse body ---
  let body: {
    type?: string;
    answers?: Record<string, string>;
    sessionId?: string | null;
    deliverByEmail?: boolean;
    email?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }

  const type = body.type as OnboardingType | undefined;
  if (!type || (type !== "quick" && type !== "deep")) {
    return json({ error: "Tipo inválido" }, 400);
  }

  const answers = body.answers ?? {};
  if (!answers.nombre?.trim()) {
    return json({ error: "Falta el nombre" }, 400);
  }

  // Input validation: cap cada answer a 2000 chars (anti-abuse)
  for (const [key, value] of Object.entries(answers)) {
    if (typeof value !== "string") {
      return json({ error: `Campo ${key} inválido` }, 400);
    }
    if (value.length > 2000) {
      answers[key] = value.slice(0, 2000);
    }
  }

  const supabase = getSupabaseAdmin();

  const { data: cookieSession, error: cookieSessionErr } = await supabase
    .from("onboarding_sessions")
    .select("id, is_paid, audio_url, script_text")
    .eq("id", session.sessionId)
    .maybeSingle();

  if (cookieSessionErr) {
    console.error("[generate] lookup session failed:", cookieSessionErr.message);
    return json({ error: "Error al validar la sesión" }, 500);
  }

  if (!cookieSession || !cookieSession.is_paid) {
    return json(
      {
        error: "Esta sesión no tiene un pago registrado. Completa el pago antes de generar la meditación.",
        requiresPayment: true,
      },
      402,
    );
  }

  if (cookieSession.audio_url) {
    return json({
      sessionId: cookieSession.id,
      audioUrl: cookieSession.audio_url,
      isPaid: true,
      scriptText: cookieSession.script_text ?? "",
      source: "cache",
    });
  }

  // --- Async mode: deliverByEmail ---
  // El usuario prefirió recibir un email cuando esté listo. Respondemos
  // inmediatamente con status "queued" y lanzamos un background job que
  // sigue ejecutando después del HTTP response (Node long-lived process).
  if (body.deliverByEmail) {
    const email = (body.email || "").trim();
    if (!email || !EMAIL_REGEX.test(email) || email.length > 254) {
      return json({ error: "Email inválido" }, 400);
    }

    // Rate limit extra: 2 emails por session en 1 hora
    const emailRl = rateLimit(`email:${session.sessionId}`, 2, 60 * 60 * 1000);
    if (!emailRl.allowed) {
      return json({ error: "Demasiados envíos por email recientes" }, 429);
    }

    void runAsyncJob({
      type,
      answers,
      email,
      name: answers.nombre || session.name,
      sessionId: session.sessionId,
    });

    return json({
      sessionId: session.sessionId,
      status: "queued",
      message: "Tu meditación se está creando. Revisa tu correo en unos minutos.",
    });
  }

  // --- Sync mode: delegate to pipeline ---
  try {
    const result = await generateMeditation({
      type,
      answers,
      existingSessionId: session.sessionId,
    });

    return json({
      sessionId: result.sessionId,
      audioUrl: result.audioUrl,
      isPaid: false,
      scriptText: result.scriptText,
      playUrl: result.playUrl,
      source: result.source,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al generar meditación";
    console.error("[generate] pipeline failed:", msg);
    return json({ error: msg }, 502);
  }
};

/**
 * Job async: genera la meditación en background y envía por email.
 * NO debe ser awaited por el caller — la Promise vive en el event loop.
 */
async function runAsyncJob(params: {
  type: OnboardingType;
  answers: Record<string, string>;
  email: string;
  name: string;
  sessionId: string;
}): Promise<void> {
  const { type, answers, email, name, sessionId } = params;
  try {
    console.log("[async-job] starting generation for", email);
    const result = await generateMeditation({
      type,
      answers,
      existingSessionId: sessionId,
    });
    console.log("[async-job] generation complete, sending email to", email);
    await sendMeditationReadyEmail({
      email,
      name,
      playUrl: result.playUrl,
    });
    console.log("[async-job] email sent successfully to", email);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[async-job] failed:", msg);
    // Intentar notificar al usuario del fallo
    try {
      await sendMeditationFailedEmail({ email, name });
    } catch (emailErr) {
      console.error("[async-job] fallback email also failed:", emailErr);
    }
  }
}
