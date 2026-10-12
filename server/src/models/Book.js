import mongoose from "mongoose";

const bookSchema = new mongoose.Schema(
  {
    bookId: { type: String, required: true, unique: true }, // BK001
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true },
    isbn: String,
    genre: String,
    publicationDate: { type: Date, default: null }, // null while in production
    status: { type: String, required: true },
    mrp: { type: Number, default: null },
    authorRoyaltyPerCopy: { type: Number, default: null },
    totalCopiesSold: { type: Number, default: 0 },
    totalRoyaltyEarned: { type: Number, default: 0 },
    royaltyPaid: { type: Number, default: 0 },
    royaltyPending: { type: Number, default: 0 },
    lastRoyaltyPayoutDate: { type: Date, default: null },
    printPartner: { type: String, default: null },
    availableOn: { type: [String], default: [] },
  },
  { timestamps: true }
);

bookSchema.virtual("isLive").get(function () {
  return this.status === "Published & Live";
});
bookSchema.set("toJSON", { virtuals: true });

export const Book = mongoose.model("Book", bookSchema);
