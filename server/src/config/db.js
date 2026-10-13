
import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectDB() {
  mongoose.set("strictQuery", true);

  try {
    await mongoose.connect(env.mongoUri, {
      serverSelectionTimeoutMS: 10000,
    });

    console.log("MongoDB connected:", mongoose.connection.readyState);
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    throw error;
  }
}
