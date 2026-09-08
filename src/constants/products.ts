import { optionsFrom, pharmaLabel } from "@/constants/pharma";

export const PRODUCT_CATEGORIES = [
  "PRESCRIPTION",
  "OTC",
  "NUTRACEUTICAL",
  "HERBAL",
  "GENERIC",
  "BRANDED_GENERIC",
  "EXPORT",
  "OTHER",
] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const PRODUCT_STATUSES = ["DRAFT", "ACTIVE", "INACTIVE", "DISCONTINUED", "UNDER_REVIEW"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const PRODUCT_MARKET_TYPES = ["DOMESTIC", "EXPORT", "BOTH"] as const;
export type ProductMarketType = (typeof PRODUCT_MARKET_TYPES)[number];

export const REGULATORY_STATUSES = ["NOT_ASSESSED", "DOSSIER_PENDING", "REGISTERED", "NOT_REQUIRED"] as const;
export type RegulatoryStatus = (typeof REGULATORY_STATUSES)[number];

export const PHARMACOPOEIA_STANDARDS = ["IP", "BP", "USP", "EP", "IH", "OTHER"] as const;
export type PharmacopoeiaStandard = (typeof PHARMACOPOEIA_STANDARDS)[number];

export const MANUFACTURING_SITES = ["Taloja", "Bhiwandi", "Baddi", "Hyderabad", "Other"] as const;

export const PRODUCT_CATEGORY_OPTIONS = optionsFrom(PRODUCT_CATEGORIES);
export const PRODUCT_STATUS_OPTIONS = optionsFrom(PRODUCT_STATUSES);
export const PRODUCT_MARKET_OPTIONS = optionsFrom(PRODUCT_MARKET_TYPES);
export const REGULATORY_STATUS_OPTIONS = optionsFrom(REGULATORY_STATUSES);
export const PHARMACOPOEIA_OPTIONS = optionsFrom(PHARMACOPOEIA_STANDARDS);
export const MANUFACTURING_SITE_OPTIONS = MANUFACTURING_SITES.map((value) => ({ value, label: value }));

export { pharmaLabel };
