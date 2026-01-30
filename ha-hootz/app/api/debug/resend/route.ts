import { NextResponse } from "next/server";

/**
 * GET /api/debug/resend
 *
 * Safe Resend config check for debugging (no secrets returned).
 * Use: curl https://www.ha-hootz.com/api/debug/resend
 */
export async function GET() {
  const apiKeySet = Boolean(process.env.RESEND_API_KEY);
  const fromEmail =
    process.env.RESEND_FROM_EMAIL || "noreply@ha-hootz.com";
  const baseUrl =
    process.env.NEXTAUTH_URL || process.env.APP_URL || "http://localhost:3000";

  const diagnostics = {
    resendApiKeySet: apiKeySet,
    fromEmail,
    baseUrlForLinks: baseUrl,
    nodeEnv: process.env.NODE_ENV ?? "unknown",
    hint: !apiKeySet
      ? "Set RESEND_API_KEY in Fly secrets and restart."
      : "If emails still fail, check Fly logs for [Resend] API ERROR. Verify ha-hootz.com in Resend Domains if using noreply@ha-hootz.com.",
  };

  return NextResponse.json(diagnostics, { status: 200 });
}
