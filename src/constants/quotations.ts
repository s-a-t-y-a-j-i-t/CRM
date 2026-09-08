import { ENQUIRY_CURRENCIES, optionsFrom, pharmaLabel } from "@/constants/pharma";

export const QUOTATION_STATUSES = [
  "DRAFT",
  "UNDER_REVIEW",
  "APPROVAL_PENDING",
  "APPROVED",
  "SENT",
  "VIEWED",
  "NEGOTIATION",
  "ACCEPTED",
  "REJECTED",
  "EXPIRED",
  "CANCELLED",
] as const;
export type QuotationStatus = (typeof QUOTATION_STATUSES)[number];

export const QUOTATION_APPROVAL_STATUSES = [
  "NOT_SUBMITTED",
  "UNDER_REVIEW",
  "APPROVAL_PENDING",
  "APPROVED",
  "REJECTED",
] as const;
export type QuotationApprovalStatus = (typeof QUOTATION_APPROVAL_STATUSES)[number];

export const QUOTATION_CURRENCIES = ENQUIRY_CURRENCIES;
export type QuotationCurrency = (typeof QUOTATION_CURRENCIES)[number];

export const DISCOUNT_TYPES = ["PERCENTAGE", "FIXED"] as const;
export type DiscountType = (typeof DISCOUNT_TYPES)[number];

export const TAX_TYPES = ["CGST", "SGST", "IGST", "OTHER"] as const;
export type TaxType = (typeof TAX_TYPES)[number];

export const CHARGE_TYPES = ["FREIGHT", "SHIPPING", "SPECIAL_PACKAGING", "DOCUMENTATION", "OTHER"] as const;
export type ChargeType = (typeof CHARGE_TYPES)[number];

export const PAYMENT_TERM_OPTIONS_VALUES = [
  "ADVANCE",
  "NET_15",
  "NET_30",
  "NET_45",
  "NET_60",
  "AGAINST_DELIVERY",
  "OTHER",
] as const;
export type PaymentTermCode = (typeof PAYMENT_TERM_OPTIONS_VALUES)[number];

export const DELIVERY_TERM_OPTIONS_VALUES = [
  "EX_WORKS",
  "FOB",
  "CIF",
  "DDP",
  "CUSTOMER_PICKUP",
  "OTHER",
] as const;
export type DeliveryTermCode = (typeof DELIVERY_TERM_OPTIONS_VALUES)[number];

export const LEAD_TIME_UNITS = ["DAYS", "WEEKS", "MONTHS"] as const;
export type LeadTimeUnit = (typeof LEAD_TIME_UNITS)[number];

export const QUOTATION_REJECTION_REASONS = [
  "PRICE",
  "TIMELINE",
  "TERMS",
  "COMPETITOR",
  "PRODUCT",
  "CUSTOMER_CHANGED_REQUIREMENT",
  "OTHER",
] as const;
export type QuotationRejectionReason = (typeof QUOTATION_REJECTION_REASONS)[number];

export const QUOTATION_DOCUMENT_TYPES = ["QUOTATION_PDF", "SUPPORTING", "CUSTOMER_CORRESPONDENCE"] as const;
export type QuotationDocumentType = (typeof QUOTATION_DOCUMENT_TYPES)[number];

export const QUOTATION_APPROVAL_LEVELS = [
  { id: "SALES_MANAGER", name: "Sales Manager", maxGrandMinor: 5_000_000_00, highDiscountOnly: false },
  { id: "COMMERCIAL", name: "Commercial Manager", maxGrandMinor: 20_000_000_00, highDiscountOnly: false },
  { id: "FINANCE", name: "Finance", maxGrandMinor: 50_000_000_00, highDiscountOnly: false },
  { id: "MANAGEMENT", name: "Management", maxGrandMinor: null as number | null, highDiscountOnly: true },
] as const;
export type QuotationApprovalLevelId = (typeof QUOTATION_APPROVAL_LEVELS)[number]["id"];

export const QUOTATION_HIGH_DISCOUNT_PERCENT = 15;

export const EDITABLE_QUOTATION_STATUSES: QuotationStatus[] = ["DRAFT", "UNDER_REVIEW", "REJECTED"];
export const LOCKED_QUOTATION_STATUSES: QuotationStatus[] = ["APPROVED", "SENT", "VIEWED", "NEGOTIATION", "ACCEPTED"];

export const QUOTATION_STATUS_OPTIONS = optionsFrom(QUOTATION_STATUSES);
export const DISCOUNT_TYPE_OPTIONS = optionsFrom(DISCOUNT_TYPES);
export const TAX_TYPE_OPTIONS = optionsFrom(TAX_TYPES);
export const CHARGE_TYPE_OPTIONS = optionsFrom(CHARGE_TYPES);
export const PAYMENT_TERM_OPTIONS = optionsFrom(PAYMENT_TERM_OPTIONS_VALUES);
export const DELIVERY_TERM_OPTIONS = optionsFrom(DELIVERY_TERM_OPTIONS_VALUES);
export const LEAD_TIME_UNIT_OPTIONS = optionsFrom(LEAD_TIME_UNITS);
export const REJECTION_REASON_OPTIONS = optionsFrom(QUOTATION_REJECTION_REASONS);
export const QUOTATION_CURRENCY_OPTIONS = QUOTATION_CURRENCIES.map((value) => ({ value, label: value }));

export { pharmaLabel };
