/**
 * Wrapper server-side para Wompi (pasarela de pago Colombia).
 *
 * Responsabilidades:
 * - Generar firma de integridad SHA256 para el Checkout Web.
 * - Construir URL del Checkout Web con params firmados.
 * - Validar firmas de webhooks de eventos con WOMPI_EVENTS_SECRET.
 * - Consultar estado de transacciones vía API REST.
 *
 * Todas las claves privadas se leen de env vars y NUNCA se exponen al cliente.
 */
import { createHash, timingSafeEqual } from "node:crypto";
import { WOMPI_CHECKOUT_URL, CURRENCY } from "./constants";

function env(key: string): string {
  const v = import.meta.env[key] || process.env[key];
  if (!v) throw new Error(`${key} no configurada`);
  return v;
}

function envOptional(key: string): string | undefined {
  return (import.meta.env[key] || process.env[key]) as string | undefined;
}

function isProduction(): boolean {
  return (envOptional("WOMPI_ENVIRONMENT") || "test").toLowerCase() === "production";
}

/** Base URL de la API de Wompi según el ambiente. */
export function getWompiApiBase(): string {
  return isProduction()
    ? "https://production.wompi.co/v1"
    : "https://sandbox.wompi.co/v1";
}

/**
 * Genera la firma de integridad SHA256 para el Checkout Web.
 * Cadena: reference + amountInCents + currency + integritySecret
 */
export function generateIntegritySignature(
  reference: string,
  amountInCents: number,
  currency: string = CURRENCY,
): string {
  const secret = env("WOMPI_INTEGRITY_SECRET");
  const payload = `${reference}${amountInCents}${currency}${secret}`;
  return createHash("sha256").update(payload).digest("hex");
}

/**
 * Genera una referencia única para la transacción. Formato:
 *   vc-<sessionId>-<timestamp>
 * Suficientemente único y determinístico por sesión.
 */
export function generateReference(sessionId: string): string {
  const ts = Date.now();
  return `vc-${sessionId}-${ts}`;
}

export interface CheckoutParams {
  reference: string;
  amountInCents: number;
  redirectUrl: string;
  customerEmail?: string;
  customerName?: string;
  currency?: string;
}

/**
 * Construye la URL del Checkout Web de Wompi con todos los params firmados.
 * El usuario se redirige a esta URL (method GET).
 */
export function buildCheckoutUrl(params: CheckoutParams): string {
  const publicKey = env("WOMPI_PUBLIC_KEY");
  const currency = params.currency || CURRENCY;
  const signature = generateIntegritySignature(
    params.reference,
    params.amountInCents,
    currency,
  );

  const query = new URLSearchParams({
    "public-key": publicKey,
    currency,
    "amount-in-cents": String(params.amountInCents),
    reference: params.reference,
    "signature:integrity": signature,
    "redirect-url": params.redirectUrl,
  });

  if (params.customerEmail) {
    query.set("customer-data:email", params.customerEmail);
  }
  if (params.customerName) {
    query.set("customer-data:full-name", params.customerName);
  }

  return `${WOMPI_CHECKOUT_URL}?${query.toString()}`;
}

/**
 * Valida la firma del webhook de eventos.
 * Wompi firma con SHA256 sobre la concatenación de valores + timestamp + eventsSecret.
 * Ver: https://docs.wompi.co/docs/colombia/eventos/
 *
 * El payload del evento incluye:
 *   signature: { properties: ["transaction.id", "transaction.status", ...], checksum: "<hex>" }
 * La cadena a hashear es: <valor_prop1><valor_prop2>...<timestamp><events_secret>
 */
export function verifyWebhookSignature(
  body: {
    signature?: { properties?: string[]; checksum?: string };
    timestamp?: number | string;
    data?: unknown;
  },
): boolean {
  const secret = envOptional("WOMPI_EVENTS_SECRET");
  if (!secret) return false;

  const sig = body?.signature;
  const properties = sig?.properties;
  const checksum = sig?.checksum;
  const timestamp = body?.timestamp;

  if (!properties || !Array.isArray(properties) || !checksum || timestamp == null) {
    return false;
  }

  const values: string[] = [];
  for (const prop of properties) {
    const value = resolvePath(body.data, prop);
    if (value == null) return false;
    values.push(String(value));
  }

  const toHash = values.join("") + String(timestamp) + secret;
  const expected = createHash("sha256").update(toHash).digest("hex");

  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(String(checksum).toLowerCase(), "hex");
  if (a.length === 0 || a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function resolvePath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

export interface WompiTransaction {
  id: string;
  reference: string;
  status: "APPROVED" | "DECLINED" | "PENDING" | "ERROR" | "VOIDED";
  amount_in_cents: number;
  currency: string;
  created_at: string;
  finalized_at?: string;
  payment_method_type?: string;
  payment_method?: Record<string, unknown>;
  customer_email?: string;
}

/**
 * Consulta el estado de una transacción vía API REST de Wompi.
 * Usado como fallback cuando el webhook aún no ha llegado al volver del redirect.
 */
export async function fetchTransactionStatus(
  transactionId: string,
): Promise<WompiTransaction | null> {
  const base = getWompiApiBase();
  const res = await fetch(`${base}/transactions/${encodeURIComponent(transactionId)}`, {
    headers: {
      Authorization: `Bearer ${env("WOMPI_PRIVATE_KEY")}`,
    },
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { data?: WompiTransaction };
  return body.data ?? null;
}
