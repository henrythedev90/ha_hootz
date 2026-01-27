import { NextRequest, NextResponse } from "next/server";
import { verifyAndConsumeToken, cleanupExpiredTokens } from "@/lib/auth-tokens";
import { getHostCollection } from "@/lib/db";

/**
 * GET /api/auth/verify-email?token=...
 * 
 * Verifies an email address using a magic link token.
 * This endpoint is called when the user clicks the verification link in their email.
 * 
 * Security:
 * - Tokens are single-use and expire after 30 minutes
 * - Never reveals whether an email exists (same response for invalid/expired tokens)
 * - Invalidates token after successful verification
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get("token");

    if (!token) {
      // Redirect to a page showing error message
      return NextResponse.redirect(
        new URL("/auth?error=missing_token&mode=signin", request.url),
      );
    }

    // Clean up expired tokens periodically
    await cleanupExpiredTokens();

    // Verify and consume the token
    const userId = await verifyAndConsumeToken(token, "verify_email");

    if (!userId) {
      // Token is invalid, expired, or already used
      // Don't reveal which case - same response for security
      return NextResponse.redirect(
        new URL("/auth?error=invalid_token&mode=signin", request.url),
      );
    }

    // Mark user's email as verified
    const hostsCollection = await getHostCollection();
    const updateResult = await hostsCollection.updateOne(
      { _id: userId },
      {
        $set: {
          emailVerified: true,
          updatedAt: new Date().toISOString(),
        },
      },
    );

    if (updateResult.matchedCount === 0) {
      // User doesn't exist (shouldn't happen, but handle gracefully)
      return NextResponse.redirect(
        new URL("/auth?error=user_not_found&mode=signin", request.url),
      );
    }

    // Success - redirect to sign in page with success message
    return NextResponse.redirect(
      new URL("/auth?verified=true&mode=signin", request.url),
    );
  } catch (error) {
    console.error("Email verification error:", error);
    return NextResponse.redirect(
      new URL("/auth?error=verification_failed&mode=signin", request.url),
    );
  }
}
