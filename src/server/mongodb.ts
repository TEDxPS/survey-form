import mongoose from "mongoose";

declare global {
  var mongoose: any; // Ideally stricter type { conn: any, promise: any }
}

const MONGODB_URI = process.env.MONGO_URI;

if (!global.mongoose) {
  global.mongoose = { conn: null, promise: null };
}

let cached = global.mongoose;

async function dbConnect(uri?: string) {
  const connectionString = uri || MONGODB_URI;

  if (!connectionString) {
    throw new Error(
      "Please define the MONGODB_URI environment variable inside .env or pass it to dbConnect()"
    );
  }

  if (cached.conn) {
    return cached.conn;
  }
  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };
    cached.promise = mongoose.connect(connectionString, opts).then((mongoose) => {
      console.log("Database connected");
      return mongoose;
    });
  }
  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default dbConnect;
