import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Note: We use a custom server (server.ts) for Socket.io support
  // Standalone output is not compatible with custom servers
  // The Dockerfile handles dependencies and file copying manually
};

export default nextConfig;
