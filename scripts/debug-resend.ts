import { readFileSync } from "fs";
import { resolve } from "path";
import { passwordResetOtpEmail, sendEmail } from "../src/lib/email/send";

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

async function sendRaw(subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "NEXUS <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    }),
  });
  const text = await res.text();
  console.log("SEND", res.status, text);
  return text;
}

async function getEmail(id: string) {
  const res = await fetch(`https://api.resend.com/emails/${id}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  console.log("GET", id, res.status, await res.text());
}

async function main() {
  console.log("To:", to);
  console.log("From:", process.env.EMAIL_FROM);
  console.log("Key prefix:", key?.slice(0, 8));

  const deliverred = passwordResetOtpEmail({
    brandName: "Deliverred Transport",
    code: "111222",
    colours: {
      primary: "#1B4332",
      secondary: "#2D6A4F",
      accent: "#95D5B2",
      background: "#F8F9FA",
    },
    contactEmail: "bookings@deliverred.co.uk",
  });

  const sent = await sendRaw(deliverred.subject, deliverred.html);
  try {
    const id = JSON.parse(sent).id as string | undefined;
    if (id) {
      await new Promise((r) => setTimeout(r, 2000));
      await getEmail(id);
    }
  } catch {
    /* ignore */
  }
}

main().catch(console.error);
