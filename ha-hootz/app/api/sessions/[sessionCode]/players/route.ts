import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getSessionIdFromCode,
  getSession as getTriviaSession,
} from "@/lib/redis/triviaRedis";
import redisPromise from "@/lib/redis/client";
import { playersKey, playerSocketKey, playerAvatarsKey } from "@/lib/redis/keys";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionCode: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sessionCode } = await params;
    const sessionId = await getSessionIdFromCode(sessionCode);
    if (!sessionId) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Verify host owns this session
    const triviaSession = await getTriviaSession(sessionId);
    if (!triviaSession || triviaSession.hostId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const redis = await redisPromise;

    // Get all players (playerId -> name mapping)
    const playersHash = await redis.hGetAll(playersKey(sessionId));
    // Get all avatars (playerId -> avatarUrl mapping)
    const avatarsHash = await redis.hGetAll(playerAvatarsKey(sessionId));

    // Convert to array and filter only active players (those with active sockets)
    const players: Array<{ playerId: string; name: string; avatarUrl?: string }> = [];

    // Get Socket.io instance to check active connections
    const { getSocketServer } = await import("@/lib/socket/server");
    const io = getSocketServer();

    for (const [playerId, name] of Object.entries(playersHash)) {
      const socketId = await redis.get(playerSocketKey(sessionId, playerId));
      if (socketId) {
        const socket = io.sockets.sockets.get(socketId);
        if (socket && socket.connected) {
          players.push({
            playerId,
            name,
            avatarUrl: avatarsHash[playerId] || undefined,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      players,
      playerCount: players.length,
    });
  } catch (error: any) {
    console.error("Error fetching players:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
