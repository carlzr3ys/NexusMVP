/**
 * Debug forgot-password for a specific email against localhost.
 * Usage: npx tsx scripts/debug-forgot-local.ts email@example.com
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import { PrismaClient } from "@prisma/client";

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

const email = (process.argv[2] ?? "").toLowerCase().trim();
const base = process.env.BASE_URL ?? "http://localhost:3000";

async function main() {
  if (!email) {
    console.error("Usage: npx tsx scripts/debug-forgot-local.ts you@email.com");
    process.exit(1);
  }

  console.log("RESEND_API_KEY set?", Boolean(process.env.RESEND_API_KEY));
  console.log("EMAIL_FROM:", process.env.EMAIL_FROM);
  console.log("SMTP configured?", Boolean(process.env.SMTP_HOST && process.env.SMTP_PASS));

  const prisma = new PrismaClient();
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
      passwordHash: true,
      firstName: true,
      lastName: true,
    },
  });

  if (!user) {
    console.log("DB user: NOT FOUND — forgot-password will return ok but SEND NOTHING");
  } else {
    console.log("DB user:", {
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      hasPassword: Boolean(user.passwordHash),
      name: [user.firstName, user.lastName].filter(Boolean).join(" "),
    });
  }

  // health check localhost
  try {
    const home = await fetch(base, { redirect: "manual" });
    console.log("localhost:", home.status);
  } catch (err) {
    console.error("localhost DOWN — start npm run dev first:", err);
    await prisma.$disconnect();
    process.exit(1);
  }

  const res = await fetch(`${base}/api/auth/forgot-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: base,
    },
    body: JSON.stringify({ email }),
  });
  console.log("forgot-password HTTP", res.status, await res.text());

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  process.exit(1);
});
