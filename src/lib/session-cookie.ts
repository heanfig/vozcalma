/**
 * Cookie HTTP-only firmada con HMAC-SHA256 para pasar el nombre de usuario
 * desde la landing page al onboarding sin exponerlo en la URL.
 *
 * Format del valor: `${base64url(JSON payload)}.${base64url(hmac)}`
 * Payload: `{ name, sessionId, createdAt }` con TTL de 1 hora.
 *
 * Cookie config: HttpOnly, Secure, SameSite=Lax, path=/
 *
 * COOKIE_SECRET es SEPARADO de CSRF_SECRET (defense-in-depth).
 */
import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";
import type { AstroCookies } from "astro";

const COOKIE_NAME = "vc_session";
const TTL_SECONDS = 60 * 60 * 24 * 7; // 7 días — permite retomar onboarding tras pago aunque cierre navegador

export interface SessionPayload {
  name: string;
  sessionId: string;
  createdAt: number;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  coupon_code?: string;
}

export interface SessionMeta {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  coupon_code?: string;
}

function getSecret(): string {
  const s = import.meta.env.COOKIE_SECRET || process.env.COOKIE_SECRET;
  if (!s || s.length < 32) {
    throw new Error(
      "COOKIE_SECRET no configurada o muy corta (mínimo 32 caracteres). Generá una con: openssl rand -hex 32",
    );
  }
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

/**
 * Crea una nueva sesión firmada. Retorna el cookieValue + el sessionId.
 * `meta` opcional persiste UTM + coupon_code para atribución de referidos.
 */
export function createSession(
  name: string,
  meta?: SessionMeta,
): SessionPayload & { cookieValue: string } {
  return signSessionPayload(randomUUID(), name, meta);
}

/**
 * Firma un sessionId existente (caso: adoptar una sesión paga vía ?session=).
 * Útil cuando un usuario llega de un email/share-link sin cookie y necesitamos
 * que el cookie apunte al sessionId específico que ya pagó.
 */
export function signSessionPayload(
  sessionId: string,
  name: string,
  meta?: SessionMeta,
): SessionPayload & { cookieValue: string } {
  const payload: SessionPayload = {
    name,
    sessionId,
    createdAt: Date.now(),
    ...(meta?.utm_source ? { utm_source: meta.utm_source } : {}),
    ...(meta?.utm_medium ? { utm_medium: meta.utm_medium } : {}),
    ...(meta?.utm_campaign ? { utm_campaign: meta.utm_campaign } : {}),
    ...(meta?.coupon_code ? { coupon_code: meta.coupon_code } : {}),
  };
  const json = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = sign(json);
  const cookieValue = `${json}.${sig}`;
  return { ...payload, cookieValue };
}

/**
 * Lee la cookie `vc_session` del request y valida su firma + expiración.
 * Retorna el payload si es válido, null si no.
 */
export function readSession(cookies: AstroCookies): SessionPayload | null {
  const raw = cookies.get(COOKIE_NAME)?.value;
  if (!raw) return null;

  const parts = raw.split(".");
  if (parts.length !== 2) return null;
  const [json, providedSig] = parts;

  const expectedSig = sign(json);
  const a = Buffer.from(providedSig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length) return null;
  try {
    if (!timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }

  let payload: SessionPayload;
  try {
    payload = JSON.parse(Buffer.from(json, "base64url").toString("utf8")) as SessionPayload;
  } catch {
    return null;
  }

  // TTL check
  if (!payload.createdAt || Date.now() - payload.createdAt > TTL_SECONDS * 1000) {
    return null;
  }
  if (typeof payload.name !== "string" || typeof payload.sessionId !== "string") {
    return null;
  }

  return payload;
}

/**
 * Setea la cookie en la respuesta de Astro.
 */
export function setSessionCookie(cookies: AstroCookies, cookieValue: string): void {
  cookies.set(COOKIE_NAME, cookieValue, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: TTL_SECONDS,
  });
}

export function clearSessionCookie(cookies: AstroCookies): void {
  cookies.delete(COOKIE_NAME, { path: "/" });
}
