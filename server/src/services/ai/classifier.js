import { z } from "zod";
import { CATEGORIES, PRIORITIES } from "../../config/constants.js";
import { complete } from "./aiClient.js";

const SYSTEM = `You triage support tickets for BookLeaf Publishing, a self-publishing company. Classify each ticket.

CATEGORIES (choose exactly one):
${CATEGORIES.map((c) => `- ${c}`).join("\n")}

PRIORITY RUBRIC:
- Critical: money long overdue (e.g. no royalty for 6+ months), legal/fraud/public-escalation threats, wrong ISBN already live on a sales platform, account/data access problems.
- High: ISBN errors, royalty not received or clearly wrong, defective printed copies, book unavailable on a platform.
- Medium: production delays, general delays, questions needing investigation.
- Low: informational or cosmetic requests (e.g. updating an author bio, how-to questions).

Respond with ONLY a JSON object, no prose, no markdown:
{"category":"<one category>","priority":"Critical|High|Medium|Low","reasoning":"<max 20 words>"}`;

const resultSchema = z.object({
  category: z.enum(CATEGORIES),
  priority: z.enum(PRIORITIES),
  reasoning: z.string().max(300).optional().default(""),
});

/** Small, cheap call: only subject + truncated description + book status. No KB, no history. */
export async function classifyWithAI({ subject, description, bookTitle, bookStatus }) {
  const user = [
    `Subject: ${subject}`,
    bookTitle ? `Book: ${bookTitle} (status: ${bookStatus})` : "Book: General / Account Level",
    `Description: ${description.slice(0, 1200)}`,
  ].join("\n");

  const { text } = await complete({ system: SYSTEM, user, maxTokens: 120, temperature: 0 });
  const json = text.match(/\{[\s\S]*\}/)?.[0];
  if (!json) throw new Error("Classifier returned no JSON");
  const parsed = resultSchema.parse(JSON.parse(json)); // throws on invalid enum values
  return { ...parsed, source: "ai" };
}
