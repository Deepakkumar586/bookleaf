import mongoose from "mongoose";
import { ROLES } from "../config/constants.js";

const userSchema = new mongoose.Schema(
  {
    authorId: { type: String, unique: true, sparse: true }, // e.g. AUTH001 (authors only)
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: "author", index: true },
    phone: String,
    city: String,
    joinedDate: Date,
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
