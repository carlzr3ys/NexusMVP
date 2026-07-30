import { NextResponse } from "next/server";

import { setOtp } from "@/lib/auth/otp";
import { getBrand } from "@/lib/brand/resolve";
import {
  passwordResetNoAccountEmail,
  passwordResetOtpEmail,
  sendEmail,
} from "@/lib/email/send";
import { prisma } from "@/lib/prisma";
import { verifyOrigin } from "@/lib/security/csrf";
import { getClientIp, isRateLimited } from "@/lib/security/rate-limit";

export async function POST(req: Request) {
  if (!verifyOrigin(req)) {
    return NextResponse.json({ error: "Forbidden: CSRF check failed" }, { status: 403 });
  }

  const ip = getClientIp(req);
  const rateLimit = isRateLimited(`forgot:${ip}`, { limit: 5, windowMs: 60000 });
  if (rateLimit.limited) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const brand = await getBrand();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (user?.passwordHash && user.isActive) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setOtp(normalizedEmail, code, 5 * 60 * 1000);

      const mail = passwordResetOtpEmail({
        brandName: brand.name,
        code,
        expiresMinutes: 5,
        colours: brand.colours,
        contactEmail: brand.contactEmail,
      });

      await sendEmail({
        to: normalizedEmail,
        subject: mail.subject,
        html: mail.html,
      });
    } else {
      const origin = new URL(req.url).origin;
      const mail = passwordResetNoAccountEmail({
        brandName: brand.name,
        email: normalizedEmail,
        colours: brand.colours,
        contactEmail: brand.contactEmail,
        registerUrl: `${origin}/registerCust`,
      });

      await sendEmail({
        to: normalizedEmail,
        subject: mail.subject,
        html: mail.html,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("FORGOT_PASSWORD_ERROR:", err);
    return NextResponse.json(
      { error: "Failed to process forgot password request" },
      { status: 500 }
    );
  }
}
