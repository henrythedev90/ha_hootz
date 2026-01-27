import { getEmailJobsCollection } from "./db";
import { ObjectId } from "mongodb";

/**
 * Email job status values.
 */
export type EmailJobStatus = "pending" | "sent" | "failed";

/**
 * Email template types for different email flows.
 */
export type EmailTemplate = "verify_email" | "reset_password";

/**
 * Payload structure for email verification jobs.
 */
export interface VerifyEmailPayload {
  token: string; // Plaintext token (only in job, never in DB)
  name?: string; // User's name for personalization
}

/**
 * Payload structure for password reset jobs.
 */
export interface ResetPasswordPayload {
  token: string; // Plaintext token (only in job, never in DB)
  name?: string; // User's name for personalization
}

export type EmailJobPayload = VerifyEmailPayload | ResetPasswordPayload;

/**
 * Creates an email job in the database for asynchronous processing.
 * The job will be picked up by the shell script worker.
 *
 * @param toEmail - Recipient email address
 * @param template - Email template type
 * @param payload - Template-specific payload data
 * @returns The created job ID
 */
export async function createEmailJob(
  toEmail: string,
  template: EmailTemplate,
  payload: EmailJobPayload,
): Promise<string> {
  const jobsCollection = await getEmailJobsCollection();

  // Create the job with pending status
  const result = await jobsCollection.insertOne({
    toEmail,
    template,
    payload: JSON.stringify(payload), // Store as JSON string for shell script compatibility
    status: "pending" as EmailJobStatus,
    attempts: 0,
    lastError: null,
    createdAt: new Date(),
  });

  return result.insertedId.toString();
}

/**
 * Gets pending email jobs for processing by the worker.
 * Limits results to prevent overwhelming the worker.
 *
 * @param limit - Maximum number of jobs to return (default: 10)
 * @returns Array of pending email jobs
 */
export async function getPendingEmailJobs(limit: number = 10) {
  const jobsCollection = await getEmailJobsCollection();

  return jobsCollection
    .find({
      status: "pending",
    })
    .sort({ createdAt: 1 }) // Process oldest jobs first
    .limit(limit)
    .toArray();
}

/**
 * Marks an email job as successfully sent.
 *
 * @param jobId - The job ID to mark as sent
 */
export async function markEmailJobAsSent(jobId: string): Promise<void> {
  const jobsCollection = await getEmailJobsCollection();
  await jobsCollection.updateOne(
    { _id: new ObjectId(jobId) },
    {
      $set: {
        status: "sent" as EmailJobStatus,
      },
    },
  );
}

/**
 * Marks an email job as failed and records the error.
 * Increments the attempt counter for retry logic.
 *
 * @param jobId - The job ID to mark as failed
 * @param error - Error message describing the failure
 */
export async function markEmailJobAsFailed(
  jobId: string,
  error: string,
): Promise<void> {
  const jobsCollection = await getEmailJobsCollection();

  // Get current attempt count
  const job = await jobsCollection.findOne({ _id: new ObjectId(jobId) });
  const attempts = (job?.attempts || 0) + 1;

  await jobsCollection.updateOne(
    { _id: new ObjectId(jobId) },
    {
      $set: {
        status:
          attempts >= 3
            ? ("failed" as EmailJobStatus)
            : ("pending" as EmailJobStatus), // After 3 attempts, mark as permanently failed
        attempts,
        lastError: error,
      },
    },
  );
}

/**
 * Gets email job statistics for monitoring.
 *
 * @returns Statistics about email jobs
 */
export async function getEmailJobStats() {
  const jobsCollection = await getEmailJobsCollection();

  const [pending, sent, failed] = await Promise.all([
    jobsCollection.countDocuments({ status: "pending" }),
    jobsCollection.countDocuments({ status: "sent" }),
    jobsCollection.countDocuments({ status: "failed" }),
  ]);

  return {
    pending,
    sent,
    failed,
    total: pending + sent + failed,
  };
}
