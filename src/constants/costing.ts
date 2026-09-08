import { ENQUIRY_CURRENCIES, optionsFrom, pharmaLabel } from "@/constants/pharma";

export const COSTING_STATUSES = [
  "DRAFT",
  "IN_PROGRESS",
  "COMPLETED",
  "UNDER_REVIEW",
  "APPROVAL_PENDING",
  "APPROVED",
  "REJECTED",
  "EXPIRED",
  "CANCELLED",
] as const;
export type CostingStatus = (typeof COSTING_STATUSES)[number];

export const COSTING_APPROVAL_STATUSES = [
  "NOT_SUBMITTED",
  "UNDER_REVIEW",
  "APPROVAL_PENDING",
  "APPROVED",
  "REJECTED",
] as const;
export type CostingApprovalStatus = (typeof COSTING_APPROVAL_STATUSES)[number];

export const MATERIAL_TYPES = ["API", "EXCIPIENT", "PROCESS_MATERIAL", "OTHER"] as const;
export type MaterialType = (typeof MATERIAL_TYPES)[number];

export const PACKAGING_LEVELS = ["PRIMARY", "SECONDARY", "TERTIARY"] as const;
export type PackagingLevel = (typeof PACKAGING_LEVELS)[number];

export const UTILITY_TYPES = ["ELECTRICITY", "WATER", "STEAM", "COMPRESSED_AIR", "HVAC", "OTHER"] as const;
export type UtilityType = (typeof UTILITY_TYPES)[number];

export const QUALITY_ACTIVITIES = ["QC_TESTING", "QA_REVIEW", "SAMPLING", "STABILITY_TESTING", "DOCUMENTATION_REVIEW", "OTHER"] as const;
export type QualityActivity = (typeof QUALITY_ACTIVITIES)[number];

export const REGULATORY_ACTIVITIES = ["REGISTRATION", "DOCUMENTATION", "ARTWORK_REVIEW", "REGULATORY_REVIEW", "CUSTOMER_SPECIFIC", "OTHER"] as const;
export type RegulatoryActivity = (typeof REGULATORY_ACTIVITIES)[number];

export const DOCUMENTATION_ACTIVITIES = ["BATCH_DOCUMENTATION", "PRODUCT_DOCUMENTATION", "CUSTOMER_DOCUMENTATION", "ARTWORK_DOCUMENTATION", "OTHER"] as const;
export type DocumentationActivity = (typeof DOCUMENTATION_ACTIVITIES)[number];

export const OVERHEAD_TYPES = ["MANUFACTURING", "ADMINISTRATIVE", "QUALITY", "FACILITY", "OTHER"] as const;
export type OverheadType = (typeof OVERHEAD_TYPES)[number];

export const OVERHEAD_MODES = ["PERCENTAGE", "FIXED"] as const;
export type OverheadMode = (typeof OVERHEAD_MODES)[number];

export const MARGIN_TYPES = ["PERCENTAGE_MARGIN", "FIXED_MARGIN", "MARKUP"] as const;
export type MarginType = (typeof MARGIN_TYPES)[number];

export const ADJUSTMENT_TYPES = ["INCREASE", "DECREASE"] as const;
export type AdjustmentType = (typeof ADJUSTMENT_TYPES)[number];

export const PRICE_ADJUSTMENT_TYPES = ["DISCOUNT", "PREMIUM", "SPECIAL"] as const;
export type PriceAdjustmentType = (typeof PRICE_ADJUSTMENT_TYPES)[number];

export const LABOR_CATEGORIES = ["PRODUCTION_OPERATOR", "SUPERVISOR", "TECHNICIAN", "PACKAGING_OPERATOR", "OTHER"] as const;
export type LaborCategory = (typeof LABOR_CATEGORIES)[number];

export const COSTING_CURRENCIES = ENQUIRY_CURRENCIES;
export type CostingCurrency = (typeof COSTING_CURRENCIES)[number];

export const COSTING_DOCUMENT_TYPES = [
  "COSTING_SHEET",
  "CUSTOMER_REQUIREMENT",
  "FEASIBILITY",
  "TECHNICAL",
  "SUPPORTING",
] as const;
export type CostingDocumentType = (typeof COSTING_DOCUMENT_TYPES)[number];

/** Configurable approval levels. Thresholds are selling-price minor units; null = unlimited. */
export const COSTING_APPROVAL_LEVELS = [
  { id: "SALES_MANAGER", name: "Sales Manager", maxSellingMinor: 5_000_000_00, highDiscountOnly: false },
  { id: "COMMERCIAL", name: "Commercial Manager", maxSellingMinor: 20_000_000_00, highDiscountOnly: false },
  { id: "FINANCE", name: "Finance", maxSellingMinor: 50_000_000_00, highDiscountOnly: false },
  { id: "MANAGEMENT", name: "Management", maxSellingMinor: null as number | null, highDiscountOnly: true },
] as const;
export type CostingApprovalLevelId = (typeof COSTING_APPROVAL_LEVELS)[number]["id"];

/** Discount at or above this percent requires the Management level. */
export const HIGH_DISCOUNT_PERCENT = 15;

export const EDITABLE_COSTING_STATUSES: CostingStatus[] = ["DRAFT", "IN_PROGRESS", "COMPLETED", "REJECTED"];
export const FINAL_COSTING_STATUSES: CostingStatus[] = ["APPROVED", "CANCELLED"];

export const COSTING_STATUS_OPTIONS = optionsFrom(COSTING_STATUSES);
export const MATERIAL_TYPE_OPTIONS = optionsFrom(MATERIAL_TYPES);
export const PACKAGING_LEVEL_OPTIONS = optionsFrom(PACKAGING_LEVELS);
export const UTILITY_TYPE_OPTIONS = optionsFrom(UTILITY_TYPES);
export const QUALITY_ACTIVITY_OPTIONS = optionsFrom(QUALITY_ACTIVITIES);
export const REGULATORY_ACTIVITY_OPTIONS = optionsFrom(REGULATORY_ACTIVITIES);
export const DOCUMENTATION_ACTIVITY_OPTIONS = optionsFrom(DOCUMENTATION_ACTIVITIES);
export const OVERHEAD_TYPE_OPTIONS = optionsFrom(OVERHEAD_TYPES);
export const OVERHEAD_MODE_OPTIONS = optionsFrom(OVERHEAD_MODES);
export const MARGIN_TYPE_OPTIONS = optionsFrom(MARGIN_TYPES);
export const ADJUSTMENT_TYPE_OPTIONS = optionsFrom(ADJUSTMENT_TYPES);
export const PRICE_ADJUSTMENT_TYPE_OPTIONS = optionsFrom(PRICE_ADJUSTMENT_TYPES);
export const LABOR_CATEGORY_OPTIONS = optionsFrom(LABOR_CATEGORIES);
export const COSTING_CURRENCY_OPTIONS = COSTING_CURRENCIES.map((value) => ({ value, label: value }));
export const COSTING_DOCUMENT_TYPE_OPTIONS = optionsFrom(COSTING_DOCUMENT_TYPES);

export { pharmaLabel };
