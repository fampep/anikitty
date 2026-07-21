import nodemailer from "nodemailer";
import { isProduction } from "@/lib/security/security";

export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export type SendEmailResult =
  | { ok: true; dev?: boolean; via?: "resend" | "smtp" }
  | { ok: false; error: string };

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function smtpConfigured(): boolean {
  return !!(
    process.env.SMTP_HOST?.trim() &&
    process.env.SMTP_USER?.trim() &&
    process.env.SMTP_PASS?.trim()
  );
}

function resendConfigured(): boolean {
  return !!process.env.RESEND_API_KEY?.trim();
}

export function isEmailDeliveryConfigured(): boolean {
  return resendConfigured() || smtpConfigured() || !isProduction();
}

/**
 * Send transactional email.
 *
 * Prefer Proton Mail SMTP (custom domain + SMTP token):
 *   SMTP_HOST=smtp.protonmail.ch
 *   SMTP_PORT=587
 *   SMTP_USER=noreply@yourdomain.com   (custom-domain address paired with the token)
 *   SMTP_PASS=<smtp token from Proton>
 *   EMAIL_FROM=AniKitty <noreply@yourdomain.com>
 *
 * Or Resend:
 *   RESEND_API_KEY=re_...
 *   EMAIL_FROM=AniKitty <noreply@yourdomain.com>
 *
 * In non-production with neither configured, logs the message (dev recovery testing).
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const from =
    process.env.EMAIL_FROM?.trim() ||
    (smtpConfigured()
      ? process.env.SMTP_USER!.trim()
      : "AniKitty <onboarding@resend.dev>");

  if (smtpConfigured()) {
    return sendViaSmtp(input, from);
  }

  if (resendConfigured()) {
    return sendViaResend(input, from);
  }

  if (!isProduction()) {
    console.info("[email:dev]", {
      to: input.to,
      subject: input.subject,
      text: input.text,
    });
    return { ok: true, dev: true };
  }

  return {
    ok: false,
    error: "Email delivery is not configured on this server",
  };
}

async function sendViaSmtp(
  input: SendEmailInput,
  from: string,
): Promise<SendEmailResult> {
  const host = process.env.SMTP_HOST!.trim();
  const port = Number(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER!.trim();
  const pass = process.env.SMTP_PASS!.trim();
  const secure =
    process.env.SMTP_SECURE === "1" ||
    process.env.SMTP_SECURE === "true" ||
    port === 465;

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      requireTLS: !secure && port === 587,
      auth: { user, pass },
    });

    await transporter.sendMail({
      from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html:
        input.html ??
        `<pre style="font-family:sans-serif;white-space:pre-wrap">${escapeHtml(input.text)}</pre>`,
    });

    return { ok: true, via: "smtp" };
  } catch (e) {
    console.error("[email] smtp failed", e);
    return { ok: false, error: "Failed to send email" };
  }
}

async function sendViaResend(
  input: SendEmailInput,
  from: string,
): Promise<SendEmailResult> {
  const key = process.env.RESEND_API_KEY!.trim();

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        text: input.text,
        html:
          input.html ??
          `<pre style="font-family:sans-serif;white-space:pre-wrap">${escapeHtml(input.text)}</pre>`,
      }),
      signal: AbortSignal.timeout(12_000),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[email] resend failed", res.status, detail.slice(0, 400));
      return { ok: false, error: "Failed to send email" };
    }

    return { ok: true, via: "resend" };
  } catch (e) {
    console.error("[email] resend failed", e);
    return { ok: false, error: "Failed to send email" };
  }
}
