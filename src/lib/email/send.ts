type EmailPayload = {
  to: string;
  subject: string;
  html: string;
};

type BrandEmailTheme = {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
};

function smtpConfigured() {
  return Boolean(
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
  );
}

async function sendViaSmtp(payload: EmailPayload) {
  const nodemailer = await import("nodemailer");
  const port = Number(process.env.SMTP_PORT ?? "465");
  const secure =
    process.env.SMTP_SECURE != null
      ? process.env.SMTP_SECURE === "true"
      : port === 465;

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const from =
    process.env.EMAIL_FROM ??
    process.env.SMTP_USER ??
    "NEXUS <noreply@localhost>";

  const info = await transporter.sendMail({
    from,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
  });

  console.log("Email sent via SMTP:", info.messageId);
}

async function sendViaResend(payload: EmailPayload) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "NEXUS <onboarding@resend.dev>",
      to: [payload.to],
      subject: payload.subject,
      html: payload.html,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("Email send failed (Resend):", text);
    return;
  }

  try {
    const data = (await response.json()) as { id?: string };
    if (data.id) console.log("Email queued via Resend:", data.id);
  } catch {
    // ignore
  }
}

/** Resend first (recommended), then SMTP, else stdout — never throws on provider failure. */
export async function sendEmail(payload: EmailPayload) {
  try {
    if (process.env.RESEND_API_KEY) {
      await sendViaResend(payload);
      return;
    }

    if (smtpConfigured()) {
      await sendViaSmtp(payload);
      return;
    }

    console.log("--- EMAIL (dev) ---");
    console.log(`To: ${payload.to}`);
    console.log(`Subject: ${payload.subject}`);
    console.log(payload.html);
    console.log("-------------------");
  } catch (err) {
    console.error("Email send failed:", err);
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Branded password-reset OTP — inline styles for email client compatibility. */
export function passwordResetOtpEmail(params: {
  brandName: string;
  code: string;
  expiresMinutes?: number;
  colours: BrandEmailTheme;
  contactEmail?: string;
}) {
  const brand = escapeHtml(params.brandName);
  const code = escapeHtml(params.code);
  const minutes = params.expiresMinutes ?? 5;
  const contact = params.contactEmail ? escapeHtml(params.contactEmail) : null;
  const { primary, secondary, accent, background } = params.colours;

  const digitCells = code
    .split("")
    .map(
      (digit) =>
        `<td align="center" style="padding:0 6px;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Courier New',monospace;font-size:28px;line-height:1;color:${primary};font-weight:700;white-space:nowrap;">${digit}</td>`
    )
    .join("");

  return {
    subject: `${params.brandName} - your password reset code`,
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${brand} password reset</title>
</head>
<body style="margin:0;padding:0;background-color:${background};font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${background};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 28px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,${primary} 0%,${secondary} 100%);padding:28px 32px;">
              <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:${accent};font-weight:600;">
                Password reset
              </p>
              <h1 style="margin:8px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.2;color:#ffffff;font-weight:700;">
                ${brand}
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.55;color:#1f2937;">
                Hi there,
              </p>
              <p style="margin:0 0 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.55;color:#4b5563;">
                Use this one-time code to reset your <strong style="color:${primary};">${brand}</strong> account password. It expires in <strong>${minutes} minutes</strong>.
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td align="center" style="background-color:${background};border:1px solid ${accent};border-radius:12px;padding:22px 12px;">
                    <p style="margin:0 0 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:${secondary};font-weight:600;">
                      Your code
                    </p>
                    <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto;border-collapse:collapse;white-space:nowrap;">
                      <tr>
                        ${digitCells}
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#6b7280;">
                If you didn&apos;t request this, you can ignore this email.
              </p>
              ${
                contact
                  ? `<p style="margin:16px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;line-height:1.5;color:#9ca3af;">
                Need help? Contact us at <a href="mailto:${contact}" style="color:${primary};text-decoration:none;font-weight:600;">${contact}</a>
              </p>`
                  : ""
              }
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 24px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.45;color:#9ca3af;text-align:center;">
                Sent by <span style="color:${primary};font-weight:600;">${brand}</span> · Do not share this code
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  };
}

/** Branded notice when password reset is requested for an unknown email. */
export function passwordResetNoAccountEmail(params: {
  brandName: string;
  email: string;
  colours: BrandEmailTheme;
  contactEmail?: string;
  registerUrl?: string;
}) {
  const brand = escapeHtml(params.brandName);
  const email = escapeHtml(params.email);
  const contact = params.contactEmail ? escapeHtml(params.contactEmail) : null;
  const registerUrl = params.registerUrl ? escapeHtml(params.registerUrl) : null;
  const { primary, secondary, accent, background } = params.colours;

  return {
    subject: `${params.brandName} - no account found`,
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${brand} no account found</title>
</head>
<body style="margin:0;padding:0;background-color:${background};font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${background};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 28px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,${primary} 0%,${secondary} 100%);padding:28px 32px;">
              <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:${accent};font-weight:600;">
                Password reset
              </p>
              <h1 style="margin:8px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.2;color:#ffffff;font-weight:700;">
                ${brand}
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.55;color:#1f2937;">
                Hi there,
              </p>
              <p style="margin:0 0 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.55;color:#4b5563;">
                We received a password reset request for <strong style="color:${primary};">${email}</strong>, but there is <strong>no ${brand} account</strong> with this email.
              </p>
              <p style="margin:0 0 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.55;color:#4b5563;">
                If you meant a different email, try again. If you don&apos;t have an account yet, create one first.
              </p>
              ${
                registerUrl
                  ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="border-radius:10px;background-color:${primary};">
                    <a href="${registerUrl}" style="display:inline-block;padding:12px 22px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">
                      Create an account
                    </a>
                  </td>
                </tr>
              </table>`
                  : ""
              }
              <p style="margin:0 0 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#6b7280;">
                If you didn&apos;t request this, you can ignore this email.
              </p>
              ${
                contact
                  ? `<p style="margin:16px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;line-height:1.5;color:#9ca3af;">
                Need help? Contact us at <a href="mailto:${contact}" style="color:${primary};text-decoration:none;font-weight:600;">${contact}</a>
              </p>`
                  : ""
              }
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 24px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.45;color:#9ca3af;text-align:center;">
                Sent by <span style="color:${primary};font-weight:600;">${brand}</span>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  };
}

/** HTML payload for post-booking customer (+ optional ops) notification. */
export function bookingConfirmationEmail(params: {
  brandName: string;
  bookingReference: string;
  route: string;
  priceIncVat: string;
  customerName: string;
}) {
  return {
    subject: `${params.brandName} booking confirmed — ${params.bookingReference}`,
    html: `
      <h1>Booking confirmed</h1>
      <p>Hi ${params.customerName},</p>
      <p>Your booking <strong>${params.bookingReference}</strong> with ${params.brandName} is confirmed.</p>
      <p><strong>Route:</strong> ${params.route}</p>
      <p><strong>Total (inc VAT):</strong> ${params.priceIncVat}</p>
      <p>We invoice on net-zero terms after delivery.</p>
    `,
  };
}

/** HTML payload when driver submits POD. */
export function podDeliveryEmail(params: {
  brandName: string;
  bookingReference: string;
  recipientName: string;
}) {
  return {
    subject: `${params.brandName} POD — ${params.bookingReference}`,
    html: `
      <h1>Proof of delivery</h1>
      <p>Your shipment <strong>${params.bookingReference}</strong> was signed for by ${params.recipientName}.</p>
      <p>Thank you for choosing ${params.brandName}.</p>
    `,
  };
}
