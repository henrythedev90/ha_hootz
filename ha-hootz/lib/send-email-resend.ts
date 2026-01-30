/**
 * Send transactional emails via Resend API from the Node app.
 * Used in production (Fly.io) at https://www.ha-hootz.com — no separate worker required.
 * Set RESEND_API_KEY and optionally RESEND_FROM_EMAIL (default below) in Fly secrets.
 */

import {
  generateVerifyEmailContent,
  generateResetPasswordEmailContent,
} from "@/lib/email-templates";
import { markEmailJobAsSent } from "@/lib/email-jobs";
import type { EmailTemplate } from "@/lib/email-jobs";

const RESEND_API_URL = "https://api.resend.com/emails";

/** Default from address for the deployed app (verify ha-hootz.com in Resend Domains). */
const DEFAULT_FROM_EMAIL = "noreply@ha-hootz.com";

function getFromEmail(): string {
  return process.env.RESEND_FROM_EMAIL || DEFAULT_FROM_EMAIL;
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
  const fromEmail = getFromEmail();

  if (!apiKey) {
    const msg = "RESEND_API_KEY is not set";
    console.error("[Resend] CONFIG ERROR:", msg, "| fromEmail would be:", fromEmail);
    return { ok: false, error: msg };
  }

  const { subject, html, text } =
    template === "verify_email"
      ? generateVerifyEmailContent(payload.token, payload.name)
      : generateResetPasswordEmailContent(payload.token, payload.name);

  // Log attempt (no secrets) so Fly logs show what’s happening
  console.log("[Resend] Sending", template, "to", toEmail, "from", fromEmail);

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

    const body = (await res.json()) as { id?: string; message?: string; name?: string };
    if (res.ok && res.status >= 200 && res.status < 300) {
      if (options?.jobId) {
        try {
          await markEmailJobAsSent(options.jobId);
        } catch (e) {
          console.error("[Resend] Failed to mark job sent:", e);
        }
      }
      console.log("[Resend] OK sent to", toEmail, "id:", body.id);
      return { ok: true, resendId: body.id };
    }

    const errorMsg =
      typeof body?.message === "string"
        ? body.message
        : body?.message ?? `HTTP ${res.status}`;
    const errorName = typeof body?.name === "string" ? body.name : "";
    console.error(
      "[Resend] API ERROR:",
      "status=" + res.status,
      "message=" + errorMsg,
      errorName ? "name=" + errorName : "",
      "| from=" + fromEmail,
      "| to=" + toEmail,
    );
    return { ok: false, error: errorMsg };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to send email";
    console.error("[Resend] SEND FAILED:", message, "| from=" + fromEmail, "| to=" + toEmail);
    return { ok: false, error: message };
  }
}
