/**
 * Send transactional emails via Resend API from the Node app.
 * Used so emails work on Fly.io (no separate shell-script worker required).
 */

import {
  generateVerifyEmailContent,
  generateResetPasswordEmailContent,
} from "@/lib/email-templates";
import { markEmailJobAsSent } from "@/lib/email-jobs";
import type { EmailTemplate } from "@/lib/email-jobs";

const RESEND_API_URL = "https://api.resend.com/emails";

function getFromEmail(): string {
  return process.env.RESEND_FROM_EMAIL || "noreply@ha-hootz.com";
}

export interface SendEmailPayload {
  token: string;
  name?: string;
}

export interface SendEmailResult {
  ok: boolean;
  error?: string;
  resendId?: string;
}

/**
 * Sends one email via Resend API. Uses same templates as the shell script.
 * On success, optionally marks the email job as sent.
 */
export async function sendEmailWithResend(
  toEmail: string,
  template: EmailTemplate,
  payload: SendEmailPayload,
  options?: { jobId?: string },
): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    const msg = "RESEND_API_KEY is not set";
    console.error("[Resend]", msg);
    return { ok: false, error: msg };
  }

  const fromEmail = getFromEmail();
  const { subject, html, text } =
    template === "verify_email"
      ? generateVerifyEmailContent(payload.token, payload.name)
      : generateResetPasswordEmailContent(payload.token, payload.name);

  try {
    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        subject,
        html,
        text,
      }),
    });

    const body = (await res.json()) as { id?: string; message?: string };
    if (res.ok && res.status >= 200 && res.status < 300) {
      if (options?.jobId) {
        try {
          await markEmailJobAsSent(options.jobId);
        } catch (e) {
          console.error("[Resend] Failed to mark job sent:", e);
        }
      }
      if (process.env.NODE_ENV === "development") {
        console.log("[Resend] Email sent to", toEmail, "id:", body.id);
      }
      return { ok: true, resendId: body.id };
    }

    const errorMsg =
      typeof body?.message === "string"
        ? body.message
        : body?.message ?? `HTTP ${res.status}`;
    console.error("[Resend] API error:", res.status, errorMsg);
    return { ok: false, error: errorMsg };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to send email";
    console.error("[Resend] Send failed:", message);
    return { ok: false, error: message };
  }
}
