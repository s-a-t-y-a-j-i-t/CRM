export function formatQuotationNumber(year: number, sequence: number): string {
  return `QUO-${year}-${String(sequence).padStart(5, "0")}`;
}

export function formatQuotationDisplay(quotationNumber: string, version: number): string {
  return `${quotationNumber}-V${version}`;
}

export function parseQuotationSequence(code: string): { year: number; seq: number } {
  const match = /^QUO-(\d{4})-(\d+)$/.exec(code);
  return match ? { year: Number(match[1]), seq: Number(match[2]) } : { year: 0, seq: 0 };
}

export function nextQuotationNumber(existing: string[], now = new Date()): string {
  const year = now.getFullYear();
  const max = existing.reduce((current, code) => {
    const parsed = parseQuotationSequence(code);
    return parsed.year === year ? Math.max(current, parsed.seq) : current;
  }, 0);
  return formatQuotationNumber(year, max + 1);
}

export function buildQuotationSearchIndex(input: {
  quotationNumber?: string;
  displayNumber?: string;
  customerName?: string;
  productName?: string;
  enquiryNumber?: string;
  costingNumber?: string;
}): string {
  return [
    input.quotationNumber,
    input.displayNumber,
    input.customerName,
    input.productName,
    input.enquiryNumber,
    input.costingNumber,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
