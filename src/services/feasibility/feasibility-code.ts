export function formatFeasibilityNumber(year: number, sequence: number): string {
  return `FEAS-${year}-${String(sequence).padStart(5, "0")}`;
}

export function parseFeasibilitySequence(code: string): { year: number; seq: number } {
  const match = /^FEAS-(\d{4})-(\d+)$/.exec(code);
  return match ? { year: Number(match[1]), seq: Number(match[2]) } : { year: 0, seq: 0 };
}

export function nextFeasibilityNumber(existing: string[], now = new Date()): string {
  const year = now.getFullYear();
  const max = existing.reduce((current, code) => {
    const parsed = parseFeasibilitySequence(code);
    return parsed.year === year ? Math.max(current, parsed.seq) : current;
  }, 0);
  return formatFeasibilityNumber(year, max + 1);
}

export function buildFeasibilitySearchIndex(input: {
  feasibilityNumber?: string;
  enquiryNumber?: string;
  customerName?: string;
  productName?: string;
  genericName?: string;
}): string {
  return [input.feasibilityNumber, input.enquiryNumber, input.customerName, input.productName, input.genericName]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
