/**
 * Seeds MongoDB from bookleaf_sample_data.json (10 authors, 18 books) and creates admin users.
 * Run: npm run seed   (WARNING: wipes users, books and tickets)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import { Book } from "../models/Book.js";
import { Ticket } from "../models/Ticket.js";

const AUTHOR_PASSWORD = "Author@123";
const ADMIN_PASSWORD = "Admin@123";
const ADMINS = [
  { name: "Saloni Mourya", email: "admin@bookleaf.com" },
  { name: "Ops Team", email: "ops@bookleaf.com" },
];

const dataFile = path.join(path.dirname(fileURLToPath(import.meta.url)), "bookleaf_sample_data.json");
const { authors } = JSON.parse(fs.readFileSync(dataFile, "utf8"));
const toDate = (v) => (v ? new Date(v) : null);

await mongoose.connect(env.mongoUri);
await Promise.all([User.deleteMany({}), Book.deleteMany({}), Ticket.deleteMany({})]);

const authorHash = await bcrypt.hash(AUTHOR_PASSWORD, 10);
const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

await User.insertMany(ADMINS.map((a) => ({ ...a, role: "admin", passwordHash: adminHash })));

let bookCount = 0;
for (const a of authors) {
  const user = await User.create({
    authorId: a.author_id, name: a.name, email: a.email, phone: a.phone, city: a.city,
    joinedDate: toDate(a.joined_date), role: "author", passwordHash: authorHash,
  });
  await Book.insertMany(
    a.books.map((b) => ({
      bookId: b.book_id, owner: user._id, title: b.title, isbn: b.isbn, genre: b.genre,
      publicationDate: toDate(b.publication_date), status: b.status, mrp: b.mrp,
      authorRoyaltyPerCopy: b.author_royalty_per_copy, totalCopiesSold: b.total_copies_sold,
      totalRoyaltyEarned: b.total_royalty_earned, royaltyPaid: b.royalty_paid,
      royaltyPending: b.royalty_pending, lastRoyaltyPayoutDate: toDate(b.last_royalty_payout_date),
      printPartner: b.print_partner, availableOn: b.available_on,
    }))
  );
  bookCount += a.books.length;
}

console.log(`Seeded ${authors.length} authors, ${bookCount} books, ${ADMINS.length} admins.`);
console.log(`Author login: <author email> / ${AUTHOR_PASSWORD}   (e.g. priya.sharma@email.com)`);
console.log(`Admin login:  admin@bookleaf.com / ${ADMIN_PASSWORD}`);
await mongoose.disconnect();
