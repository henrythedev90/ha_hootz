import { NextRequest, NextResponse } from "next/server";
import {
  getSessionIdFromCode,
  getSession as getTriviaSession,
} from "@/lib/redis/triviaRedis";
import { getHostCollection } from "@/lib/db";
import { ObjectId } from "mongodb";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionCode: string }> }
) {
  try {
    const { sessionCode } = await params;

    // Get sessionId from sessionCode
    const sessionId = await getSessionIdFromCode(sessionCode);
    if (!sessionId) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Get session to get hostId
    const triviaSession = await getTriviaSession(sessionId);
    if (!triviaSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Get host information from MongoDB
    const hostsCollection = await getHostCollection();
    const host = await hostsCollection.findOne({
      _id: new ObjectId(triviaSession.hostId),
    });

    if (!host) {
      return NextResponse.json({ error: "Host not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      hostName: host.name || host.email || "Host",
    });
  } catch (error: unknown) {
    console.error("Error fetching host name:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
