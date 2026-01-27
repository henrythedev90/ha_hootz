#!/usr/bin/env node

/**
 * Email Worker Helper Script
 * 
 * This Node.js script provides MongoDB operations for the shell script email worker.
 * It's called by the shell script to interact with MongoDB since shell scripts
 * have limited MongoDB support.
 * 
 * Usage:
 *   node scripts/email-worker-helper.js <command> [args...]
 * 
 * Commands:
 *   get-pending <limit>          - Get pending email jobs
 *   mark-sent <jobId>            - Mark job as sent
 *   mark-failed <jobId> <error>   - Mark job as failed with error
 */

const { MongoClient, ObjectId } = require("mongodb");

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || "ha-hootz";

if (!MONGODB_URI) {
  console.error("Error: MONGODB_URI environment variable is required");
  process.exit(1);
}

async function getPendingJobs(limit) {
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    const db = client.db(MONGODB_DB_NAME);
    const jobs = await db
      .collection("email_jobs")
      .find({ status: "pending" })
      .sort({ createdAt: 1 })
      .limit(parseInt(limit, 10))
      .toArray();
    console.log(JSON.stringify(jobs));
  } catch (error) {
    console.error(JSON.stringify({ error: error.message }));
    process.exit(1);
  } finally {
    await client.close();
  }
}

async function markJobAsSent(jobId) {
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    const db = client.db(MONGODB_DB_NAME);
    await db.collection("email_jobs").updateOne(
      { _id: new ObjectId(jobId) },
      {
        $set: {
          status: "sent",
        },
      }
    );
    console.log(JSON.stringify({ success: true }));
  } catch (error) {
    console.error(JSON.stringify({ error: error.message }));
    process.exit(1);
  } finally {
    await client.close();
  }
}

async function markJobAsFailed(jobId, errorMessage) {
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    const db = client.db(MONGODB_DB_NAME);
    
    // Get current attempt count
    const job = await db.collection("email_jobs").findOne({
      _id: new ObjectId(jobId),
    });
    const attempts = (job?.attempts || 0) + 1;
    
    await db.collection("email_jobs").updateOne(
      { _id: new ObjectId(jobId) },
      {
        $set: {
          status: attempts >= 3 ? "failed" : "pending",
          attempts,
          lastError: errorMessage,
        },
      }
    );
    console.log(JSON.stringify({ success: true, attempts }));
  } catch (error) {
    console.error(JSON.stringify({ error: error.message }));
    process.exit(1);
  } finally {
    await client.close();
  }
}

// Main command handler
const command = process.argv[2];

if (command === "get-pending") {
  const limit = process.argv[3] || "10";
  getPendingJobs(limit).catch((error) => {
    console.error(JSON.stringify({ error: error.message }));
    process.exit(1);
  });
} else if (command === "mark-sent") {
  const jobId = process.argv[3];
  if (!jobId) {
    console.error("Error: jobId is required");
    process.exit(1);
  }
  markJobAsSent(jobId).catch((error) => {
    console.error(JSON.stringify({ error: error.message }));
    process.exit(1);
  });
} else if (command === "mark-failed") {
  const jobId = process.argv[3];
  const errorMessage = process.argv[4] || "Unknown error";
  if (!jobId) {
    console.error("Error: jobId is required");
    process.exit(1);
  }
  markJobAsFailed(jobId, errorMessage).catch((error) => {
    console.error(JSON.stringify({ error: error.message }));
    process.exit(1);
  });
} else {
  console.error("Error: Unknown command. Use: get-pending, mark-sent, or mark-failed");
  process.exit(1);
}
