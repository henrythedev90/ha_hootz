import clientPromise from "./mongodb";

export async function getDb() {
  const client = await clientPromise;
  return client.db(process.env.MONGODB_DB_NAME || "ha-hootz");
}

export async function getHostCollection() {
  const db = await getDb();
  return db.collection("hosts");
}

export async function getPresentationsCollection() {
  const db = await getDb();
  return db.collection("presentations");
}

/**
 * Get the auth_tokens collection for managing email verification and password reset tokens.
 * Tokens are stored hashed and are single-use with expiration.
 */
export async function getAuthTokensCollection() {
  const db = await getDb();
  return db.collection("auth_tokens");
}

/**
 * Get the email_jobs collection for asynchronous email delivery.
 * Jobs are processed by a shell script worker that polls this table.
 */
export async function getEmailJobsCollection() {
  const db = await getDb();
  return db.collection("email_jobs");
}
