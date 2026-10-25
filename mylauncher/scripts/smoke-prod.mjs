const baseUrl = (process.env.LAUNCHER_SMOKE_URL || "").replace(/\/$/, "");
const username = process.env.LAUNCHER_SMOKE_USERNAME;
const legacyEmployeeId = process.env.LAUNCHER_SMOKE_EMPLOYEE_ID;
const credential = username ? { username } : legacyEmployeeId ? { employeeId: legacyEmployeeId } : null;
const pin = process.env.LAUNCHER_SMOKE_PIN;
const timeoutMs = Number(process.env.LAUNCHER_SMOKE_TIMEOUT_MS || 15000);
let cookie = "";

if (!baseUrl || !credential || !pin) {
  console.error("Set LAUNCHER_SMOKE_URL, LAUNCHER_SMOKE_USERNAME, and LAUNCHER_SMOKE_PIN before running the smoke check.");
  process.exit(2);
}

async function request(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...init.headers,
    },
  });
  const setCookie = response.headers.get("set-cookie");
  if (setCookie) cookie = setCookie.split(";", 1)[0];
  const body = await response.json().catch(() => null);
  return { response, body };
}

function expectStatus(result, status, label) {
  if (result.response.status !== status) {
    throw new Error(`${label}: expected ${status}, got ${result.response.status}`);
  }
}

let checks = 0;
async function check(label, callback) {
  await callback();
  checks += 1;
  console.log(`PASS ${checks}: ${label}`);
}

try {
  await check("unauthenticated session is rejected", async () => {
    expectStatus(await request("/api/auth/session"), 401, "session");
  });

  await check("login succeeds", async () => {
    const result = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ ...credential, pin }),
    });
    expectStatus(result, 200, "login");
    const expectedEmployee = username ? result.body?.employee?.username === username : result.body?.employee?.employee_id === legacyEmployeeId;
    if (!expectedEmployee) throw new Error("login returned an unexpected employee");
  });

  await check("session exposes identity claims", async () => {
    const result = await request("/api/auth/session");
    expectStatus(result, 200, "session");
    if (!result.body?.claims?.employeeId || !Array.isArray(result.body.claims.permissions)) {
      throw new Error("session claims are incomplete");
    }
  });

  await check("SSO endpoint exposes authenticated claims", async () => {
    const result = await request("/api/auth/sso");
    expectStatus(result, 200, "SSO");
    const expectedClaims = username
      ? result.body?.claims?.username === username
      : result.body?.claims?.employeeId === legacyEmployeeId;
    if (result.body?.authenticated !== true || !expectedClaims) {
      throw new Error("SSO claims are incomplete");
    }
  });

  await check("accessible app registry loads", async () => {
    const result = await request("/api/registry");
    expectStatus(result, 200, "registry");
    if (!Array.isArray(result.body?.apps)) throw new Error("registry apps are not an array");
  });

  await check("work context loads", async () => {
    const result = await request("/api/work-context");
    expectStatus(result, 200, "work context");
    if (!result.body?.workContext || typeof result.body.workContext.employee_id !== "string") {
      throw new Error("work context is incomplete");
    }
  });

  await check("feed loads", async () => {
    const result = await request("/api/feed");
    expectStatus(result, 200, "feed");
    if (!result.body?.feed || !Array.isArray(result.body.feed.notifications)) throw new Error("feed is incomplete");
  });

  await check("logout succeeds", async () => {
    expectStatus(await request("/api/auth/logout", { method: "POST" }), 200, "logout");
  });

  await check("session is revoked after logout", async () => {
    expectStatus(await request("/api/auth/session"), 401, "session after logout");
  });

  console.log(`Smoke check passed: ${checks}/9`);
} catch (error) {
  if (cookie) {
    await request("/api/auth/logout", { method: "POST" }).catch(() => undefined);
  }
  console.error(`Smoke check failed after ${checks} checks:`, error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
