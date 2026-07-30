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
    process.env[key] = val;
  }
}

loadEnv();

const emailId = process.argv[2];

async function main() {
  const key = process.env.RESEND_API_KEY!;

  // Direct send branded OTP to icloud to isolate Resend vs app
  const { passwordResetOtpEmail, sendEmail } = await import("../src/lib/email/send");
  const mail = passwordResetOtpEmail({
    brandName: "Deliverred Transport",
    code: "998877",
    colours: {
      primary: "#1B4332",
      secondary: "#2D6A4F",
      accent: "#95D5B2",
      background: "#F8F9FA",
    },
    contactEmail: "bookings@deliverred.co.uk",
  });

  const to = "haikallkhuzairee04@icloud.com";
  console.log("Sending direct Resend to", to);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: [to],
      subject: mail.subject,
      html: mail.html,
    }),
  });
  const body = await res.text();
  console.log("direct send", res.status, body);

  try {
    const id = JSON.parse(body).id as string;
    for (let i = 0; i < 5; i++) {
      await new Promise((r) => setTimeout(r, 1500));
      const get = await fetch(`https://api.resend.com/emails/${id}`, {
        headers: { Authorization: `Bearer ${key}` },
      });
      const detail = await get.json();
      console.log(`poll${i + 1}: last_event=${detail.last_event}`);
      if (["delivered", "bounced", "failed", "complained"].includes(detail.last_event)) break;
    }
  } catch (e) {
    console.error(e);
  }

  // Also check user via check-user on 3001
  const check = await fetch("http://localhost:3001/api/auth/check-user", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "http://localhost:3001" },
    body: JSON.stringify({ email: to }),
  });
  console.log("check-user", check.status, await check.text());
}

main().catch(console.error);
