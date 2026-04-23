# VozCalma — Guía para Claude Code

App de meditaciones con audio generado por IA. Stack: **Astro 6 SSR + React 19 + TypeScript + Tailwind + Supabase + PostHog**, deploy en VPS Hostinger vía Docker + Caddy + GitHub Actions.

---

## Infraestructura

### VPS Hostinger
- **ID**: `1499548` (accesible por MCP `mcp__hostinger__*`)
- **IP**: `72.62.105.169`
- **Hostname**: `srv1499548.hstgr.cloud`
- **Proyecto Docker**: `vozcalma` en `/opt/vozcalma/docker-compose.yml`
- **Servicios**: `vozcalma` (app Node + Astro) + `caddy` (reverse proxy con Let's Encrypt)
- **Dominio**: `vozcalma.app` (DNS + SSL manejado por Caddy)

### Supabase
- **Project ref**: `xmgpnskjbfsxvxfqsxbh`
- **URL**: `https://xmgpnskjbfsxvxfqsxbh.supabase.co`
- **MCP**: `mcp__supabase__*` — usar `apply_migration` / `list_migrations` / `execute_sql`
- **Migraciones**: `supabase/migrations/*.sql` con timestamp-based naming al aplicar

### GitHub
- **Repo real**: `heanfig/vozcalma` (el viejo `heanfig/vozcalma.app` redirige)
- **Default branch**: `main` — push dispara auto-deploy
- **Workflow**: `.github/workflows/deploy.yml`

---

## Deploy — cómo funciona

`git push origin main` o `gh workflow run "Build & Deploy" --repo heanfig/vozcalma --ref main` ejecuta:

1. **`build-and-push`**: builda imagen Docker, la pushea a `ghcr.io/heanfig/vozcalma:latest`
2. **`deploy → Sync full .env to VPS`**: SSH al VPS, reescribe `/opt/vozcalma/.env` desde cero usando GitHub Variables + Secrets
3. **`deploy → Deploy to VPS`**: `docker compose pull` + `up -d` + `image prune`

El `.env` se regenera **completo** en cada deploy — no hay patches ni appends, para evitar drift/duplicación de bloques.

### Monitoreo del deploy

```bash
gh run list --repo heanfig/vozcalma --limit 3
gh run watch <run-id> --repo heanfig/vozcalma --exit-status
```

**Importante**: el remote local `origin` apunta a `vozcalma.app.git` (redirige, pero `gh` CLI por defecto usa la URL vieja). Para API calls, siempre usar `--repo heanfig/vozcalma` explícito — la URL vieja responde bien a push/fetch pero las llamadas de API directas a veces fallan.

---

## Env Vars — Variables vs Secrets

GitHub tiene dos tipos de storage; VozCalma usa ambos según sensibilidad:

### GitHub Variables (10 — editables, visibles)

Config pública o no sensible. Visibles en UI (`Settings → Secrets and variables → Actions → Variables`).

- `PUBLIC_CLERK_PUBLISHABLE_KEY` — público por diseño (embebido en cliente)
- `PUBLIC_CLERK_SIGN_IN_URL`, `PUBLIC_CLERK_SIGN_UP_URL`
- `SUPABASE_URL`, `SUPABASE_ANON_KEY` — público por diseño
- `ELEVENLABS_VOICE_ID` — solo un ID
- `EMAIL_FROM`, `PUBLIC_SITE_URL`
- `WOMPI_PUBLIC_KEY`, `WOMPI_ENVIRONMENT`

### GitHub Secrets (14 — ocultos, sensibles)

Crypto, API keys privadas, tokens.

- `CLERK_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SECRET_KEY`
- `OPENROUTER_API_KEY`, `ELEVENLABS_API_KEY`, `RESEND_API_KEY`
- `ADMIN_API_SECRET`, `CSRF_SECRET`, `COOKIE_SECRET`
- `WOMPI_PRIVATE_KEY`, `WOMPI_EVENTS_SECRET`, `WOMPI_INTEGRITY_SECRET`
- `VPS_HOST`, `VPS_SSH_KEY` — acceso al VPS (solo usado por CI)

### Operaciones comunes

**Editar variable** (no requiere re-ingresar otras):
```bash
gh variable set WOMPI_ENVIRONMENT --body "production" --repo heanfig/vozcalma
```

**Rotar secret**:
```bash
gh secret set OPENROUTER_API_KEY --body "sk-or-v1-..." --repo heanfig/vozcalma
```

**Disparar deploy para aplicar cambios**:
```bash
gh workflow run "Build & Deploy" --repo heanfig/vozcalma --ref main
```

**Listar todo**:
```bash
gh variable list --repo heanfig/vozcalma
gh secret list --repo heanfig/vozcalma
```

### Si agregas una nueva var

1. Decide si es Variable (pública/config) o Secret (sensible)
2. `gh variable set X` o `gh secret set X`
3. Edita `.github/workflows/deploy.yml` — agregar en el bloque `env:` y en el `echo "X=${X}"` del heredoc
4. Commit + push → deploy la propaga al VPS

---

## Leer estado del VPS sin SSH

**No necesitas SSH** para inspeccionar el VPS — Hostinger MCP expone todo:

```
mcp__hostinger__VPS_getProjectContentsV1(vmId=1499548, projectName=vozcalma)
```

Devuelve `docker-compose.yml` + `.env` completo. Útil para:
- Verificar que el último deploy escribió el `.env` correctamente
- Leer valores actuales sin tener que autorizar SSH
- Debug de env drift

Otros MCP útiles de Hostinger:
- `VPS_getProjectLogsV1` — últimos 300 logs
- `VPS_getProjectContainersV1` — stats de contenedores
- `VPS_getProjectListV1` — overview general
- `VPS_restartProjectV1` — restart del docker compose

SSH directo desde local **no funciona** — la llave privada vive solo en `secrets.VPS_SSH_KEY` (GitHub). Cualquier cambio en el VPS debe ir por el deploy workflow o el MCP.

---

## Wompi (pasarela de pago Colombia)

### Arquitectura
Pago **antes** de las preguntas de onboarding (`intake(nombre) → selectType → payment → intake(resto) → generating → player`). Protege el costo LLM/TTS (~$0.20 USD/sesión).

### Endpoints
- `POST /api/payment/initiate` — crea referencia, firma integridad, retorna `checkout_url`
- `POST /api/payment/webhook` — recibe eventos de Wompi (`transaction.updated`), valida con `timingSafeEqual`
- `GET /api/payment/status` — polling del cliente post-redirect
- `POST /api/coupons/validate` — valida cupón con rate limit 10/min/IP

### Flujo checkout
1. `WompiCheckout.tsx` → `/api/payment/initiate` → `checkout.wompi.co/p/?...&signature:integrity=<sha256>`
2. Wompi redirige a `/payment/return?session=<sid>&id=<tx>&type=<quick|deep>&env=test`
3. `PaymentReturn.tsx` polea `/api/payment/status` hasta `paid:true`
4. Redirect a `/onboarding?session=<sid>` para continuar el flow

### Precios (tiered por tipo de sesión)
- **Quick**: `PRICE_QUICK_COP_CENTS = 1300000` (~$3 USD)
- **Deep**: `PRICE_DEEP_COP_CENTS = 2600000` (~$6 USD)
- Helper: `getPriceForType(type)` en `src/lib/constants.ts`

### Cupones
Tabla `coupons` con CAS atomic redemption:
```sql
UPDATE coupons SET redemption_count = redemption_count + 1
WHERE code = $1 AND is_active = true
  AND (max_uses IS NULL OR redemption_count < max_uses)
  AND (valid_until IS NULL OR valid_until > NOW())
RETURNING *
```
Tipos: `full`, `percent`, `fixed`. Link bypass: `/onboarding?coupon=CODE` auto-fill en `WompiCheckout`.

### Testing
Tarjetas sandbox Wompi (https://docs.wompi.co/docs/colombia/pruebas/):
- `4242 4242 4242 4242` → APPROVED (Visa)
- `4111 1111 1111 1111` → DECLINED
- CVV cualquier 3 dígitos, exp cualquier fecha futura

Webhook en dev: `ngrok http 4321`. Prod: `https://vozcalma.app/api/payment/webhook` (registrar en dashboard Wompi).

### Post-launch TODO
- [ ] Registrar webhook URL en dashboard Wompi sandbox (sin esto, approvals no sincronizan)
- [ ] `WHATSAPP_SUPPORT_NUMBER` en `src/lib/constants.ts` sigue siendo placeholder `573001234567` — reemplazar
- [ ] Al pasar a prod: cambiar `WOMPI_ENVIRONMENT` a `production` + rotar `WOMPI_*` keys a las reales

---

## Referrals / UTM

La session cookie firmada (`SessionPayload` en `src/lib/session-cookie.ts`) incluye `utm_source`, `utm_medium`, `utm_campaign`, `coupon_code`. Se capturan en:

- Landing (`src/pages/index.astro`): lee `new URLSearchParams(window.location.search)`
- `/api/onboarding/start-session`: persiste en `onboarding_sessions`

PostHog `identify(sessionId, { utm_* })` dispara al crear sesión. Vista SQL agregada:

```sql
SELECT * FROM referral_conversions;
-- utm_source | utm_campaign | total_sessions | paid_sessions | revenue_cents
```

Eventos PostHog clave: `session_created`, `referral_attributed`, `checkout_viewed`, `checkout_coupon_applied/rejected`, `onboarding_payment_{initiated,verifying,completed,failed,abandoned}`.

---

## Base de datos

Migraciones en `supabase/migrations/`. Aplicar con `mcp__supabase__apply_migration`. Lista con `mcp__supabase__list_migrations`.

Tablas clave:
- `onboarding_sessions` — una por usuario, incluye `is_paid`, `payment_*`, `coupon_code`, `utm_*`
- `coupons` — `code PRIMARY KEY`, `discount_type` ∈ (full, percent, fixed), `max_uses`, `redemption_count`
- `coupon_redemptions` — audit log
- `meditation_artifacts`, `meditation_knowledge_snippets` — contenido generado

RLS en `coupons` / `coupon_redemptions`: solo `service_role` (policies con `USING (false)` para anon).

---

## Desarrollo local

```bash
npm install
cp .env.example .env     # llenar con valores (los reales viven en GitHub)
npm run dev              # http://localhost:4321
npm run build            # SSR build a dist/
npm run smoke            # scripts/smoke-test.mjs contra localhost
```

### Smoke tests

`scripts/smoke-test.mjs` verifica endpoints críticos. Ampliar aquí cuando se agreguen nuevos endpoints.

---

## Convenciones del código

- **Astro**: SSR con adapter Node. Páginas `.astro` son server-rendered, componentes interactivos React con `client:load` o similar.
- **Componentes**: `src/components/` (global) y `src/components/onboarding/` (flujo de sesión).
- **API**: `src/pages/api/**` con `APIRoute` pattern. Helpers en `src/lib/api-utils.ts`.
- **Seguridad**: CSRF + cookie firmada HMAC-SHA256 obligatorios en endpoints autenticados. Rate limit en endpoints enumerables (cupones).
- **Material Symbols** para iconos (CSS class `material-symbols-outlined`).
- **Framer Motion** para animaciones; usar `AnimatePresence` para mount/unmount con height.

---

## Acciones destructivas / confirmación

Requieren OK explícito del usuario antes de ejecutar:
- `git push origin main` (dispara deploy a prod)
- `gh secret delete` / `gh variable delete`
- `mcp__supabase__apply_migration` en prod
- `mcp__hostinger__VPS_createNewProjectV1` (reemplaza proyecto entero)
- Rotar llaves que están en uso por otros sistemas

`git commit` local y ediciones de archivos son seguros — no requieren confirmación.
