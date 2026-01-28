import { NextRequest, NextResponse } from "next/server";
import { verifyAndConsumeToken, cleanupExpiredTokens } from "@/lib/auth-tokens";
import { getHostCollection } from "@/lib/db";
import { ObjectId } from "mongodb";

/**
 * GET /api/auth/verify-email-json?token=...
 *
 * Verifies an email address using a magic link token.
 * Returns JSON response instead of redirecting (for use by client-side pages).
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
      return NextResponse.json(
        { success: false, error: "missing_token" },
        { status: 400 },
      );
    }

    // Clean up expired tokens periodically
    await cleanupExpiredTokens();

    // Verify and consume the token
    const userId = await verifyAndConsumeToken(token, "verify_email");

    if (!userId) {
      // Token is invalid, expired, or already used
      // Don't reveal which case - same response for security
      return NextResponse.json(
        { success: false, error: "invalid_token" },
        { status: 400 },
      );
    }

    // Mark user's email as verified
    const hostsCollection = await getHostCollection();
    const updateResult = await hostsCollection.updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          emailVerified: true,
          updatedAt: new Date().toISOString(),
        },
      },
    );

    if (updateResult.matchedCount === 0) {
      // User doesn't exist (shouldn't happen, but handle gracefully)
      return NextResponse.json(
        { success: false, error: "user_not_found" },
        { status: 404 },
      );
    }

    // Success
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Email verification error:", error);
    return NextResponse.json(
      { success: false, error: "verification_failed" },
      { status: 500 },
    );
  }
}
