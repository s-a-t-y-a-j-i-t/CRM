export function formatProductCode(sequence: number): string {
  return `PRD-${String(sequence).padStart(5, "0")}`;
}

export function parseProductSequence(code: string): number {
  const match = /^PRD-(\d+)$/.exec(code);
  return match ? Number(match[1]) : 0;
}

export function nextProductCode(existing: string[]): string {
  const max = existing.reduce((current, code) => Math.max(current, parseProductSequence(code)), 0);
  return formatProductCode(max + 1);
}

export function buildProductSearchIndex(input: {
  productCode?: string;
  productName?: string;
  genericName?: string;
  brandName?: string;
  dosageForm?: string;
  strength?: string;
}): string {
  return [input.productCode, input.productName, input.genericName, input.brandName, input.dosageForm, input.strength]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
