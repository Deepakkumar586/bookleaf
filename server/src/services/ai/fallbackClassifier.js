/**
 * Rule-based classifier used (a) instantly at ticket creation so a ticket is never
 * unclassified and (b) as the full fallback when the AI is down.
 */
const RULES = [
  { category: "ISBN & Metadata Issues", re: /\bisbn\b|metadata|wrong book|duplicate/i },
  { category: "Printing & Quality", re: /print|misprint|binding|blurry|quality|defect|reprint|torn|colou?r|author cop(y|ies)/i },
  { category: "Distribution & Availability", re: /unavailable|out of stock|not showing|listing|amazon|flipkart|stock sync|not available/i },
  { category: "Royalty & Payments", re: /royalt|payment|payout|paid|bank|earning|commission/i },
  { category: "Book Status & Production Updates", re: /typesett|cover design|proof|editing|production|when will|status|stuck|still in/i },
];

export function fallbackClassify({ subject, description }) {
  const text = `${subject} ${description}`;
  const category = RULES.find((r) => r.re.test(text))?.category ?? "General Inquiry";

  let priority = "Medium";
  if (/lawyer|legal action|fraud|scam|consumer court|police|never received.*(year|12 months)/i.test(text)) priority = "Critical";
  else if (category === "ISBN & Metadata Issues" || /not received|haven'?t received|still haven|months?|urgent|asap|terrible|defect/i.test(text)) priority = "High";
  else if (category === "General Inquiry" && /bio|update|change|how (do|can) i|can i/i.test(text)) priority = "Low";

  return { category, priority, reasoning: "Keyword rules (AI unavailable or pending)", source: "fallback" };
}
