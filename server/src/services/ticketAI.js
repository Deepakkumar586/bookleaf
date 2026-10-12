import { Ticket } from "../models/Ticket.js";
import { Book } from "../models/Book.js";
import { User } from "../models/User.js";
import { classifyWithAI } from "./ai/classifier.js";
import { draftReply } from "./ai/drafter.js";

/**
 * Background enrichment: runs after the ticket is already saved and returned to the
 * author, so an AI outage can never block ticket creation.
 * An admin override always wins: we never overwrite classification.source === "admin".
 */
export async function enrichTicketWithAI(ticketId) {
  try {
    const ticket = await Ticket.findById(ticketId).populate("book");
    if (!ticket || ticket.classification.source === "admin") return;

    const result = await classifyWithAI({
      subject: ticket.subject,
      description: ticket.description,
      bookTitle: ticket.book?.title,
      bookStatus: ticket.book?.status,
    });

    const fresh = await Ticket.findById(ticketId); // re-read: admin may have overridden meanwhile
    if (fresh.classification.source === "admin") return;
    fresh.category = result.category;
    fresh.priority = result.priority;
    fresh.classification = { source: "ai", reasoning: result.reasoning, classifiedAt: new Date() };
    await fresh.save();
  } catch (err) {
    // Keep the rule-based classification already stored on the ticket.
    console.warn(`[ai] classification skipped for ${ticketId}: ${err.message}`);
  }
}

/** Generates (and caches) an AI draft reply for the admin. Throws AIUnavailableError on failure. */
export async function generateDraft(ticket) {
  const [author, allBooks, ticketBook] = await Promise.all([
    User.findById(ticket.author).lean(),
    Book.find({ owner: ticket.author }),
    ticket.book ? Book.findById(ticket.book) : null,
  ]);

  const { text, model, usage } = await draftReply({ ticket, author, ticketBook, allBooks });
  ticket.aiDraft = {
    text,
    model,
    generatedAt: new Date(),
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
  };
  await ticket.save();
  return ticket.aiDraft;
}
