import { NextRequest, NextResponse } from "next/server";
import { getHostCollection } from "@/lib/db";
import { createToken } from "@/lib/auth-tokens";
import { createEmailJob } from "@/lib/email-jobs";

/**
 * POST /api/auth/forgot-password
 * 
 * Initiates a password reset flow by sending a reset link via email.
 * 
 * Security:
 * - Never reveals whether an email exists (same response for all requests)
 * - Rate limiting is handled in createToken()
 * - Tokens expire after 15 minutes
 * - Always returns success to prevent email enumeration
 * 
 * Request body:
 * {
 *   "email": "user@example.com"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 },
      );
    }

    // Normalize email (lowercase)
    const normalizedEmail = email.toLowerCase().trim();

    const hostsCollection = await getHostCollection();

    // Find user by email
    // We check if user exists, but we don't reveal this information
    const user = await hostsCollection.findOne({ email: normalizedEmail });

    if (user) {
      // User exists - create password reset token and email job
      try {
        const userId = user._id.toString();
        const resetToken = await createToken(userId, "reset_password");
        await createEmailJob(normalizedEmail, "reset_password", {
          token: resetToken,
          name: user.name || undefined,
        });
      } catch (tokenError: unknown) {
        // Log error but don't reveal to user
        console.error("Error creating password reset token:", tokenError);
        // Continue to return success response
      }
    }
    // If user doesn't exist, we still return success to prevent email enumeration

    // Always return the same success message regardless of whether email exists
    // This prevents attackers from discovering which emails are registered
    return NextResponse.json(
      {
        message:
          "If an account with that email exists, a password reset link has been sent.",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Forgot password error:", error);
    // Return generic error to prevent information leakage
    return NextResponse.json(
      { error: "An error occurred. Please try again later." },
      { status: 500 },
    );
  }
}
