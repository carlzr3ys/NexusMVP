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

async function sendAndPoll(to: string, subject: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "NEXUS <onboarding@resend.dev>",
      to: [to],
      subject,
      html: "<p>Test ping from NexusMVP</p>",
      text: "Test ping from NexusMVP",
    }),
  });
  const body = await res.json();
  console.log("send →", to, res.status, body);
  if (!body.id) return;
  for (let i = 0; i < 4; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    const get = await fetch(`https://api.resend.com/emails/${body.id}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    const detail = await get.json();
    console.log(`  poll${i + 1}: last_event=${detail.last_event}`);
    if (detail.last_event && detail.last_event !== "queued" && detail.last_event !== "sent") {
      break;
    }
  }
}

async function main() {
  await sendAndPoll("delivered@resend.dev", "Nexus sink test");
  await sendAndPoll("legendpie8@gmail.com", "Nexus gmail test");
}

main().catch(console.error);
