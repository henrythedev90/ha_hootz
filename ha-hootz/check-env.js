// Quick script to check if MONGODB_URI is set
// Run with: node check-env.js

require("dotenv").config({ path: ".env.local" });

console.log("Environment Check:");
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("MONGODB_URI exists:", !!process.env.MONGODB_URI);
console.log(
  "MONGODB_URI value:",
  process.env.MONGODB_URI
    ? `${process.env.MONGODB_URI.substring(0, 20)}...`
    : "NOT SET"
);
console.log("\nAll MONGO-related env vars:");
Object.keys(process.env)
  .filter((k) => k.includes("MONGO"))
  .forEach((k) => console.log(`  ${k}: ${process.env[k] ? "SET" : "NOT SET"}`));
