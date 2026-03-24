/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_CLERK_PUBLISHABLE_KEY: string;
  readonly PUBLIC_CLERK_SIGN_IN_URL?: string;
  readonly PUBLIC_CLERK_SIGN_UP_URL?: string;
  readonly CLERK_SECRET_KEY: string;
  readonly SUPABASE_URL: string;
  readonly SUPABASE_ANON_KEY: string;
  /** JWT legacy `service_role` (Dashboard → API → Legacy API keys). */
  readonly SUPABASE_SERVICE_ROLE_KEY?: string;
  /** Clave secreta nueva (`sb_secret_…`, Dashboard → API → API Keys). */
  readonly SUPABASE_SECRET_KEY?: string;
  readonly OPENROUTER_API_KEY: string;
  readonly OPENROUTER_MODEL: string;
  readonly ELEVENLABS_API_KEY: string;
  readonly ELEVENLABS_VOICE_ID: string;
  readonly ADMIN_API_SECRET: string;
  /** Origen público (playUrl); por defecto `site` de Astro (vozcalma.app) */
  readonly PUBLIC_SITE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
