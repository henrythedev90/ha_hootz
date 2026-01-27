import crypto from "crypto";
import bcrypt from "bcryptjs";
import { getAuthTokensCollection } from "./db";

/**
 * Token types supported by the authentication system.
 */
export type TokenType = "verify_email" | "reset_password";

/**
 * Token expiration times in milliseconds.
 * Email verification: 30 minutes
 * Password reset: 15 minutes
 */
const TOKEN_EXPIRATION: Record<TokenType, number> = {
  verify_email: 30 * 60 * 1000, // 30 minutes
  reset_password: 15 * 60 * 1000, // 15 minutes
};

/**
 * Rate limiting: Maximum number of tokens per user per type within the rate limit window.
 */
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const MAX_TOKENS_PER_WINDOW = 3; // Max 3 tokens per hour per type

/**
 * Generates a cryptographically secure random token.
 * Uses crypto.randomBytes for secure token generation.
 *
 * @returns A base64url-encoded token string (URL-safe, no padding)
 */
export function generateToken(): string {
  // Generate 32 bytes (256 bits) of random data
  const randomBytes = crypto.randomBytes(32);
  // Convert to base64url (URL-safe base64 without padding)
  return randomBytes.toString("base64url");
}

/**
 * Hashes a token using bcrypt before storing in the database.
 * This ensures tokens are never stored in plaintext.
 *
 * @param token - The plaintext token to hash
 * @returns A hashed token string
 */
export async function hashToken(token: string): Promise<string> {
  // Use bcrypt with cost factor 10 for token hashing
  // This is faster than password hashing but still secure
  return bcrypt.hash(token, 10);
}

/**
 * Verifies a plaintext token against a hashed token.
 *
 * @param token - The plaintext token to verify
 * @param hashedToken - The hashed token from the database
 * @returns True if the tokens match, false otherwise
 */
export async function verifyToken(
  token: string,
  hashedToken: string,
): Promise<boolean> {
  return bcrypt.compare(token, hashedToken);
}

/**
 * Creates a new authentication token and stores it in the database.
 * Implements rate limiting to prevent token spam.
 *
 * @param userId - The user ID this token belongs to
 * @param type - The type of token (verify_email or reset_password)
 * @returns The plaintext token (only returned once, never stored)
 */
export async function createToken(
  userId: string,
  type: TokenType,
): Promise<string> {
  const tokensCollection = await getAuthTokensCollection();

  // Rate limiting: Check how many tokens were created in the last hour
  const oneHourAgo = new Date(Date.now() - RATE_LIMIT_WINDOW);
  const recentTokens = await tokensCollection.countDocuments({
    userId,
    type,
    createdAt: { $gte: oneHourAgo },
  });

  if (recentTokens >= MAX_TOKENS_PER_WINDOW) {
    throw new Error(
      "Too many token requests. Please wait before requesting another token.",
    );
  }

  // Invalidate any existing tokens of the same type for this user
  // This ensures only one active token exists at a time
  await tokensCollection.updateMany(
    {
      userId,
      type,
      usedAt: null, // Only invalidate unused tokens
      expiresAt: { $gt: new Date() }, // Only invalidate non-expired tokens
    },
    {
      $set: {
        usedAt: new Date(),
      },
    },
  );

  // Generate and hash the token
  const plaintextToken = generateToken();
  const tokenHash = await hashToken(plaintextToken);

  // Calculate expiration time
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRATION[type]);

  // Store the hashed token in the database
  await tokensCollection.insertOne({
    userId,
    type,
    tokenHash,
    expiresAt,
    usedAt: null,
    createdAt: new Date(),
  });

  // Return the plaintext token (this is the only time it's available)
  return plaintextToken;
}

/**
 * Verifies and consumes a token.
 * Tokens are single-use: once verified, they are marked as used.
 *
 * @param token - The plaintext token to verify
 * @param type - The expected token type
 * @returns The userId if token is valid, null otherwise
 */
export async function verifyAndConsumeToken(
  token: string,
  type: TokenType,
): Promise<string | null> {
  const tokensCollection = await getAuthTokensCollection();

  // Find all unused, non-expired tokens of the specified type
  // We need to check all tokens because we can't search by hash directly
  const now = new Date();
  const candidateTokens = await tokensCollection
    .find({
      type,
      usedAt: null,
      expiresAt: { $gt: now },
    })
    .toArray();

  // Verify the token against each candidate
  for (const tokenDoc of candidateTokens) {
    const isValid = await verifyToken(token, tokenDoc.tokenHash);
    if (isValid) {
      // Token is valid - mark it as used
      await tokensCollection.updateOne(
        { _id: tokenDoc._id },
        {
          $set: {
            usedAt: new Date(),
          },
        },
      );
      return tokenDoc.userId;
    }
  }

  // Token not found or invalid
  return null;
}

/**
 * Cleans up expired tokens from the database.
 * This should be run periodically (e.g., via a cron job).
 * For now, we'll clean up during token verification to keep the DB tidy.
 */
export async function cleanupExpiredTokens(): Promise<void> {
  const tokensCollection = await getAuthTokensCollection();
  const now = new Date();

  // Delete tokens that are both expired and used
  // Keep expired but unused tokens for a short time for debugging
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  await tokensCollection.deleteMany({
    $or: [
      // Delete used tokens older than 1 day
      { $and: [{ usedAt: { $ne: null } }, { usedAt: { $lt: oneDayAgo } }] },
      // Delete expired unused tokens older than 1 day
      {
        expiresAt: { $lt: oneDayAgo },
        usedAt: null,
      },
    ],
  });
}
