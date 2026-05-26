const mongoose = require('mongoose');

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

/**
 * Reuses a cached Mongoose connection across serverless invocations.
 *
 * @returns {Promise<typeof mongoose>}
 */
async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.MONGODB_CONNECTION, {
      dbName: process.env.MONGODB_DB_NAME,
      bufferCommands: false
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    throw error;
  }

  return cached.conn;
}

module.exports = { connectDB };
