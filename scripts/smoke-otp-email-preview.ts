/**
 * Sends branded OTP preview emails via Resend (both brands).
 * Usage: npx tsx scripts/smoke-otp-email-preview.ts you@email.com
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
    if (!(key in process.env)) process.env[key] = val;
  }
}

loadEnv();

const to = process.argv[2];
if (!to) {
  console.error("Usage: npx tsx scripts/smoke-otp-email-preview.ts you@email.com");
  process.exit(1);
}

const brands = [
  {
    name: "Deliverred Transport",
    contactEmail: "bookings@deliverred.co.uk",
    colours: {
      primary: "#1B4332",
      secondary: "#2D6A4F",
      accent: "#95D5B2",
      background: "#F8F9FA",
    },
  },
  {
    name: "Titan Cargo",
    contactEmail: "hello@titancargo.co.uk",
    colours: {
      primary: "#0B132B",
      secondary: "#1C2541",
      accent: "#5BC0BE",
      background: "#FFFFFF",
    },
  },
];

async function main() {
  for (const brand of brands) {
    const mail = passwordResetOtpEmail({
      brandName: brand.name,
      code: brand.name.startsWith("Deliverred") ? "482901" : "719354",
      expiresMinutes: 5,
      colours: brand.colours,
      contactEmail: brand.contactEmail,
    });
    console.log(`Sending: ${mail.subject} → ${to}`);
    await sendEmail({ to, subject: mail.subject, html: mail.html });
  }
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
