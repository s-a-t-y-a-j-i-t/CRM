export function formatEnquiryNumber(year: number, sequence: number): string {
  return `ENQ-${year}-${String(sequence).padStart(5, "0")}`;
}

export function parseEnquirySequence(code: string): { year: number; seq: number } {
  const match = /^ENQ-(\d{4})-(\d+)$/.exec(code);
  return match ? { year: Number(match[1]), seq: Number(match[2]) } : { year: 0, seq: 0 };
}

export function nextEnquiryNumber(existing: string[], now = new Date()): string {
  const year = now.getFullYear();
  const max = existing.reduce((current, code) => {
    const parsed = parseEnquirySequence(code);
    return parsed.year === year ? Math.max(current, parsed.seq) : current;
  }, 0);
  return formatEnquiryNumber(year, max + 1);
}

export function buildEnquirySearchIndex(input: {
  enquiryNumber?: string;
  customerName?: string;
  contactName?: string;
  productName?: string;
  genericName?: string;
  brandName?: string;
}): string {
  return [input.enquiryNumber, input.customerName, input.contactName, input.productName, input.genericName, input.brandName]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
