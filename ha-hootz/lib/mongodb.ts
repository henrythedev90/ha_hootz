import { MongoClient } from "mongodb";

// Lazy initialization - only create client when promise is actually awaited
// This prevents build-time errors when MONGODB_URI is not set
let client: MongoClient;
let clientPromise: Promise<MongoClient>;

function createMongoClient(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    // During Next.js build, env vars may not be available
    // Check if we're in a build context
    const isBuildTime =
      process.env.NEXT_PHASE === "phase-production-build" ||
      (process.env.NODE_ENV === "production" && !process.env.NEXT_RUNTIME);

    if (isBuildTime) {
      // During build, return a promise that will fail at runtime if URI is not set
      // This allows the build to complete
      console.warn(
        "MONGODB_URI not set during build - this is expected. Set it at runtime."
      );
      return Promise.reject(
        new Error(
          "MONGODB_URI is not set. Please set it in your environment variables."
        )
      );
    }

    // At runtime, provide a helpful error message
    const envHint =
      process.env.NODE_ENV === "production"
        ? 'Set it as a Fly.io secret: flyctl secrets set MONGODB_URI="..."'
        : "Add it to your .env.local file: MONGODB_URI=mongodb+srv://...";

    console.error("MONGODB_URI is not set in environment variables.");
    console.error(`Current NODE_ENV: ${process.env.NODE_ENV}`);
    console.error(
      `Available env vars starting with MONGO:`,
      Object.keys(process.env).filter((k) => k.startsWith("MONGO"))
    );

    throw new Error(`MONGODB_URI is not set. ${envHint}`);
  }

  if (process.env.NODE_ENV === "development") {
    // In development mode, use a global variable so that the value
    // is preserved across module reloads caused by HMR (Hot Module Replacement).
    let globalWithMongo = global as typeof globalThis & {
      _mongoClientPromise?: Promise<MongoClient>;
    };

    if (!globalWithMongo._mongoClientPromise) {
      client = new MongoClient(uri);
      globalWithMongo._mongoClientPromise = client.connect();
    }
    return globalWithMongo._mongoClientPromise;
  } else {
    // In production mode, it's best to not use a global variable.
    if (!clientPromise) {
      client = new MongoClient(uri);
      clientPromise = client.connect();
    }
    return clientPromise;
  }
}

// Lazy initialization - only create client when promise is actually used
// This prevents build-time errors when MONGODB_URI is not set
let _lazyPromise: Promise<MongoClient> | null = null;

function getMongoPromise(): Promise<MongoClient> {
  if (!_lazyPromise) {
    try {
      _lazyPromise = createMongoClient();
    } catch (error: any) {
      // If initialization fails, return a rejected promise
      _lazyPromise = Promise.reject(error);
    }
  }
  return _lazyPromise;
}

// Export a promise-like object that initializes lazily
// This works better than Proxy for Promise compatibility
const lazyMongoExport = {
  then: (onFulfilled?: any, onRejected?: any) =>
    getMongoPromise().then(onFulfilled, onRejected),
  catch: (onRejected?: any) => getMongoPromise().catch(onRejected),
  finally: (onFinally?: any) => getMongoPromise().finally(onFinally),
  [Symbol.toStringTag]: "Promise",
} as Promise<MongoClient>;

export default lazyMongoExport;
