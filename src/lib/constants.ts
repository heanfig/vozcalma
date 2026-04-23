export const SCRIPT_PREFIX = "SCRIPT::";
export const SCRIPT_END_MARKER = "---FIN_GUIÓN---";

/** Días de expiración para play_links compartibles. */
export const PLAY_LINK_EXPIRATION_DAYS = 90;

/** Precios tiered por tipo de sesión (en centavos COP). */
export const PRICE_QUICK_COP_CENTS = 1300000; // ~$3 USD
export const PRICE_DEEP_COP_CENTS = 2600000;  // ~$6 USD

/** @deprecated usa `getPriceForType()`. Mantenido para compatibilidad transitiva. */
export const PRICE_COP_CENTS = PRICE_DEEP_COP_CENTS;

export function getPriceForType(type: "quick" | "deep"): number {
  return type === "quick" ? PRICE_QUICK_COP_CENTS : PRICE_DEEP_COP_CENTS;
}

/** Moneda para pagos (ISO 4217). */
export const CURRENCY = "COP";

/** URL del Checkout Web de Wompi. */
export const WOMPI_CHECKOUT_URL = "https://checkout.wompi.co/p/";

/**
 * Soporte WhatsApp — formato internacional sin `+` ni espacios (para wa.me)
 * y versión legible para mostrar. TODO: reemplazar con el número real.
 */
export const WHATSAPP_SUPPORT_NUMBER = "573001234567";
export const WHATSAPP_SUPPORT_DISPLAY = "+57 300 123 4567";
export const WHATSAPP_SUPPORT_URL = `https://wa.me/${WHATSAPP_SUPPORT_NUMBER}?text=${encodeURIComponent(
  "Hola VozCalma, tengo un problema con mi pago.",
)}`;

/** Extrae el texto limpio del guion desde el contenido raw de un mensaje system. */
export function extractScript(raw: string): string {
  return raw
    .replace(SCRIPT_PREFIX, "")
    .split(SCRIPT_END_MARKER)[0]
    .trim();
}
