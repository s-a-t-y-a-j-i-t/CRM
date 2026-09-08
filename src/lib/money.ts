import type { CurrencyCode, MoneyMinor } from "@/types/common";

const ZERO_DECIMAL = new Set<CurrencyCode>([]);

export function toMinorUnits(major: string | number, currency: CurrencyCode): MoneyMinor {
  const parsed = typeof major === "number" ? major : Number.parseFloat(major.replace(/,/g, ""));
  if (!Number.isFinite(parsed)) {
    throw new Error("Invalid monetary amount");
  }
  const factor = ZERO_DECIMAL.has(currency) ? 1 : 100;
  return Math.round(parsed * factor);
}

export function fromMinorUnits(minor: MoneyMinor, currency: CurrencyCode): string {
  const factor = ZERO_DECIMAL.has(currency) ? 1 : 100;
  const major = (Math.round(minor) / factor).toFixed(factor === 1 ? 0 : 2);
  return major;
}

export function addMinor(...amounts: MoneyMinor[]): MoneyMinor {
  return amounts.reduce((sum, value) => sum + Math.round(value), 0);
}

export function subtractMinor(left: MoneyMinor, right: MoneyMinor): MoneyMinor {
  return Math.round(left) - Math.round(right);
}

export function maxMinor(left: MoneyMinor, right: MoneyMinor): MoneyMinor {
  return Math.round(left) > Math.round(right) ? Math.round(left) : Math.round(right);
}

export function minMinor(left: MoneyMinor, right: MoneyMinor): MoneyMinor {
  return Math.round(left) < Math.round(right) ? Math.round(left) : Math.round(right);
}

export function applyTax(baseMinor: MoneyMinor, taxRateBps: number): {
  taxMinor: MoneyMinor;
  totalMinor: MoneyMinor;
} {
  const base = Math.round(baseMinor);
  const taxMinor = Math.round((base * taxRateBps) / 10_000);
  return { taxMinor, totalMinor: addMinor(base, taxMinor) };
}

export function formatMoney(minor: MoneyMinor, currency: CurrencyCode, locale = "en-IN"): string {
  const factor = ZERO_DECIMAL.has(currency) ? 1 : 100;
  const major = Math.round(minor) / factor;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: factor === 1 ? 0 : 2,
    maximumFractionDigits: factor === 1 ? 0 : 2,
  }).format(major);
}

export function deriveInvoiceStatus(input: {
  totalMinor: MoneyMinor;
  paidMinor: MoneyMinor;
  dueDate: string;
  disputed?: boolean;
  now?: Date;
}): "pending" | "partially_paid" | "paid" | "overdue" | "disputed" {
  if (input.disputed) {
    return "disputed";
  }
  const outstanding = subtractMinor(input.totalMinor, input.paidMinor);
  if (outstanding <= 0) {
    return "paid";
  }
  const due = new Date(`${input.dueDate}T23:59:59`);
  const now = input.now ?? new Date();
  if (due.getTime() < now.getTime()) {
    return "overdue";
  }
  if (input.paidMinor > 0) {
    return "partially_paid";
  }
  return "pending";
}

/** Quantity scale: 4 decimal places. Percentages use basis points (20% = 2000). */
export const QTY_SCALE = 10_000;
export const BPS_SCALE = 10_000;

export function toQtyScaled(qty: number): number {
  return Math.round(qty * QTY_SCALE);
}

export function percentToBps(percent: number): number {
  return Math.round(percent * 100);
}

export function applyWastageScaled(qtyScaled: number, wastagePercent: number): number {
  const bps = percentToBps(wastagePercent);
  return Math.round((qtyScaled * (BPS_SCALE + bps)) / BPS_SCALE);
}

export function qtyCostMinor(qtyScaled: number, unitCostMinor: MoneyMinor): MoneyMinor {
  return Math.round((qtyScaled * Math.round(unitCostMinor)) / QTY_SCALE);
}

export function percentOfMinor(base: MoneyMinor, percent: number): MoneyMinor {
  return Math.round((Math.round(base) * percentToBps(percent)) / BPS_SCALE);
}

export function sellingPriceFromMargin(costMinor: MoneyMinor, marginPercent: number): MoneyMinor {
  const bps = percentToBps(marginPercent);
  if (bps >= BPS_SCALE) {
    throw new Error("Margin must be less than 100%.");
  }
  const denom = BPS_SCALE - bps;
  if (denom <= 0) {
    throw new Error("Margin denominator is invalid.");
  }
  return Math.round((Math.round(costMinor) * BPS_SCALE) / denom);
}

export function sellingPriceFromMarkup(costMinor: MoneyMinor, markupPercent: number): MoneyMinor {
  const bps = percentToBps(markupPercent);
  return Math.round((Math.round(costMinor) * (BPS_SCALE + bps)) / BPS_SCALE);
}

export function formatCostingMoney(minor: MoneyMinor, currency: string, locale = "en-IN"): string {
  if (currency === "OTHER") {
    return `${fromMinorUnits(Math.round(minor), "INR")} OTHER`;
  }
  if (currency === "AED") {
    return new Intl.NumberFormat("en-AE", {
      style: "currency",
      currency: "AED",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.round(minor) / 100);
  }
  return formatMoney(Math.round(minor), currency as CurrencyCode, locale);
}

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function chunkToWords(value: number): string {
  if (value === 0) return "";
  if (value < 20) return ONES[value] ?? "";
  if (value < 100) return `${TENS[Math.floor(value / 10)]} ${ONES[value % 10]}`.trim();
  return `${ONES[Math.floor(value / 100)]} Hundred${value % 100 ? ` ${chunkToWords(value % 100)}` : ""}`.trim();
}

function indianAmountWords(rupees: number): string {
  if (rupees === 0) return "Zero";
  const crore = Math.floor(rupees / 10_000_000);
  const lakh = Math.floor((rupees % 10_000_000) / 100_000);
  const thousand = Math.floor((rupees % 100_000) / 1000);
  const rest = rupees % 1000;
  return [
    crore ? `${chunkToWords(crore)} Crore` : "",
    lakh ? `${chunkToWords(lakh)} Lakh` : "",
    thousand ? `${chunkToWords(thousand)} Thousand` : "",
    rest ? chunkToWords(rest) : "",
  ].filter(Boolean).join(" ");
}

function westernAmountWords(value: number): string {
  if (value === 0) return "Zero";
  const billion = Math.floor(value / 1_000_000_000);
  const million = Math.floor((value % 1_000_000_000) / 1_000_000);
  const thousand = Math.floor((value % 1_000_000) / 1000);
  const rest = value % 1000;
  return [
    billion ? `${chunkToWords(billion)} Billion` : "",
    million ? `${chunkToWords(million)} Million` : "",
    thousand ? `${chunkToWords(thousand)} Thousand` : "",
    rest ? chunkToWords(rest) : "",
  ].filter(Boolean).join(" ");
}

export function amountInWords(minor: MoneyMinor, currency: string): string {
  const major = Math.floor(Math.round(minor) / 100);
  const paise = Math.round(minor) % 100;
  const unit = currency === "INR" ? "Rupees" : currency === "USD" ? "Dollars" : currency === "EUR" ? "Euros" : currency === "GBP" ? "Pounds" : currency === "AED" ? "Dirhams" : "Units";
  const subunit = currency === "INR" ? "Paise" : "Cents";
  const words = currency === "INR" ? indianAmountWords(major) : westernAmountWords(major);
  const fraction = paise ? ` and ${chunkToWords(paise)} ${subunit}` : "";
  return `${words} ${unit}${fraction} Only`.replace(/\s+/g, " ").trim();
}

export function agingBucketKey(dueDate: string, now = new Date()): "0_30" | "31_60" | "61_90" | "90_plus" {
  const due = new Date(`${dueDate}T00:00:00`);
  const days = Math.floor((now.getTime() - due.getTime()) / 86_400_000);
  if (days <= 30) return "0_30";
  if (days <= 60) return "31_60";
  if (days <= 90) return "61_90";
  return "90_plus";
}
