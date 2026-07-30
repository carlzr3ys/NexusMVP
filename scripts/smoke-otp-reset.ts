const email = process.argv[2];
const code = process.argv[3];
const BASE = "http://localhost:3000";

async function go() {
  const headers = { "Content-Type": "application/json", Origin: BASE };

  const v = await fetch(`${BASE}/api/auth/verify-otp`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email, code }),
  });
  console.log("verify", v.status, await v.text());

  const r = await fetch(`${BASE}/api/auth/reset-password`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email, code, newPassword: "NewPass456!" }),
  });
  console.log("reset", r.status, await r.text());

  const bad = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email, password: "TestPass123!" }),
  });
  console.log("old-login", bad.status, await bad.text());

  const ok = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email, password: "NewPass456!" }),
  });
  console.log("new-login", ok.status, await ok.text());
}

go().catch(console.error);
