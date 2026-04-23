/**
 * PostHog analytics wrapper — client-side.
 *
 * Centraliza todos los eventos de tracking con tipos fuertes.
 * No falla silenciosamente si PostHog no está cargado.
 *
 * PostHog se inicializa via <PostHog /> component en cada página Astro.
 * Este módulo solo lo consume.
 */

export type EventName =
  // Landing
  | "landing_viewed"
  | "landing_theme_toggled"
  | "landing_nav_click"
  | "landing_activation_submit"
  | "landing_activation_error"
  // Onboarding
  | "onboarding_started"
  | "onboarding_type_selected"
  | "onboarding_step_answered"
  | "onboarding_back_clicked"
  | "onboarding_abort_clicked"
  | "onboarding_confirmation_viewed"
  | "onboarding_generate_requested"
  | "onboarding_generate_succeeded"
  | "onboarding_generate_failed"
  | "onboarding_email_opted_in"
  | "onboarding_await_email_viewed"
  // Player
  | "player_audio_play"
  | "player_audio_pause"
  | "player_share_clicked"
  | "player_share_completed"
  | "player_link_copied"
  // Share link
  | "share_link_opened"
  // Background music
  | "bg_music_autoplay_blocked"
  | "bg_music_play"
  | "bg_music_pause"
  | "bg_music_volume_changed"
  | "bg_music_next_track"
  // Payments & coupons
  | "checkout_viewed"
  | "checkout_coupon_applied"
  | "checkout_coupon_rejected"
  | "onboarding_payment_initiated"
  | "onboarding_payment_verifying"
  | "onboarding_payment_completed"
  | "onboarding_payment_failed"
  | "onboarding_payment_abandoned"
  // Attribution
  | "session_created"
  | "referral_attributed"
  // Errors
  | "error_generic"
  | "error_network"
  | "error_validation"
  | "error_rate_limit"
  | "error_csrf_invalid";

export interface EventProps {
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Envía un evento a PostHog. No falla si PostHog no está disponible.
 */
export function track(event: EventName, props?: EventProps): void {
  if (typeof window === "undefined") return;
  try {
    const ph = (window as Record<string, unknown>).posthog as
      | { capture?: (event: string, props?: Record<string, unknown>) => void }
      | undefined;
    if (ph?.capture) {
      ph.capture(event, (props || {}) as Record<string, unknown>);
    }
  } catch {
    // Silent — analytics nunca debe romper la app
  }
}

/**
 * Captura un error como evento de analytics.
 */
export function trackError(err: unknown, context?: EventProps): void {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack?.slice(0, 500) : undefined;
  track("error_generic", { message, stack, ...context });
}

/**
 * Identifica al usuario en PostHog con su sessionId.
 */
export function identify(sessionId: string, props?: EventProps): void {
  if (typeof window === "undefined") return;
  try {
    const ph = (window as Record<string, unknown>).posthog as
      | { identify?: (id: string, props?: Record<string, unknown>) => void }
      | undefined;
    if (ph?.identify) {
      ph.identify(sessionId, (props || {}) as Record<string, unknown>);
    }
  } catch {
    // Silent
  }
}
