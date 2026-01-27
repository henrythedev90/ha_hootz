import { NextRequest, NextResponse } from "next/server";
import { getHostCollection } from "@/lib/db";
import { createToken } from "@/lib/auth-tokens";
import { createEmailJob } from "@/lib/email-jobs";

/**
 * POST /api/auth/resend-verification
 * 
 * Resends the email verification link to a user.
 * Useful if the user didn't receive the initial email or the link expired.
 * 
 * Security:
 * - Never reveals whether an email exists (same response for all requests)
 * - Rate limiting is handled in createToken()
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
    // We check if user exists and is unverified, but we don't reveal this information
    const user = await hostsCollection.findOne({ email: normalizedEmail });

    if (user && !user.emailVerified) {
      // User exists and email is not verified - create new verification token and email job
      try {
        const userId = user._id.toString();
        const verificationToken = await createToken(userId, "verify_email");
        await createEmailJob(normalizedEmail, "verify_email", {
          token: verificationToken,
          name: user.name || undefined,
        });
      } catch (tokenError: any) {
        // Log error but don't reveal to user
        console.error("Error creating verification token:", tokenError);
        // Continue to return success response
      }
    }
    // If user doesn't exist or is already verified, we still return success

    // Always return the same success message regardless of whether email exists
    // This prevents attackers from discovering which emails are registered
    return NextResponse.json(
      {
        message:
          "If an account with that email exists and is unverified, a verification link has been sent.",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Resend verification error:", error);
    // Return generic error to prevent information leakage
    return NextResponse.json(
      { error: "An error occurred. Please try again later." },
      { status: 500 },
    );
  }
}
