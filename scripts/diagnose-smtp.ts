/**
 * Deep SMTP diagnose: verify, send, optional IMAP sent/bounce peek.
 * Usage: npx tsx scripts/diagnose-smtp.ts legendpie8@gmail.com
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import nodemailer from "nodemailer";

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

const to = process.argv[2] ?? "legendpie8@gmail.com";
const host = process.env.SMTP_HOST!;
const user = process.env.SMTP_USER!;
const pass = process.env.SMTP_PASS!;
const from = process.env.EMAIL_FROM ?? user;

async function trySend(label: string, port: number, secure: boolean) {
  console.log(`\n=== ${label} port=${port} secure=${secure} ===`);
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    connectionTimeout: 20000,
    greetingTimeout: 20000,
    logger: true,
    debug: true,
  });

  try {
    await transporter.verify();
    console.log("verify: OK");
  } catch (err) {
    console.error("verify FAILED:", err);
    return;
  }

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject: `Nexus SMTP diagnose ${label} ${Date.now()}`,
      text: `Plain text diagnose from ${from} via ${host}:${port}`,
      html: `<p>HTML diagnose from <strong>${from}</strong> via ${host}:${port}</p>`,
      headers: {
        "X-Mailer": "NexusMVP",
      },
    });
    console.log("accepted:", info.accepted);
    console.log("rejected:", info.rejected);
    console.log("response:", info.response);
    console.log("messageId:", info.messageId);
  } catch (err) {
    console.error("send FAILED:", err);
  }
}

async function main() {
  console.log({ host, user, from, to });
  await trySend("ssl-465", 465, true);
  await trySend("starttls-587", 587, false);
}

main().catch(console.error);
