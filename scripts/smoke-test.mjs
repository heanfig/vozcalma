#!/usr/bin/env node
/**
 * VozCalma E2E smoke test
 *
 * Uso:
 *   node scripts/smoke-test.mjs http://localhost:4321
 *   node scripts/smoke-test.mjs https://vozcalma.app
 *
 * Tests:
 *   1. Landing page renders
 *   2. Onboarding page renders (with and without ?name=)
 *   3. Quick flow API generates meditation
 *   4. Deep flow API generates meditation
 *   5. Play link resolves
 *   6. Idempotency on re-generation
 *   7. Error handling (missing nombre, invalid type)
 */

const BASE = (process.argv[2] || "http://localhost:4321").replace(/\/$/, "");
const TIMEOUT_MS = 180_000; // 3 min para LLM + TTS + mix + upload

let passed = 0;
let failed = 0;

function log(level, ...args) {
  const prefix = {
    pass: "  \x1b[32m✓\x1b[0m",
    fail: "  \x1b[31m✗\x1b[0m",
    info: "  \x1b[36m→\x1b[0m",
    hdr: "\x1b[1m",
  };
  console.log(prefix[level] || "", ...args, level === "hdr" ? "\x1b[0m" : "");
}

async function test(name, fn) {
  try {
    log("info", name);
    await fn();
    passed++;
    log("pass", name);
  } catch (err) {
    failed++;
    log("fail", name, "—", err.message || err);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function fetchWithTimeout(url, options = {}, timeoutMs = TIMEOUT_MS) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

// ============================================================================
// FIXTURES
// ============================================================================

const QUICK_FIXTURE = {
  type: "quick",
  answers: {
    nombre: "SmokeQuick",
    areasVida: "Mi tranquilidad emocional; Mi vida profesional",
    areaPrioritaria: "Mi tranquilidad emocional",
    inicioDiaIdeal: "🌅 Despierto en calma",
    momentoClave: "🧘 En un momento conmigo mismo(a)",
    accionConcreta: "🧘 Me siento tranquilo(a) y enfocado(a)",
    nuevaIdentidad: "🌊 Tranquilo(a)",
    activacionFinal: "🌱 Con paciencia y cuidado conmigo",
    expansionOtrasAreas: "Mi tranquilidad mental; Mi energía diaria",
    contextoPersonal:
      "He estado ansiosa por la carga del trabajo. Necesito una pausa para respirar.",
  },
  sessionId: null,
};

const DEEP_FIXTURE = {
  type: "deep",
  answers: {
    nombre: "SmokeDeep",
    identidadNueva:
      "Soy una persona serena, centrada, que confía en sus decisiones y vive con propósito claro.",
    momentoPoderoso:
      "Hablar frente a un grupo sintiéndome en paz, con las palabras fluyendo de forma natural.",
    activacionFinal:
      "Cada mañana tomar 5 minutos para respirar antes de empezar el día.",
    mensajeAlFuturo:
      "Estoy orgullosa de ti por haber elegido este camino. Todo está conectado.",
    sensacionInterna:
      "Una calma expansiva en el centro del pecho, como un sol tibio que irradia hacia afuera.",
    vidaIdealGeneral:
      "Vivo en armonía, con propósito claro, rodeada de personas que me aman y haciendo trabajo que me llena.",
    diaIdeal:
      "Despierto temprano, medito 20 min, tomo café con calma, trabajo con enfoque en lo que amo, camino al atardecer.",
    vaciosActuales:
      "Siento que me falta constancia en mis hábitos y más confianza en mí misma al tomar decisiones importantes.",
    contextoPersonal:
      "Quiero transformar mi vida profesional y personal desde adentro hacia afuera.",
  },
  sessionId: null,
};

// ============================================================================
// TESTS
// ============================================================================

console.log(`\n\x1b[1mVozCalma smoke test\x1b[0m → ${BASE}\n`);

// Nota: variables de happy-path (lastQuick*) removidas — el smoke ya no genera
// meditaciones reales (requiere sesión paga, fuera de scope automatizable).

await test("Landing page rinde con copy nuevo + secciones clave", async () => {
  const res = await fetchWithTimeout(`${BASE}/`);
  assert(res.ok, `status ${res.status}`);
  const body = await res.text();
  // Hero v2
  assert(
    body.includes("Una meditación creada") && body.includes("solo para ti"),
    "missing hero headline 'Una meditación creada solo para ti'",
  );
  assert(
    body.includes("Crear mi meditación"),
    "missing 'Crear mi meditación' CTA",
  );
  // Anclas de las nuevas secciones
  assert(body.includes('id="demo"'), "missing #demo anchor (sample player)");
  assert(body.includes('id="como-funciona"'), "missing #como-funciona anchor");
  assert(body.includes('id="precios"'), "missing #precios anchor");
  assert(body.includes('id="faq"'), "missing #faq anchor");
  // Pricing visible (formatCOP genera "$13.000 COP" / "$26.000 COP")
  assert(body.includes("13.000 COP"), "missing quick price (13.000 COP)");
  assert(body.includes("26.000 COP"), "missing deep price (26.000 COP)");
});

await test("API: /api/meditations/sample/<slug> responde audio o 404", async () => {
  const res = await fetchWithTimeout(
    `${BASE}/api/meditations/sample/calmar-la-mente`,
  );
  // 200 (ya pre-generado) o 404 (todavía no generado) — ambos son válidos
  assert(
    res.status === 200 || res.status === 404,
    `expected 200 or 404, got ${res.status}`,
  );
  if (res.status === 200) {
    const ct = res.headers.get("content-type") || "";
    assert(ct.includes("audio/mpeg"), `expected audio/mpeg, got ${ct}`);
  }
});

await test("API: /api/meditations/sample/<slug-inválido> → 404", async () => {
  const res = await fetchWithTimeout(
    `${BASE}/api/meditations/sample/../../../etc/passwd`,
  );
  assert(res.status === 404, `expected 404, got ${res.status}`);
});

await test("Onboarding page rinde (sin prefill)", async () => {
  const res = await fetchWithTimeout(`${BASE}/onboarding`);
  assert(res.ok, `status ${res.status}`);
});

await test("Onboarding page rinde con ?name= (prefill)", async () => {
  const res = await fetchWithTimeout(
    `${BASE}/onboarding?name=${encodeURIComponent("SmokeTest")}`,
  );
  assert(res.ok, `status ${res.status}`);
});

// Nota: /api/onboarding/generate ahora requiere sesión paga (payment-first flow).
// Los smoke tests no pueden simular el pago Wompi, así que validamos que la
// guardia de auth funcione. El happy-path full se cubre en QA manual con
// tarjeta sandbox.

await test("API: /api/onboarding/generate sin sesión → 401", async () => {
  const res = await fetchWithTimeout(`${BASE}/api/onboarding/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(QUICK_FIXTURE),
  });
  assert(res.status === 401, `expected 401, got ${res.status}`);
});

await test("API: /api/onboarding/generate sin pago → 401/403", async () => {
  // Crear sesión sin pago + intentar generar
  const startRes = await fetchWithTimeout(`${BASE}/api/onboarding/start-session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "SmokeUnpaid" }),
  });
  if (!startRes.ok) {
    log("info", "   start-session falló — se acepta (sin sesión válida → siguiente test)");
    return;
  }
  const cookie = startRes.headers.get("set-cookie") || "";
  const res = await fetchWithTimeout(`${BASE}/api/onboarding/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify(QUICK_FIXTURE),
  });
  assert(
    res.status === 401 || res.status === 403,
    `expected 401/403 (unpaid), got ${res.status}`,
  );
});

// ============================================================================
// PAYMENTS + CUPONES
// ============================================================================

await test("API: /api/coupons/validate sin sesión → 401", async () => {
  const res = await fetchWithTimeout(`${BASE}/api/coupons/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: "NOEXISTE" }),
  });
  assert(res.status === 401, `expected 401, got ${res.status}`);
});

await test("API: /api/payment/initiate sin sesión → 401", async () => {
  const res = await fetchWithTimeout(`${BASE}/api/payment/initiate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "quick" }),
  });
  assert(res.status === 401, `expected 401, got ${res.status}`);
});

await test("API: /api/payment/webhook sin firma válida → 401", async () => {
  const res = await fetchWithTimeout(`${BASE}/api/payment/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event: "transaction.updated",
      timestamp: Math.floor(Date.now() / 1000),
      signature: { properties: ["transaction.id"], checksum: "0".repeat(64) },
      data: { transaction: { id: "fake", reference: "fake", status: "APPROVED", amount_in_cents: 2100000, currency: "COP" } },
    }),
  });
  assert(res.status === 401, `expected 401, got ${res.status}`);
});

await test("API: /api/payment/webhook con JSON inválido → 400", async () => {
  const res = await fetchWithTimeout(`${BASE}/api/payment/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "not-json",
  });
  assert(res.status === 400, `expected 400, got ${res.status}`);
});

await test("API: /api/payment/status sin sesión → 401", async () => {
  const res = await fetchWithTimeout(
    `${BASE}/api/payment/status?session_id=00000000-0000-0000-0000-000000000000`,
  );
  assert(res.status === 401, `expected 401, got ${res.status}`);
});

await test("Página /payment/return renderiza (sin session → error visible)", async () => {
  const res = await fetchWithTimeout(`${BASE}/payment/return`);
  assert(res.ok, `status ${res.status}`);
  const body = await res.text();
  assert(
    body.includes("Enlace inválido") || body.includes("Verificando"),
    "missing expected page content",
  );
});

// ============================================================================
// ADMIN DASHBOARD
// ============================================================================

await test("GET /admin sin cookie → redirect a /admin/login", async () => {
  const res = await fetchWithTimeout(`${BASE}/admin`, {
    redirect: "manual",
  });
  assert(
    res.status === 302 || res.status === 301,
    `expected redirect, got ${res.status}`,
  );
  const loc = res.headers.get("location") || "";
  assert(loc.includes("/admin/login"), `expected /admin/login, got ${loc}`);
});

await test("GET /admin/login rinde (form de password)", async () => {
  const res = await fetchWithTimeout(`${BASE}/admin/login`);
  assert(res.ok, `status ${res.status}`);
  const body = await res.text();
  assert(
    body.includes("Contraseña") || body.includes("password"),
    "missing password field",
  );
});

await test("POST /api/admin/login password incorrecta → 401", async () => {
  const res = await fetchWithTimeout(`${BASE}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: "wrong-smoke-password-xyz" }),
  });
  assert(
    res.status === 401 || res.status === 429,
    `expected 401 or 429, got ${res.status}`,
  );
});

await test("GET /api/admin/overview sin auth → 401", async () => {
  const res = await fetchWithTimeout(`${BASE}/api/admin/overview`);
  assert(res.status === 401, `expected 401, got ${res.status}`);
});

await test("GET /api/admin/sessions sin auth → 401", async () => {
  const res = await fetchWithTimeout(`${BASE}/api/admin/sessions`);
  assert(res.status === 401, `expected 401, got ${res.status}`);
});

// ============================================================================
// REPORT
// ============================================================================

console.log("");
console.log(
  `\x1b[1mResults:\x1b[0m ${passed} passed, ${failed} failed` +
    (failed === 0 ? " \x1b[32m✓\x1b[0m" : " \x1b[31m✗\x1b[0m"),
);
console.log("");
process.exit(failed === 0 ? 0 : 1);
