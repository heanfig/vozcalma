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

let lastQuickSessionId = null;
let lastQuickAudioUrl = null;
let lastQuickPlayUrl = null;
let lastDeepScriptLength = 0;

await test("Landing page rinde con copy correcto", async () => {
  const res = await fetchWithTimeout(`${BASE}/`);
  assert(res.ok, `status ${res.status}`);
  const body = await res.text();
  assert(body.includes("RITUAL DE ACTIVACIÓN") || body.includes("Ritual de Activación"), "missing 'Ritual de Activación'");
  assert(
    body.includes("ESTOY LISTO PARA CAMBIAR"),
    "missing 'ESTOY LISTO PARA CAMBIAR' button",
  );
  assert(body.includes("Begin Ritual"), "missing 'Begin Ritual' CTA");
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

await test("API: Alivio Rápido genera meditación", async () => {
  const res = await fetchWithTimeout(`${BASE}/api/onboarding/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(QUICK_FIXTURE),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`status ${res.status}: ${errText.slice(0, 300)}`);
  }
  const data = await res.json();
  assert(typeof data.sessionId === "string", "missing sessionId");
  assert(/^[0-9a-f-]{36}$/i.test(data.sessionId), "sessionId not UUID");
  assert(typeof data.audioUrl === "string" && data.audioUrl.length > 10, "missing audioUrl");
  assert(typeof data.scriptText === "string", "missing scriptText");
  // Target 2500-5000 chars per user requirement ("2000 a 4000")
  assert(
    data.scriptText.length >= 2500,
    `scriptText too short (${data.scriptText.length}, expected >= 2500)`,
  );
  assert(typeof data.playUrl === "string" && data.playUrl.startsWith("http"), "missing playUrl");
  assert(/\/p\/[0-9a-f]{24}/i.test(data.playUrl), "playUrl format incorrect");
  lastQuickSessionId = data.sessionId;
  lastQuickAudioUrl = data.audioUrl;
  lastQuickPlayUrl = data.playUrl;
  log("info", `   scriptText: ${data.scriptText.length} chars, audio: ${data.audioUrl}`);
});

await test("API: Alivio Rápido idempotencia (misma sessionId)", async () => {
  assert(lastQuickSessionId, "previous test failed");
  const res = await fetchWithTimeout(`${BASE}/api/onboarding/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...QUICK_FIXTURE, sessionId: lastQuickSessionId }),
  });
  if (!res.ok) throw new Error(`status ${res.status}`);
  const data = await res.json();
  assert(
    data.sessionId === lastQuickSessionId,
    "sessionId changed on re-POST (should be idempotent)",
  );
  assert(data.audioUrl === lastQuickAudioUrl, "audioUrl changed on re-POST");
});

await test("API: Play link resuelve y muestra <audio>", async () => {
  assert(lastQuickPlayUrl, "previous test failed");
  // Extract token and call the relative path on our BASE (not the env PUBLIC_SITE_URL)
  const match = lastQuickPlayUrl.match(/\/p\/([0-9a-f]{24})/i);
  assert(match, "no token in playUrl");
  const token = match[1];
  const res = await fetchWithTimeout(`${BASE}/p/${token}`);
  assert(res.ok, `status ${res.status}`);
  const body = await res.text();
  assert(body.includes("<audio") || body.includes("audio"), "missing audio element");
});

await test("API: Reprogramación Profunda genera meditación (larga, con chunking)", async () => {
  const res = await fetchWithTimeout(`${BASE}/api/onboarding/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(DEEP_FIXTURE),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`status ${res.status}: ${errText.slice(0, 300)}`);
  }
  const data = await res.json();
  assert(typeof data.sessionId === "string", "missing sessionId");
  assert(typeof data.audioUrl === "string" && data.audioUrl.length > 10, "missing audioUrl");
  assert(typeof data.scriptText === "string", "missing scriptText");
  assert(
    data.scriptText.length >= 6500,
    `scriptText too short for deep flow (${data.scriptText.length}, expected >= 6500)`,
  );
  lastDeepScriptLength = data.scriptText.length;
  log("info", `   scriptText: ${data.scriptText.length} chars, audio: ${data.audioUrl}`);
});

await test("API: type inválido → 400", async () => {
  const res = await fetchWithTimeout(`${BASE}/api/onboarding/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "bogus", answers: { nombre: "X" } }),
  });
  assert(res.status === 400, `expected 400, got ${res.status}`);
});

await test("API: missing nombre → 400", async () => {
  const res = await fetchWithTimeout(`${BASE}/api/onboarding/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "quick", answers: {} }),
  });
  assert(res.status === 400, `expected 400, got ${res.status}`);
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
if (lastDeepScriptLength > 0) {
  console.log(`\x1b[36mDeep flow script length:\x1b[0m ${lastDeepScriptLength} chars`);
}
console.log("");
process.exit(failed === 0 ? 0 : 1);
