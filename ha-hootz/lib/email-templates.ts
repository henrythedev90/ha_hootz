/**
 * Email template utilities for generating email content.
 * These templates are used by the shell script worker to send emails via Resend API.
 */

export type EmailTemplate = "verify_email" | "reset_password";

/**
 * Base URL for the application (from environment or default).
 */
function getBaseUrl(): string {
  return process.env.NEXTAUTH_URL || process.env.APP_URL || "http://localhost:3000";
}

/**
 * Generates the verification email content.
 *
 * @param token - The plaintext token (will be included in the magic link)
 * @param name - Optional user name for personalization
 * @returns Email content object with subject, HTML, and text
 */
export function generateVerifyEmailContent(
  token: string,
  name?: string,
): { subject: string; html: string; text: string } {
  const baseUrl = getBaseUrl();
  // Point to the auth page with token parameter - the page will handle verification
  const verificationUrl = `${baseUrl}/auth/verify-email?token=${encodeURIComponent(token)}`;
  
  const greeting = name ? `Hi ${name},` : "Hi there,";

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Verify Your Email</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="font-size: 16px; margin-bottom: 20px;">
            ${greeting}
          </p>
          <p style="font-size: 16px; margin-bottom: 20px;">
            Thank you for signing up for Ha-Hootz! Please verify your email address by clicking the button below:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="display: inline-block; background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
              Verify Email Address
            </a>
          </div>
          <p style="font-size: 14px; color: #6b7280; margin-top: 30px; margin-bottom: 10px;">
            Or copy and paste this link into your browser:
          </p>
          <p style="font-size: 12px; color: #9ca3af; word-break: break-all; background: #f3f4f6; padding: 10px; border-radius: 4px;">
            ${verificationUrl}
          </p>
          <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
            This link will expire in 30 minutes. If you didn't create an account, you can safely ignore this email.
          </p>
        </div>
        <div style="text-align: center; margin-top: 20px; padding: 20px; color: #9ca3af; font-size: 12px;">
          <p>© ${new Date().getFullYear()} Ha-Hootz. All rights reserved.</p>
        </div>
      </body>
    </html>
  `;

  const text = `
${greeting}

Thank you for signing up for Ha-Hootz! Please verify your email address by visiting the following link:

${verificationUrl}

This link will expire in 30 minutes. If you didn't create an account, you can safely ignore this email.

© ${new Date().getFullYear()} Ha-Hootz. All rights reserved.
  `.trim();

  return {
    subject: "Verify Your Email Address - Ha-Hootz",
    html,
    text,
  };
}

/**
 * Generates the password reset email content.
 *
 * @param token - The plaintext token (will be included in the reset link)
 * @param name - Optional user name for personalization
 * @returns Email content object with subject, HTML, and text
 */
export function generateResetPasswordEmailContent(
  token: string,
  name?: string,
): { subject: string; html: string; text: string } {
  const baseUrl = getBaseUrl();
  const resetUrl = `${baseUrl}/auth/reset-password?token=${encodeURIComponent(token)}`;
  const greeting = name ? `Hi ${name},` : "Hi there,";

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Reset Your Password</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="font-size: 16px; margin-bottom: 20px;">
            ${greeting}
          </p>
          <p style="font-size: 16px; margin-bottom: 20px;">
            We received a request to reset your password for your Ha-Hootz account. Click the button below to set a new password:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="display: inline-block; background: #f5576c; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
              Reset Password
            </a>
          </div>
          <p style="font-size: 14px; color: #6b7280; margin-top: 30px; margin-bottom: 10px;">
            Or copy and paste this link into your browser:
          </p>
          <p style="font-size: 12px; color: #9ca3af; word-break: break-all; background: #f3f4f6; padding: 10px; border-radius: 4px;">
            ${resetUrl}
          </p>
          <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
            This link will expire in 15 minutes. If you didn't request a password reset, you can safely ignore this email.
          </p>
          <p style="font-size: 14px; color: #dc2626; margin-top: 20px; font-weight: 600;">
            ⚠️ For security reasons, if you didn't request this reset, please contact support immediately.
          </p>
        </div>
        <div style="text-align: center; margin-top: 20px; padding: 20px; color: #9ca3af; font-size: 12px;">
          <p>© ${new Date().getFullYear()} Ha-Hootz. All rights reserved.</p>
        </div>
      </body>
    </html>
  `;

  const text = `
${greeting}

We received a request to reset your password for your Ha-Hootz account. Visit the following link to set a new password:

${resetUrl}

This link will expire in 15 minutes. If you didn't request a password reset, you can safely ignore this email.

⚠️ For security reasons, if you didn't request this reset, please contact support immediately.

© ${new Date().getFullYear()} Ha-Hootz. All rights reserved.
  `.trim();

  return {
    subject: "Reset Your Password - Ha-Hootz",
    html,
    text,
  };
}
