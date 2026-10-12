import mongoose from "mongoose";
import { CATEGORIES, PRIORITIES, STATUSES, ACTIVE_STATUSES, PRIORITY_RANK } from "../config/constants.js";

const { Schema } = mongoose;

const messageSchema = new Schema(
  {
    sender: { type: String, enum: ["author", "admin"], required: true },
    senderName: { type: String, required: true },
    body: { type: String, required: true, maxlength: 5000 },
    aiAssisted: { type: Boolean, default: false }, // sent from an AI draft (possibly edited)
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const noteSchema = new Schema(
  {
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    authorName: { type: String, required: true },
    body: { type: String, required: true, maxlength: 2000 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const ticketSchema = new Schema(
  {
    ticketNumber: { type: String, unique: true },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    book: { type: Schema.Types.ObjectId, ref: "Book", default: null }, // null = General / Account Level
    subject: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, required: true, maxlength: 5000 },
    attachments: [{ name: String, size: Number, _id: false }], // metadata only (upload is a bonus)

    status: { type: String, enum: STATUSES, default: "Open", index: true },
    category: { type: String, enum: CATEGORIES, default: "General Inquiry", index: true },
    priority: { type: String, enum: PRIORITIES, default: "Medium", index: true },
    priorityRank: { type: Number, default: 2 },
    isActive: { type: Boolean, default: true }, // denormalised for the "urgent + oldest" queue sort

    // How category/priority were decided: ai | fallback (rules, AI down) | admin (override)
    classification: {
      source: { type: String, enum: ["pending", "ai", "fallback", "admin"], default: "pending" },
      reasoning: String,
      classifiedAt: Date,
    },

    assignedTo: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    messages: [messageSchema],
    internalNotes: [noteSchema], // never serialised to authors

    aiDraft: {
      text: String,
      model: String,
      generatedAt: Date,
      inputTokens: Number,
      outputTokens: Number,
    },
    resolvedAt: Date,
  },
  { timestamps: true }
);

ticketSchema.index({ isActive: -1, priorityRank: -1, createdAt: 1 });

/** Keep denormalised fields in sync on every save. */
ticketSchema.pre("save", function (next) {
  this.priorityRank = PRIORITY_RANK[this.priority];
  this.isActive = ACTIVE_STATUSES.includes(this.status);
  next();
});

export const Ticket = mongoose.model("Ticket", ticketSchema);
