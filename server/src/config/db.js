
import mongoose from "mongoose";
import { env } from "./env.js";

let connectionPromise;

export async function connectDB() {
  mongoose.set("strictQuery", true);

  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (mongoose.connection.readyState !== 2) connectionPromise = undefined;

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(env.mongoUri, {
      serverSelectionTimeoutMS: 10000,
    }).then((connection) => {
      console.log("MongoDB connected:", connection.connection.readyState);
      return connection.connection;
    }).catch((error) => {
      connectionPromise = undefined;
      console.error("MongoDB connection failed:", error.message);
      throw error;
    });
  }

  return connectionPromise;
}

export async function pingDB() {
  await connectDB();
  const database = mongoose.connection.db;
  if (!database) throw new Error("MongoDB connection has no active database handle");

  try {
    await database.admin().ping();
  } catch (error) {
    console.error("MongoDB health check failed:", error.message);
    throw error;
  }
}
