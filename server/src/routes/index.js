import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authenticate, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import * as auth from "../controllers/authController.js";
import * as books from "../controllers/bookController.js";
import * as t from "../controllers/ticketController.js";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "RATE_LIMITED", message: "Too many login attempts. Try again later." } },
});

// Auth
router.post("/auth/login", loginLimiter, validate(auth.loginSchema), auth.login);
router.get("/auth/me", authenticate, auth.me);

// Everything below requires a valid token
router.use(authenticate);

// Books (authors: own only, admins: all)
router.get("/books", books.listBooks);
router.get("/books/:id", books.getBook);

// Tickets
router.get("/tickets", validate(t.listQuerySchema, "query"), t.listTickets);
router.post("/tickets", requireRole("author"), validate(t.createTicketSchema), t.createTicket);
router.get("/tickets/:id", t.getTicket);
router.post("/tickets/:id/messages", validate(t.messageSchema), t.addMessage);

// Admin-only ticket management
router.patch("/tickets/:id", requireRole("admin"), validate(t.updateTicketSchema), t.updateTicket);
router.post("/tickets/:id/notes", requireRole("admin"), validate(t.noteSchema), t.addNote);
router.post("/tickets/:id/draft", requireRole("admin"), t.createDraft);

export default router;
