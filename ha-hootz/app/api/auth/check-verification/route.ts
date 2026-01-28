import { NextRequest, NextResponse } from "next/server";
import { getHostCollection } from "@/lib/db";
import bcrypt from "bcryptjs";

/**
 * POST /api/auth/check-verification
 * 
 * Checks if a user's email is verified.
 * Only returns verification status if credentials are correct (prevents email enumeration).
 * 
 * Security:
 * - Requires both email and password to prevent email enumeration
 * - Only returns verification status if credentials are valid
 * - Returns generic error if credentials are invalid
 * 
 * Request body:
 * {
 *   "email": "user@example.com",
 *   "password": "password123"
 * }
 * 
 * Response:
 * {
 *   "verified": true/false,
 *   "exists": true/false
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 },
      );
    }

    const hostsCollection = await getHostCollection();
    const normalizedEmail = email.toLowerCase().trim();

    // Find user by email
    const host = await hostsCollection.findOne({
      email: normalizedEmail,
    });

    if (!host) {
      // User doesn't exist - return generic response to prevent enumeration
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(
      password as string,
      host.password as string,
    );

    if (!isPasswordValid) {
      // Password is wrong - return generic response
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      );
    }

    // Credentials are valid - return verification status
    return NextResponse.json(
      {
        verified: host.emailVerified === true,
        exists: true,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Check verification error:", error);
    return NextResponse.json(
      { error: "An error occurred. Please try again." },
      { status: 500 },
    );
  }
}
