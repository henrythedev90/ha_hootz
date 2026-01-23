import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Enable standalone output for Docker/Fly.io deployment
  output: "standalone",
};

export default nextConfig;
