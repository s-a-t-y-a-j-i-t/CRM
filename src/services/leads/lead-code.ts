const PREFIX = "LEAD-";

export function formatLeadCode(sequence: number): string {
  return `${PREFIX}${String(sequence).padStart(5, "0")}`;
}

export function parseLeadSequence(code: string): number {
  const match = /^LEAD-(\d+)$/.exec(code);
  return match ? Number(match[1]) : 0;
}

export function nextLeadCode(existing: string[]): string {
  const max = existing.reduce((current, code) => Math.max(current, parseLeadSequence(code)), 0);
  return formatLeadCode(max + 1);
}

export function buildLeadSearchIndex(input: {
  leadCode?: string;
  companyName?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  productInterest?: string;
}): string {
  return [input.leadCode, input.companyName, input.contactName, input.email, input.phone, input.productInterest]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function scoreLead(input: {
  priority: string;
  expectedBusinessValueMinor: number;
  customerId?: string;
  nextFollowUpDate?: string;
  requiredQuantity?: number;
}): number {
  let score = 20;
  if (input.priority === "URGENT") score += 25;
  if (input.priority === "HIGH") score += 18;
  if (input.priority === "MEDIUM") score += 10;
  if (input.expectedBusinessValueMinor >= 10_000_000_00) score += 20;
  else if (input.expectedBusinessValueMinor >= 2_000_000_00) score += 12;
  else if (input.expectedBusinessValueMinor > 0) score += 6;
  if (input.customerId) score += 12;
  if (input.nextFollowUpDate) score += 6;
  if ((input.requiredQuantity ?? 0) >= 1_000_000) score += 8;
  return Math.min(100, score);
}
