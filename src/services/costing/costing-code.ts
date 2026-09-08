export function formatCostingNumber(year: number, sequence: number): string {
  return `COST-${year}-${String(sequence).padStart(5, "0")}`;
}

export function formatCostingDisplay(costingNumber: string, version: number): string {
  return `${costingNumber}-V${version}`;
}

export function parseCostingSequence(code: string): { year: number; seq: number } {
  const match = /^COST-(\d{4})-(\d+)$/.exec(code);
  return match ? { year: Number(match[1]), seq: Number(match[2]) } : { year: 0, seq: 0 };
}

export function nextCostingNumber(existing: string[], now = new Date()): string {
  const year = now.getFullYear();
  const max = existing.reduce((current, code) => {
    const parsed = parseCostingSequence(code);
    return parsed.year === year ? Math.max(current, parsed.seq) : current;
  }, 0);
  return formatCostingNumber(year, max + 1);
}

export function buildCostingSearchIndex(input: {
  costingNumber?: string;
  displayNumber?: string;
  customerName?: string;
  productName?: string;
  enquiryNumber?: string;
  feasibilityNumber?: string;
}): string {
  return [
    input.costingNumber,
    input.displayNumber,
    input.customerName,
    input.productName,
    input.enquiryNumber,
    input.feasibilityNumber,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
