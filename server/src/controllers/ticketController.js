import { z } from "zod";
import { Ticket } from "../models/Ticket.js";
import { Book } from "../models/Book.js";
import { User } from "../models/User.js";
import { nextSequence } from "../models/Counter.js";
import { AppError } from "../utils/AppError.js";
import { CATEGORIES, PRIORITIES, STATUSES, ACTIVE_STATUSES } from "../config/constants.js";
import { fallbackClassify } from "../services/ai/fallbackClassifier.js";
import { AIUnavailableError } from "../services/ai/aiClient.js";
import { enrichTicketWithAI, generateDraft } from "../services/ticketAI.js";

/* ---------------- validation schemas ---------------- */
export const createTicketSchema = z.object({
  bookId: z.string().length(24, "Invalid book id").nullable().optional(),
  subject: z.string().trim().min(5, "Subject must be at least 5 characters").max(150),
  description: z.string().trim().min(15, "Please describe the issue in at least 15 characters").max(5000),
  attachments: z.array(z.object({ name: z.string().max(200), size: z.number().int().nonnegative() })).max(5).optional().default([]),
});

export const messageSchema = z.object({
  body: z.string().trim().min(1, "Message cannot be empty").max(5000),
  fromDraft: z.boolean().optional().default(false),
  status: z.enum(STATUSES).optional(), // admin may set status while replying
});

export const updateTicketSchema = z
  .object({
    status: z.enum(STATUSES),
    category: z.enum(CATEGORIES),
    priority: z.enum(PRIORITIES),
    assignedTo: z.enum(["me"]).nullable(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, "Provide at least one field to update");

export const noteSchema = z.object({ body: z.string().trim().min(1).max(2000) });

export const listQuerySchema = z.object({
  status: z.enum(STATUSES).optional(),
  category: z.enum(CATEGORIES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  assigned: z.enum(["me", "unassigned"]).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  q: z.string().max(100).optional(),
  sort: z.enum(["urgency", "newest", "oldest"]).optional().default("urgency"),
});

/* ---------------- serialisers ---------------- */
/** Authors never see internal notes, AI draft, or classification metadata. */
const authorView = (t) => ({
  id: t._id,
  ticketNumber: t.ticketNumber,
  book: t.book ? { id: t.book._id, title: t.book.title } : null,
  subject: t.subject,
  description: t.description,
  attachments: t.attachments,
  status: t.status,
  category: t.category,
  messages: t.messages.map((m) => ({ id: m._id, sender: m.sender, senderName: m.senderName, body: m.body, createdAt: m.createdAt })),
  createdAt: t.createdAt,
  updatedAt: t.updatedAt,
});

const adminView = (t) => ({
  ...authorView(t),
  author: t.author?._id ? { id: t.author._id, name: t.author.name, email: t.author.email, authorId: t.author.authorId } : t.author,
  priority: t.priority,
  classification: t.classification,
  assignedTo: t.assignedTo ? { id: t.assignedTo._id, name: t.assignedTo.name } : null,
  internalNotes: t.internalNotes,
  aiDraft: t.aiDraft?.text ? { text: t.aiDraft.text, generatedAt: t.aiDraft.generatedAt, model: t.aiDraft.model } : null,
  messages: t.messages.map((m) => ({ id: m._id, sender: m.sender, senderName: m.senderName, body: m.body, createdAt: m.createdAt, aiAssisted: m.aiAssisted })),
});

const adminSummary = (t) => ({
  id: t._id,
  ticketNumber: t.ticketNumber,
  subject: t.subject,
  author: t.author ? { id: t.author._id, name: t.author.name } : null,
  book: t.book ? { id: t.book._id, title: t.book.title } : null,
  status: t.status,
  category: t.category,
  priority: t.priority,
  classificationSource: t.classification?.source,
  assignedTo: t.assignedTo ? { id: t.assignedTo._id, name: t.assignedTo.name } : null,
  messageCount: t.messages.length,
  createdAt: t.createdAt,
  updatedAt: t.updatedAt,
});

const POPULATE = [
  { path: "book", select: "title status" },
  { path: "author", select: "name email authorId" },
  { path: "assignedTo", select: "name" },
];

/** Loads a ticket the current user may access, else 404. */
async function loadTicket(req) {
  const filter = { _id: req.params.id };
  if (req.user.role !== "admin") filter.author = req.user._id;
  const ticket = await Ticket.findOne(filter).populate(POPULATE);
  if (!ticket) throw new AppError(404, "Ticket not found", "NOT_FOUND");
  return ticket;
}

const view = (req, t) => (req.user.role === "admin" ? adminView(t) : authorView(t));

/* ---------------- handlers ---------------- */
export async function createTicket(req, res, next) {
  try {
    const { bookId, subject, description, attachments } = req.body;

    let book = null;
    if (bookId) {
      book = await Book.findOne({ _id: bookId, owner: req.user._id }); // ownership enforced
      if (!book) throw new AppError(400, "Selected book does not belong to your account", "INVALID_BOOK");
    }

    // Instant rule-based classification so the ticket is never unclassified; AI refines it async.
    const guess = fallbackClassify({ subject, description });
    const ticket = await Ticket.create({
      ticketNumber: `BL-${await nextSequence("ticket")}`,
      author: req.user._id,
      book: book?._id ?? null,
      subject,
      description,
      attachments,
      category: guess.category,
      priority: guess.priority,
      classification: { source: "fallback", reasoning: guess.reasoning, classifiedAt: new Date() },
    });

    res.status(201).json({ ticket: authorView(await ticket.populate(POPULATE)) });
    enrichTicketWithAI(ticket._id); // fire-and-forget; errors are handled inside
  } catch (err) {
    next(err);
  }
}

export async function listTickets(req, res, next) {
  try {
    const isAdmin = req.user.role === "admin";
    const { status, category, priority, assigned, from, to, q, sort } = req.query;

    const filter = isAdmin ? {} : { author: req.user._id };
    if (status) filter.status = status;
    if (isAdmin) {
      if (category) filter.category = category;
      if (priority) filter.priority = priority;
      if (assigned === "me") filter.assignedTo = req.user._id;
      if (assigned === "unassigned") filter.assignedTo = null;
      if (q) {
        const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
        filter.$or = [{ subject: rx }, { ticketNumber: rx }];
      }
    }
    if (from || to) filter.createdAt = { ...(from && { $gte: from }), ...(to && { $lte: to }) };

    // "urgency": active tickets first, then highest priority, then oldest first.
    const sortSpec = { urgency: { isActive: -1, priorityRank: -1, createdAt: 1 }, newest: { createdAt: -1 }, oldest: { createdAt: 1 } }[sort];
    const tickets = await Ticket.find(filter).sort(isAdmin ? sortSpec : { updatedAt: -1 }).populate(POPULATE).limit(200);

    res.json({ tickets: tickets.map((t) => (isAdmin ? adminSummary(t) : authorView(t))) });
  } catch (err) {
    next(err);
  }
}

export async function getTicket(req, res, next) {
  try {
    const ticket = await loadTicket(req);
    // Cheap polling: client passes ?since=<updatedAt>; reply is tiny when nothing changed.
    const since = req.query.since ? new Date(req.query.since) : null;
    if (since && ticket.updatedAt <= since) return res.json({ changed: false });
    res.json({ changed: true, ticket: view(req, ticket) });
  } catch (err) {
    next(err);
  }
}

export async function addMessage(req, res, next) {
  try {
    const ticket = await loadTicket(req);
    const isAdmin = req.user.role === "admin";
    const { body, fromDraft, status } = req.body;

    if (!isAdmin && ticket.status === "Closed") {
      throw new AppError(409, "This ticket is closed. Please open a new ticket.", "TICKET_CLOSED");
    }

    ticket.messages.push({
      sender: isAdmin ? "admin" : "author",
      senderName: isAdmin ? "BookLeaf Support" : req.user.name,
      body,
      aiAssisted: isAdmin && fromDraft,
    });

    if (isAdmin) {
      ticket.status = status || (ticket.status === "Open" ? "In Progress" : ticket.status);
      if (!ticket.assignedTo) ticket.assignedTo = req.user._id; // replying implies ownership
    } else if (ticket.status === "Resolved") {
      ticket.status = "Open"; // author replied after resolution -> reopen
    }
    if (ticket.status === "Resolved") ticket.resolvedAt = new Date();

    await ticket.save();
    res.status(201).json({ ticket: view(req, await ticket.populate(POPULATE)) });
  } catch (err) {
    next(err);
  }
}

export async function updateTicket(req, res, next) {
  try {
    const ticket = await loadTicket(req);
    const { status, category, priority, assignedTo } = req.body;

    if (status) {
      ticket.status = status;
      ticket.resolvedAt = status === "Resolved" ? new Date() : ticket.resolvedAt;
    }
    if (category || priority) {
      if (category) ticket.category = category;
      if (priority) ticket.priority = priority;
      // Mark as human-decided so late-arriving AI results never overwrite it.
      ticket.classification = { source: "admin", reasoning: "Manually overridden by admin", classifiedAt: new Date() };
    }
    if (assignedTo !== undefined) ticket.assignedTo = assignedTo === "me" ? req.user._id : null;

    await ticket.save();
    res.json({ ticket: adminView(await ticket.populate(POPULATE)) });
  } catch (err) {
    next(err);
  }
}

export async function addNote(req, res, next) {
  try {
    const ticket = await loadTicket(req);
    ticket.internalNotes.push({ author: req.user._id, authorName: req.user.name, body: req.body.body });
    await ticket.save();
    res.status(201).json({ ticket: adminView(await ticket.populate(POPULATE)) });
  } catch (err) {
    next(err);
  }
}

/** POST /tickets/:id/draft[?refresh=true] - returns cached draft unless refresh requested. */
export async function createDraft(req, res, next) {
  try {
    const ticket = await loadTicket(req);
    if (ticket.aiDraft?.text && req.query.refresh !== "true") {
      return res.json({ draft: { text: ticket.aiDraft.text, generatedAt: ticket.aiDraft.generatedAt }, cached: true });
    }
    try {
      const draft = await generateDraft(ticket);
      res.json({ draft: { text: draft.text, generatedAt: draft.generatedAt }, cached: false });
    } catch (err) {
      if (err instanceof AIUnavailableError) {
        // Graceful degradation: 503 with a clear code; the UI lets the admin write manually.
        return next(new AppError(503, "AI drafting is unavailable right now. You can write the response manually.", "AI_UNAVAILABLE", { reason: err.reason }));
      }
      throw err;
    }
  } catch (err) {
    next(err);
  }
}
