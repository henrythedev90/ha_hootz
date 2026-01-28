import { NextRequest, NextResponse } from "next/server";
import { getHostCollection } from "@/lib/db";
import { verifyAndConsumeToken, cleanupExpiredTokens } from "@/lib/auth-tokens";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";

/**
 * POST /api/auth/reset-password
 *
 * Completes the password reset flow by verifying the token and updating the password.
 *
 * Security:
 * - Tokens are single-use and expire after 15 minutes
 * - Password is hashed before storage
 * - Token is invalidated after successful use
 * - Never reveals whether token is valid until after successful reset
 *
 * Request body:
 * {
 *   "token": "reset_token_from_email",
 *   "password": "new_password"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 },
      );
    }

    // Clean up expired tokens periodically
    await cleanupExpiredTokens();

    // Verify and consume the token
    const userId = await verifyAndConsumeToken(token, "reset_password");

    if (!userId) {
      // Token is invalid, expired, or already used
      // Return generic error to prevent information leakage
      return NextResponse.json(
        { error: "Invalid or expired reset token" },
        { status: 400 },
      );
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user's password
    const hostsCollection = await getHostCollection();
    const updateResult = await hostsCollection.updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          password: hashedPassword,
          updatedAt: new Date().toISOString(),
        },
      },
    );

    if (updateResult.matchedCount === 0) {
      // User doesn't exist (shouldn't happen if token was valid)
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Success - password has been reset
    return NextResponse.json(
      {
        message: "Password has been reset successfully. You can now sign in.",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "An error occurred. Please try again later." },
      { status: 500 },
    );
  }
}
