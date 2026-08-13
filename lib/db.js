import mongoose from 'mongoose';

const cached =
  globalThis._mongoose ?? (globalThis._mongoose = { conn: null, promise: null });

// readyState: 0 disconnected, 1 connected, 2 connecting, 3 disconnecting
const CONNECTED = 1;
const DISCONNECTED = 0;

// serverSelectionTimeoutMS does not cover the SRV lookup an mongodb+srv:// URI
// starts with, and a failing DNS resolver can retry for well over a minute.
const CONNECT_TIMEOUT_MS = 15_000;

function withTimeout(promise) {
  let timer;
  const limit = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const error = new Error(
        'The database did not answer within 15 seconds. Check that you are online and that Atlas allows this network.',
      );
      error.name = 'MongoNetworkTimeoutError';
      reject(error);
    }, CONNECT_TIMEOUT_MS);
  });

  return Promise.race([promise, limit]).finally(() => clearTimeout(timer));
}

export async function db() {
  if (cached.conn && mongoose.connection.readyState === CONNECTED) return cached.conn;

  // A dropped connection leaves a resolved promise behind. Throw it away so the
  // next request dials again instead of handing back a dead handle.
  if (mongoose.connection.readyState === DISCONNECTED) {
    cached.conn = null;
    cached.promise = null;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      'MONGODB_URI is not set. Copy .env.example to .env.local and add your Atlas connection string, including the /hub_ledger database name.',
    );
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(uri, {
      bufferCommands: false,
      maxPoolSize: 10,
      // Fail in ten seconds rather than hanging for thirty when the network drops.
      serverSelectionTimeoutMS: 10_000,
    });
  }

  try {
    cached.conn = await withTimeout(cached.promise);
  } catch (err) {
    cached.promise = null;
    cached.conn = null;
    throw err;
  }

  return cached.conn;
}

export default db;
