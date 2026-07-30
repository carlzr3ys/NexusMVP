/**
 * Test SMTP config from .env
 * Usage: npx tsx scripts/smoke-smtp.ts you@email.com
 */
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
    process.env[key] = val;
  }
}

loadEnv();

const to = process.argv[2];
if (!to) {
  console.error("Usage: npx tsx scripts/smoke-smtp.ts you@email.com");
  process.exit(1);
}

if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
  console.error("Missing SMTP_HOST / SMTP_USER / SMTP_PASS in .env");
  process.exit(1);
}

async function main() {
  console.log("SMTP_HOST:", process.env.SMTP_HOST);
  console.log("SMTP_PORT:", process.env.SMTP_PORT);
  console.log("SMTP_USER:", process.env.SMTP_USER);
  console.log("EMAIL_FROM:", process.env.EMAIL_FROM);
  console.log("To:", to);

  const mail = passwordResetOtpEmail({
    brandName: "Deliverred Transport",
    code: "654321",
    colours: {
      primary: "#1B4332",
      secondary: "#2D6A4F",
      accent: "#95D5B2",
      background: "#F8F9FA",
    },
    contactEmail: "bookings@deliverred.co.uk",
  });

  await sendEmail({ to, subject: mail.subject, html: mail.html });
  console.log("Done — check inbox/spam.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
