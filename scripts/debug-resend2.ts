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

const key = process.env.RESEND_API_KEY!;
const to = process.argv[2] ?? "legendpie8@gmail.com";

async function send(label: string, body: Record<string, unknown>) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  console.log(`\n[${label}] HTTP ${res.status}`, text);
  try {
    const id = JSON.parse(text).id as string;
    await new Promise((r) => setTimeout(r, 2500));
    const get = await fetch(`https://api.resend.com/emails/${id}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    const detail = await get.json();
    console.log(`[${label}] last_event=${detail.last_event}`);
  } catch (e) {
    console.log(`[${label}] status poll failed`, e);
  }
}

async function main() {
  console.log("to=", to);

  await send("plain-simple", {
    from: "NEXUS <onboarding@resend.dev>",
    to: [to],
    subject: "Nexus OTP test plain",
    html: "<p>Your code is <strong>123456</strong></p>",
    text: "Your code is 123456",
  });

  await send("branded-ascii-subject", {
    from: "NEXUS <onboarding@resend.dev>",
    to: [to],
    subject: "Deliverred Transport - your password reset code",
    html: `<div style="font-family:Arial,sans-serif;padding:24px">
      <h1 style="color:#1B4332">Deliverred Transport</h1>
      <p>Your password reset code:</p>
      <p style="font-size:28px;font-weight:bold;letter-spacing:4px;color:#1B4332">445566</p>
    </div>`,
    text: "Deliverred Transport password reset code: 445566",
  });
}

main().catch(console.error);
