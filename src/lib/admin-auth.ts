/**
 * Auth admin: cookie HMAC + Bearer ADMIN_API_SECRET dual.
 *
 * Cookie `vc_admin` — HttpOnly, Secure, SameSite=Strict, TTL 8h.
 * Format del valor: `${base64url(JSON payload)}.${base64url(hmac)}`.
 * Payload: `{ createdAt }`.
 *
 * requireAdmin: acepta Bearer ADMIN_API_SECRET (script/CI) O cookie firmada (UI).
 * requireAdminPage: para pages Astro — retorna `{ redirect?: string }`.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import type { AstroCookies } from "astro";
import { json } from "./api-utils";

const COOKIE_NAME = "vc_admin";
const TTL_SECONDS = 60 * 60 * 8; // 8h

interface AdminPayload {
  createdAt: number;
}

function getSecret(): string {
  const s = import.meta.env.COOKIE_SECRET || process.env.COOKIE_SECRET;
  if (!s || s.length < 32) {
    throw new Error(
      "COOKIE_SECRET no configurada o muy corta (mínimo 32 caracteres).",
    );
  }
  return s;
}

function getAdminPassword(): string | null {
  const p = import.meta.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
  return typeof p === "string" && p.length > 0 ? p : null;
}

function getAdminApiSecret(): string | null {
  const s = import.meta.env.ADMIN_API_SECRET || process.env.ADMIN_API_SECRET;
  return typeof s === "string" && s.length > 0 ? s : null;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

function safeEqualStrings(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  try {
    return timingSafeEqual(ab, bb);
  } catch {
    return false;
  }
}

export function verifyAdminPassword(candidate: string): boolean {
  const expected = getAdminPassword();
  if (!expected) return false;
  return safeEqualStrings(candidate, expected);
}

export function signAdminCookie(): string {
  const payload: AdminPayload = { createdAt: Date.now() };
  const json = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = sign(json);
  return `${json}.${sig}`;
}

export function verifyAdminCookie(raw: string | undefined | null): boolean {
  if (!raw) return false;
  const parts = raw.split(".");
  if (parts.length !== 2) return false;
  const [json, providedSig] = parts;

  const expectedSig = sign(json);
  if (!safeEqualStrings(providedSig, expectedSig)) return false;

  let payload: AdminPayload;
  try {
    payload = JSON.parse(Buffer.from(json, "base64url").toString("utf8")) as AdminPayload;
  } catch {
    return false;
  }

  if (!payload.createdAt || Date.now() - payload.createdAt > TTL_SECONDS * 1000) {
    return false;
  }
  return true;
}

export function setAdminCookie(cookies: AstroCookies): void {
  cookies.set(COOKIE_NAME, signAdminCookie(), {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: TTL_SECONDS,
  });
}

export function clearAdminCookie(cookies: AstroCookies): void {
  cookies.delete(COOKIE_NAME, { path: "/" });
}

export function readAdminCookie(cookies: AstroCookies): boolean {
  const raw = cookies.get(COOKIE_NAME)?.value;
  return verifyAdminCookie(raw);
}

/**
 * Para API endpoints. Acepta Bearer O cookie.
 * Retorna null si está autorizado, Response 401 si no.
 */
export function requireAdmin(
  request: Request,
  cookies: AstroCookies,
): Response | null {
  // 1. Bearer ADMIN_API_SECRET
  const auth = request.headers.get("authorization");
  const secret = getAdminApiSecret();
  if (auth && secret) {
    const expected = `Bearer ${secret}`;
    if (safeEqualStrings(auth, expected)) return null;
  }

  // 2. Cookie firmada
  if (readAdminCookie(cookies)) return null;

  return json({ error: "No autorizado" }, 401);
}

/**
 * Para pages Astro. Retorna `{ redirect }` si debe redirigir a login.
 * Si ya está en `/admin/login`, nunca redirige.
 */
export function requireAdminPage(
  cookies: AstroCookies,
  currentPath: string,
): { redirect?: string } {
  if (currentPath === "/admin/login") return {};
  if (readAdminCookie(cookies)) return {};
  const next = encodeURIComponent(currentPath || "/admin");
  return { redirect: `/admin/login?next=${next}` };
}
