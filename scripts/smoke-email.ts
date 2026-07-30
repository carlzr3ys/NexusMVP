/**
 * Quick email API probe.
 * Loads .env manually, then either hits Resend or shows the console fallback path.
 */
import { readFileSync } from "fs";
import { resolve } from "path";

function loadEnv() {
  const raw = readFileSync(resolve(process.cwd(), ".env"), "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

loadEnv();

async function main() {
  const to = process.argv[2] ?? "delivered@resend.dev";
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "NEXUS <onboarding@resend.dev>";

  console.log("RESEND_API_KEY:", key ? `set (len=${key.length})` : "NOT SET");
  console.log("EMAIL_FROM:", from);
  console.log("To:", to);

  if (!key) {
    console.log("\nResult: email API cannot call Resend — app will only log to console.");
    console.log("Add to .env:");
    console.log("  RESEND_API_KEY=re_xxxxxxxx");
    console.log('  EMAIL_FROM="NEXUS <onboarding@resend.dev>"');
    console.log("Then verify a domain (or use onboarding@resend.dev for test inbox).");
    process.exit(2);
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "NexusMVP email API test",
      html: `<p>Hello — Resend test from NexusMVP at ${new Date().toISOString()}</p>`,
    }),
  });

  const text = await res.text();
  console.log("\nHTTP", res.status);
  console.log(text);
  process.exit(res.ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
