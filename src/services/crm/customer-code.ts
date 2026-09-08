const PREFIX = "CUS-";

export function formatCustomerCode(sequence: number): string {
  return `${PREFIX}${String(sequence).padStart(5, "0")}`;
}

export function parseCustomerSequence(code: string): number {
  const match = /^CUS-(\d+)$/.exec(code);
  return match ? Number(match[1]) : 0;
}

export function nextCustomerCode(existing: string[]): string {
  const max = existing.reduce((current, code) => Math.max(current, parseCustomerSequence(code)), 0);
  return formatCustomerCode(max + 1);
}

export function buildCustomerSearchIndex(input: {
  customerCode?: string;
  companyName?: string;
  legalName?: string;
  shortName?: string;
  primaryEmail?: string;
  primaryPhone?: string;
  gstin?: string;
  pan?: string;
  primaryContactName?: string;
}): string {
  return [
    input.customerCode,
    input.companyName,
    input.legalName,
    input.shortName,
    input.primaryEmail,
    input.primaryPhone,
    input.gstin,
    input.pan,
    input.primaryContactName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
