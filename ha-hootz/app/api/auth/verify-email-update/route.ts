import { NextRequest, NextResponse } from "next/server";
import { getHostCollection } from "@/lib/db";
import { ObjectId } from "mongodb";

/**
 * POST /api/auth/verify-email-update
 *
 * Updates a user's emailVerified status to true.
 * This is called from the client-side verification page.
 *
 * Security:
 * - Only updates emailVerified status
 * - Requires userId (which was verified via token on client)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 },
      );
    }

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
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(
      { message: "Email verified successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Email verification update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
