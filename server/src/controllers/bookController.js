import { Book } from "../models/Book.js";
import { AppError } from "../utils/AppError.js";

export async function listBooks(req, res, next) {
  try {
    // RBAC: authors are always scoped to their own books; admins may see all (optionally ?owner=).
    const filter = req.user.role === "admin" ? (req.query.owner ? { owner: req.query.owner } : {}) : { owner: req.user._id };
    const books = await Book.find(filter).sort({ bookId: 1 });
    res.json({ books });
  } catch (err) {
    next(err);
  }
}

export async function getBook(req, res, next) {
  try {
    const filter = { _id: req.params.id };
    if (req.user.role !== "admin") filter.owner = req.user._id;
    const book = await Book.findOne(filter);
    if (!book) throw new AppError(404, "Book not found", "NOT_FOUND"); // 404 (not 403) so IDs can't be probed
    res.json({ book });
  } catch (err) {
    next(err);
  }
}
