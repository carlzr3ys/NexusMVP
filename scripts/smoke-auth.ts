/**
 * Smoke-test auth APIs against a running Next.js server.
 * Usage: npx tsx scripts/smoke-auth.ts
 */
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const ORIGIN = process.env.ORIGIN ?? BASE;

type Result = { name: string; ok: boolean; detail: string };

async function req(
  method: string,
  path: string,
  body?: unknown,
  opts?: { origin?: boolean; cookie?: string }
) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts?.origin !== false) headers.Origin = ORIGIN;
  if (opts?.cookie) headers.Cookie = opts.cookie;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });

  const setCookie = res.headers.getSetCookie?.() ?? [];
  const text = await res.text();
  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* non-json */
  }
  return { status: res.status, json, text, setCookie, location: res.headers.get("location") };
}

function cookieHeader(setCookie: string[]) {
  return setCookie.map((c) => c.split(";")[0]).join("; ");
}

async function main() {
  const ts = Date.now();
  const email = `test.smoke.${ts}@example.com`;
  const password = "TestPass123!";
  const results: Result[] = [];

  // 1. check-user unknown
  {
    const r = await req("POST", "/api/auth/check-user", { email });
    results.push({
      name: "check-user unknown → exists:false",
      ok: r.status === 200 && (r.json as { exists?: boolean })?.exists === false,
      detail: `${r.status} ${r.text}`,
    });
  }

  // 2. CSRF block
  {
    const r = await req("POST", "/api/auth/register", { name: "X", email, password }, { origin: false });
    results.push({
      name: "register without Origin → 403 CSRF",
      ok: r.status === 403,
      detail: `${r.status} ${r.text}`,
    });
  }

  // 3. register
  let sessionCookie = "";
  {
    const r = await req("POST", "/api/auth/register", { name: "Smoke Test", email, password });
    sessionCookie = cookieHeader(r.setCookie);
    const hasSession = sessionCookie.includes("nexus_session");
    results.push({
      name: "register → 201 + session cookie",
      ok: r.status === 201 && hasSession && (r.json as { ok?: boolean })?.ok === true,
      detail: `${r.status} cookie=${hasSession} ${r.text}`,
    });
  }

  // 4. check-user exists
  {
    const r = await req("POST", "/api/auth/check-user", { email });
    results.push({
      name: "check-user after register → exists:true",
      ok: r.status === 200 && (r.json as { exists?: boolean })?.exists === true,
      detail: `${r.status} ${r.text}`,
    });
  }

  // 5. account with session
  {
    const r = await req("GET", "/account", undefined, { cookie: sessionCookie, origin: false });
    results.push({
      name: "/account with session → 200 (not redirected to login)",
      ok: r.status === 200,
      detail: `${r.status} loc=${r.location ?? "-"}`,
    });
  }

  // 6. forgot existing
  {
    const r = await req("POST", "/api/auth/forgot-password", { email });
    results.push({
      name: "forgot-password existing → ok",
      ok: r.status === 200 && (r.json as { ok?: boolean })?.ok === true,
      detail: `${r.status} ${r.text}`,
    });
  }

  // 7. forgot unknown (no enumeration)
  {
    const r = await req("POST", "/api/auth/forgot-password", { email: `nobody.${ts}@example.com` });
    results.push({
      name: "forgot-password unknown → still ok (no leak)",
      ok: r.status === 200 && (r.json as { ok?: boolean })?.ok === true,
      detail: `${r.status} ${r.text}`,
    });
  }

  // 8. verify wrong otp
  {
    const r = await req("POST", "/api/auth/verify-otp", { email, code: "000000" });
    results.push({
      name: "verify-otp wrong → 400",
      ok: r.status === 400,
      detail: `${r.status} ${r.text}`,
    });
  }

  // 9. login ok
  {
    const r = await req("POST", "/api/auth/login", { email, password });
    results.push({
      name: "login ok → role CUSTOMER",
      ok: r.status === 200 && (r.json as { role?: string })?.role === "CUSTOMER",
      detail: `${r.status} ${r.text}`,
    });
  }

  // 10. login bad
  {
    const r = await req("POST", "/api/auth/login", { email, password: "wrongpass" });
    results.push({
      name: "login bad password → 401",
      ok: r.status === 401,
      detail: `${r.status} ${r.text}`,
    });
  }

  // 11. duplicate register
  {
    const r = await req("POST", "/api/auth/register", { name: "Smoke Test", email, password });
    results.push({
      name: "register duplicate → 400",
      ok: r.status === 400,
      detail: `${r.status} ${r.text}`,
    });
  }

  // 12. short password
  {
    const r = await req("POST", "/api/auth/register", {
      name: "Short",
      email: `short.${ts}@example.com`,
      password: "short",
    });
    results.push({
      name: "register short password → 400",
      ok: r.status === 400,
      detail: `${r.status} ${r.text}`,
    });
  }

  console.log(`\nSmoke email: ${email}\n`);
  let failed = 0;
  for (const row of results) {
    const mark = row.ok ? "PASS" : "FAIL";
    if (!row.ok) failed += 1;
    console.log(`[${mark}] ${row.name}`);
    console.log(`       ${row.detail}`);
  }
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
