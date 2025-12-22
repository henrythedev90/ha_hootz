import { NextResponse } from "next/server";
import redisPromise from "@/lib/redis";

// This route will trigger Redis module to load and show the log
export async function GET() {
  try {
    const redis = await redisPromise;

    // Test connection with a simple ping
    const pong = await redis.ping();

    return NextResponse.json({
      success: true,
      message: "Redis connection successful",
      ping: pong,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Redis connection failed",
      },
      { status: 500 }
    );
  }
}
