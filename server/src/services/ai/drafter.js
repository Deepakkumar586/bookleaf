import { complete } from "./aiClient.js";
import { buildKnowledgeContext } from "./knowledgeBase.js";
import { royaltyCycle } from "../../utils/payout.js";

const inr = (n) => (n == null ? "n/a" : `Rs ${n.toLocaleString("en-IN")}`);
const day = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "n/a");

function describeBook(b) {
  if (!b.isLive) {
    return `- "${b.title}" (${b.bookId}): status "${b.status}" - not yet published; no sales or royalties yet. Publication date and MRP not set.`;
  }
  return `- "${b.title}" (${b.bookId}, ISBN ${b.isbn}): ${b.status}; published ${day(b.publicationDate)}; MRP ${inr(b.mrp)}; royalty/copy ${inr(b.authorRoyaltyPerCopy)}; copies sold ${b.totalCopiesSold}; royalty earned ${inr(b.totalRoyaltyEarned)}, paid ${inr(b.royaltyPaid)}, pending ${inr(b.royaltyPending)}; last payout ${day(b.lastRoyaltyPayoutDate)}; print partner ${b.printPartner}; available on ${b.availableOn.join(", ")}.`;
}

/**
 * Builds the per-ticket data context. Only the referenced book gets full detail;
 * for account-level or royalty tickets we add a compact one-line-per-book summary.
 */
function buildAuthorContext({ author, ticketBook, allBooks, category }) {
  const lines = [`Author: ${author.name} (joined ${day(author.joinedDate)})`];
  if (ticketBook) {
    lines.push("Book this ticket is about:", describeBook(ticketBook));
  } else {
    lines.push("Ticket is General / Account Level (no specific book selected).");
  }
  if (!ticketBook || category === "Royalty & Payments") {
    const others = allBooks.filter((b) => !ticketBook || b._id.toString() !== ticketBook._id.toString());
    if (others.length) lines.push("Author's other books:", ...others.map(describeBook));
    const live = allBooks.filter((b) => b.isLive);
    const pending = live.reduce((s, b) => s + b.royaltyPending, 0);
    lines.push(`Account totals: ${live.length} live book(s), total pending royalty ${inr(pending)}${pending > 0 && pending < 1000 ? " (below Rs 1,000 payout threshold - rolls over)" : ""}.`);
  }
  return lines.join("\n");
}

const SYSTEM_RULES = `You are a senior author-support representative at BookLeaf Publishing, drafting a reply to an author for a human admin to review and send.

Hard rules:
- Use ONLY the knowledge base and author data provided. Never invent policies, dates, amounts, or platform facts. If the data needed is missing, say the team will verify and give a timeline.
- Quote real numbers and statuses from the author data (copies sold, pending royalty, status, dates).
- Follow the tone guidelines exactly: acknowledge first, own BookLeaf's mistakes, give a concrete timeline, end with a clear next step.
- If the book is still in production, there are no royalties yet - explain the current stage instead of royalty details.
- Plain text only. No markdown, no bullet-heavy formatting, no subject line, no placeholders like [Name].
- 100-180 words. Start with "Hi <first name>,". Sign off with "Warm regards,\nBookLeaf Author Support Team".`;

export async function draftReply({ ticket, author, ticketBook, allBooks }) {
  const system = `${SYSTEM_RULES}\n\n--- BOOKLEAF KNOWLEDGE BASE ---\n${buildKnowledgeContext(ticket.category)}`;

  const cycle = royaltyCycle();
  // Only the last 4 messages, each truncated: enough context without paying for the full thread.
  const history = ticket.messages
    .slice(-4)
    .map((m) => `${m.sender === "author" ? "Author" : "BookLeaf"}: ${m.body.slice(0, 600)}`)
    .join("\n");

  const user = [
    `Today: ${new Date().toISOString().slice(0, 10)}`,
    `Royalty cycle: last quarter ended ${cycle.lastQuarterEnd} (payout due by ${cycle.lastQuarterPayoutDueBy}); next quarter ends ${cycle.nextQuarterEnd} (payout due by ${cycle.nextQuarterPayoutDueBy}).`,
    "",
    "AUTHOR DATA:",
    buildAuthorContext({ author, ticketBook, allBooks, category: ticket.category }),
    "",
    `TICKET (category: ${ticket.category}, priority: ${ticket.priority})`,
    `Subject: ${ticket.subject}`,
    `Description: ${ticket.description.slice(0, 2000)}`,
    history ? `\nRecent conversation:\n${history}` : "",
    "\nWrite the reply now.",
  ].join("\n");

  return complete({ system, user, maxTokens: 450, temperature: 0.4 });
}
