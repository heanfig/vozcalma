import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { track, trackError } from "../../lib/analytics";
import { TYPE_VISUALS } from "./session-visuals";
import { WHATSAPP_SUPPORT_URL, WHATSAPP_SUPPORT_DISPLAY } from "../../lib/constants";

interface Props {
  type: "quick" | "deep";
  userName: string;
  initialCouponCode?: string;
  onPaid: (sessionId: string) => void;
  onBack?: () => void;
}

interface CouponStatus {
  state: "idle" | "validating" | "valid" | "invalid";
  code?: string;
  reason?: string;
  discountType?: "full" | "percent" | "fixed";
  finalAmountCents?: number;
  description?: string;
}

const PRICE_BY_TYPE: Record<"quick" | "deep", number> = {
  quick: 1300000, // $13.000 COP (~$3 USD)
  deep: 2600000,  // $26.000 COP (~$6 USD)
};

function formatCOP(cents: number): string {
  const pesos = Math.round(cents / 100);
  return `$${pesos.toLocaleString("es-CO")}`;
}

function getCsrfToken(): string {
  if (typeof document === "undefined") return "";
  return (
    document
      .querySelector('meta[name="csrf-token"]')
      ?.getAttribute("content") || ""
  );
}

export default function WompiCheckout({
  type,
  userName,
  initialCouponCode,
  onPaid,
  onBack,
}: Props) {
  const [couponInput, setCouponInput] = useState(initialCouponCode || "");
  const [coupon, setCoupon] = useState<CouponStatus>({ state: "idle" });
  const [couponOpen, setCouponOpen] = useState(!!initialCouponCode);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visual = TYPE_VISUALS[type];

  const validateCoupon = useCallback(async (rawCode: string) => {
    const code = rawCode.trim();
    if (!code) {
      setCoupon({ state: "idle" });
      return;
    }
    setCoupon({ state: "validating" });
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": getCsrfToken(),
        },
        credentials: "same-origin",
        body: JSON.stringify({ code, type }),
      });
      const data = (await res.json()) as {
        valid: boolean;
        reason?: string;
        code?: string;
        discountType?: "full" | "percent" | "fixed";
        finalAmountCents?: number;
        description?: string;
      };
      if (!res.ok || !data.valid) {
        setCoupon({ state: "invalid", reason: data.reason });
        track("checkout_coupon_rejected", { reason: data.reason || "unknown" });
        return;
      }
      setCoupon({
        state: "valid",
        code: data.code,
        discountType: data.discountType,
        finalAmountCents: data.finalAmountCents,
        description: data.description,
      });
      track("checkout_coupon_applied", {
        code: data.code,
        discount_type: data.discountType,
        final_amount_cents: data.finalAmountCents,
      });
    } catch (e) {
      setCoupon({ state: "invalid", reason: "network" });
      trackError(e, { context: "validateCoupon" });
    }
  }, [type]);

  useEffect(() => {
    track("checkout_viewed", { type, has_initial_coupon: !!initialCouponCode });
    if (initialCouponCode) validateCoupon(initialCouponCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCouponChange = (value: string) => {
    setCouponInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setCoupon({ state: "idle" });
      return;
    }
    debounceRef.current = setTimeout(() => validateCoupon(value), 500);
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    const couponCode =
      coupon.state === "valid" ? coupon.code : undefined;
    track("onboarding_payment_initiated", {
      type,
      has_coupon: !!couponCode,
      coupon_code: couponCode,
    });
    try {
      const res = await fetch("/api/payment/initiate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": getCsrfToken(),
        },
        credentials: "same-origin",
        body: JSON.stringify({ type, couponCode }),
      });
      const data = (await res.json()) as {
        skip_checkout?: boolean;
        checkout_url?: string;
        sessionId?: string;
        reference?: string;
        error?: string;
        shouldRefresh?: boolean;
      };
      if (!res.ok) {
        if (data.shouldRefresh) {
          window.location.reload();
          return;
        }
        setError(data.error || "No se pudo iniciar el pago");
        setSubmitting(false);
        return;
      }
      if (data.skip_checkout && data.sessionId) {
        onPaid(data.sessionId);
        return;
      }
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
        return;
      }
      setError("Respuesta inesperada del servidor");
      setSubmitting(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error de red";
      setError(msg);
      trackError(e, { context: "initiatePayment", type });
      setSubmitting(false);
    }
  };

  const basePriceCents = PRICE_BY_TYPE[type];
  const finalAmount =
    coupon.state === "valid" && typeof coupon.finalAmountCents === "number"
      ? coupon.finalAmountCents
      : basePriceCents;
  const isFree = finalAmount === 0;
  const hasDiscount =
    coupon.state === "valid" && finalAmount < basePriceCents;

  const reasonCopy: Record<string, string> = {
    not_found: "Código no encontrado",
    inactive: "Este código ya no está disponible",
    expired: "Este código expiró",
    exhausted: "Este código llegó a su límite de usos",
    invalid_code: "Formato de código inválido",
    network: "Error de conexión, reintenta",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ type: "spring", stiffness: 200, damping: 24 }}
      className="min-h-screen bg-surface text-on-surface font-body flex flex-col"
    >
      <header className="w-full sticky top-0 z-40 bg-surface/80 backdrop-blur-md">
        <div className="flex justify-between items-center px-6 py-4 w-full max-w-2xl mx-auto">
          {onBack ? (
            <button
              onClick={onBack}
              className="text-on-surface-variant/70 hover:text-on-surface transition-colors flex items-center gap-1 text-sm"
              aria-label="Volver"
            >
              <span className="material-symbols-outlined text-lg">arrow_back</span>
              Volver
            </button>
          ) : (
            <span />
          )}
          <span className="font-headline italic font-medium text-primary">
            VozCalma
          </span>
        </div>
      </header>

      <main className="flex flex-col items-center w-full max-w-2xl mx-auto px-6 py-8 md:py-12 space-y-8 flex-grow">
        <section className="text-center space-y-4 w-full">
          <h1 className="font-headline text-3xl md:text-4xl font-bold tracking-tight text-on-surface leading-[1.1]">
            {userName ? `${userName}, ` : ""}tu sesión te espera
          </h1>
          <p className="text-on-surface-variant text-base md:text-lg max-w-lg mx-auto leading-relaxed">
            {type === "quick"
              ? "Alivio rápido personalizado creado con IA solo para ti."
              : "Una sesión profunda de reprogramación diseñada con intención."}
          </p>
        </section>

        {/* Hero card del plan */}
        <section className="w-full">
          <div className="relative overflow-hidden rounded-[2rem] aspect-[3/2] md:aspect-[16/9] diffusion-shadow">
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent z-10" />
            <img
              src={visual.image}
              alt={visual.alt}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute bottom-0 left-0 right-0 p-5 md:p-8 z-20">
              <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md text-white rounded-full text-[10px] sm:text-xs font-semibold tracking-widest uppercase mb-2">
                {visual.badge}
              </span>
              <h2 className="font-headline text-2xl md:text-3xl text-white">
                {visual.title}
              </h2>
            </div>
          </div>
        </section>

        <section className="w-full">
          <div className="bg-surface-container-lowest rounded-[2rem] p-7 md:p-9 border border-outline-variant/30 diffusion-shadow space-y-6">
            {/* Precio */}
            <div className="text-center">
              {hasDiscount && !isFree && (
                <div className="text-sm text-on-surface-variant/70 line-through">
                  {formatCOP(basePriceCents)} COP
                </div>
              )}
              <div
                className={`font-headline font-bold ${
                  isFree ? "text-4xl text-tertiary" : "text-4xl md:text-5xl text-primary"
                }`}
              >
                {isFree ? "¡Gratis!" : `${formatCOP(finalAmount)} COP`}
              </div>
              <p className="text-xs text-on-surface-variant mt-2">
                {isFree
                  ? "Tu código da acceso completo sin cargo"
                  : "Pago único · acceso permanente"}
              </p>
            </div>

            {/* CTA */}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-primary text-on-primary py-5 rounded-full font-semibold text-base md:text-lg hover:bg-primary-container transition-all active:scale-[0.98] duration-200 shadow-lg shadow-primary/20 disabled:opacity-60 disabled:cursor-wait"
            >
              {submitting
                ? "Procesando..."
                : isFree
                  ? "Continuar gratis"
                  : `Pagar ${formatCOP(finalAmount)} COP con Wompi`}
            </button>
            {error && (
              <p className="text-error text-sm text-center">{error}</p>
            )}

            <div className="flex items-start gap-3 pt-2 text-xs md:text-sm text-on-surface-variant/80 leading-relaxed">
              <span className="material-symbols-outlined text-tertiary text-lg shrink-0 mt-0.5">mark_email_read</span>
              <p>
                Tras el pago, completas unas preguntas rápidas y te enviamos
                el link de tu meditación al correo electrónico.
              </p>
            </div>

            {/* Cupón (colapsado por defecto) */}
            <div className="text-center">
              {coupon.state === "valid" ? (
                <button
                  type="button"
                  onClick={() => setCouponOpen((v) => !v)}
                  className="inline-flex items-center gap-1 text-xs text-tertiary/90 hover:text-tertiary transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  Código {coupon.code} aplicado
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setCouponOpen((v) => !v)}
                  className="text-xs text-on-surface-variant/60 hover:text-primary transition-colors underline underline-offset-2"
                  aria-expanded={couponOpen}
                  aria-controls="coupon-panel"
                >
                  {couponOpen ? "Ocultar código" : "¿Tienes un código de descuento?"}
                </button>
              )}

              <AnimatePresence initial={false}>
                {couponOpen && (
                  <motion.div
                    id="coupon-panel"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-4 space-y-2 text-left">
                      <div className="relative">
                        <input
                          id="coupon"
                          type="text"
                          value={couponInput}
                          onChange={(e) => handleCouponChange(e.target.value.toUpperCase())}
                          placeholder="Ej: PROMO50"
                          autoComplete="off"
                          maxLength={42}
                          className={`w-full px-4 py-3 rounded-2xl bg-surface-container border text-sm uppercase tracking-wide outline-none transition-colors ${
                            coupon.state === "valid"
                              ? "border-tertiary focus:border-tertiary"
                              : coupon.state === "invalid"
                                ? "border-error focus:border-error"
                                : "border-outline-variant/40 focus:border-primary"
                          }`}
                        />
                        {coupon.state === "validating" && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-xs">
                            Validando...
                          </span>
                        )}
                        {coupon.state === "valid" && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-tertiary text-lg">
                            check_circle
                          </span>
                        )}
                      </div>
                      {coupon.state === "valid" && coupon.description && (
                        <p className="text-xs text-tertiary/90">{coupon.description}</p>
                      )}
                      {coupon.state === "invalid" && coupon.reason && (
                        <p className="text-xs text-error">
                          {reasonCopy[coupon.reason] || "Código no válido"}
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Beneficios */}
            <ul className="flex flex-col items-center gap-2 text-sm text-on-surface-variant/80 pt-2">
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-base">
                  check_circle
                </span>
                Audio personalizado creado por IA
              </li>
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-base">
                  check_circle
                </span>
                Acceso permanente a tu meditación
              </li>
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-base">
                  check_circle
                </span>
                Comparte con quien quieras
              </li>
            </ul>
          </div>
        </section>

        {!isFree && (
          <section className="flex flex-col items-center space-y-2 w-full">
            <div className="flex items-center gap-2 text-on-surface-variant/70">
              <span className="material-symbols-outlined text-base">lock</span>
              <span className="text-sm font-medium tracking-tight">
                Pago seguro procesado por Wompi
              </span>
            </div>
            <p className="text-xs text-on-surface-variant/50 max-w-md text-center">
              Aceptamos tarjetas de crédito, débito, PSE, Nequi y Bancolombia
              Transfer.
            </p>
          </section>
        )}

        {/* Soporte WhatsApp */}
        <section className="w-full flex flex-col items-center pt-2 pb-4">
          <p className="text-xs text-on-surface-variant/60 text-center max-w-md">
            ¿Tienes problemas con el pago o ya hiciste el pago? Escríbenos por WhatsApp y te ayudamos:
          </p>
          <a
            href={WHATSAPP_SUPPORT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-tertiary-fixed text-tertiary text-sm font-medium hover:bg-tertiary hover:text-on-tertiary transition-colors"
          >
            <span className="material-symbols-outlined text-base">chat</span>
            {WHATSAPP_SUPPORT_DISPLAY}
          </a>
        </section>
      </main>
    </motion.div>
  );
}
