/**
 * BookLeaf Knowledge Base, split into sections so that each AI call only receives
 * the sections relevant to the ticket category (cost-awareness: ~300-600 tokens
 * of context per call instead of the whole KB).
 */
export const KB = {
  company: `BookLeaf Publishing is a self-publishing company in India and the US. Packages: Standard Free (no upfront cost) and Bestseller Breakthrough (premium, paid, with marketing and distribution add-ons). We handle cover design, typesetting, ISBN assignment, printing, distribution and royalty management. In-house printing facility and warehouse are in Delhi; print partners are Repro India and Epitome Books.`,

  royalty: `ROYALTY POLICY
- 80/20 split: 80% of net profit per book to the author, 20% to BookLeaf.
- Net profit = MRP minus printing cost, platform commission (Amazon/Flipkart) and shipping charges.
- Royalties are calculated quarterly and paid within 45 days of the quarter ending.
- Minimum payout threshold: Rs 1,000. Below that, royalties roll over to the next quarter.
- Payouts are bank transfers to the account linked in the author's dashboard (check bank details are linked).
- Authors can view a detailed royalty breakdown (sales per platform) in their dashboard; we can also share a line-by-line breakdown on request.`,

  isbn: `ISBN POLICY
- Every book gets a unique ISBN assigned by BookLeaf, registered under BookLeaf's publisher imprint. Authors wanting an ISBN under their own imprint must obtain it independently.
- ISBN errors (duplicate, wrong book linked, mismatch between platform and physical copy) are HIGH PRIORITY and escalated to the production team immediately.`,

  printing: `PRINTING & QUALITY
- In-house printing handles most orders; overflow/specific formats go to Repro India or Epitome Books.
- Standard print turnaround: 5-7 business days from order confirmation.
- Quality issues (misprints, binding defects, colour inconsistency): BookLeaf arranges a FREE reprint after verification. The author may need to share photos of the defective copy.`,

  distribution: `DISTRIBUTION & AVAILABILITY
- Listed on Amazon India, Flipkart, Amazon US, Amazon UK and the BookLeaf Store.
- New listings go live within 7-10 business days after publication is complete.
- "Unavailable" on a platform usually means a stock sync issue; the team can trigger a re-sync, which takes 24-48 hours.
- Metadata/description updates can be submitted through the dashboard or by emailing BookLeaf; they reflect on platforms within 3-5 business days.`,

  production: `PRODUCTION STAGES
Manuscript Received -> Editing (if opted) -> Cover Design -> Typesetting -> Proofreading -> ISBN Assignment -> Printing -> Distribution Setup -> Published & Live.
Authors get an email update at each stage. Delays usually happen at Cover Design (waiting for author approval) and Proofreading (revision rounds). Never blame the author; frame delays collaboratively.`,

  tone: `TONE GUIDELINES
- Empathetic and professional. Authors are partners, not customers to be managed.
- Acknowledge the concern BEFORE jumping to solutions.
- Be specific: use actual numbers, dates and statuses from the data provided; avoid vague reassurance.
- If it is BookLeaf's fault (delayed royalty, ISBN error), own it directly. No corporate deflection.
- If it needs escalation/investigation, give a clear timeline (e.g. "within 48 hours"), never open-ended promises.
- Always end with a clear next step for the author and/or the BookLeaf team.`,
};

/** Which KB sections each category needs (tone + company are always included). */
export const SECTIONS_BY_CATEGORY = {
  "Royalty & Payments": ["royalty"],
  "ISBN & Metadata Issues": ["isbn", "distribution"],
  "Printing & Quality": ["printing"],
  "Distribution & Availability": ["distribution"],
  "Book Status & Production Updates": ["production"],
  "General Inquiry": ["distribution", "royalty", "isbn"],
};

/** One few-shot example per category, condensed from the assignment brief. */
export const EXAMPLES = {
  "Royalty & Payments":
    "Example approach: acknowledge frustration; explain quarterly cycle + 45-day window; confirm bank details are linked; state the specific next payout date; if truly overdue, escalate with a 48-hour resolution timeline. For 'too low' royalty: explain net profit (MRP - printing - platform commission - shipping), offer a line-by-line breakdown, never be defensive.",
  "ISBN & Metadata Issues":
    "Example approach: treat as high priority; acknowledge it is a serious data issue; confirm immediate escalation to the production team; give a 48-hour resolution timeline.",
  "Printing & Quality":
    "Example approach: apologise sincerely; ask for photos of the defective copies; confirm a free reprint once verified; give a 5-7 business day reprint timeline.",
  "Distribution & Availability":
    "Example approach: explain it is typically a stock sync issue; confirm you are triggering a re-sync with the distribution team; set expectation of 24-48 hours.",
  "Book Status & Production Updates":
    "Example approach: use the actual production status from the data; if delayed, be honest about why (e.g. awaiting proof approval) without blaming the author; give a specific updated timeline.",
  "General Inquiry":
    "Example approach: answer directly and concisely from the policies above (e.g. metadata updates via dashboard or email, reflected in 3-5 business days).",
};

export function buildKnowledgeContext(category) {
  const keys = SECTIONS_BY_CATEGORY[category] || SECTIONS_BY_CATEGORY["General Inquiry"];
  return [KB.company, ...keys.map((k) => KB[k]), KB.tone, EXAMPLES[category] || ""].join("\n\n");
}
