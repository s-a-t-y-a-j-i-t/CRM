export const PHARMA_DOSAGE_FORMS = [
  "TABLET",
  "CAPSULE",
  "SYRUP",
  "SUSPENSION",
  "INJECTION",
  "CREAM",
  "OINTMENT",
  "GEL",
  "DROPS",
  "POWDER",
  "SACHET",
  "DRY_SYRUP",
  "OTHER",
] as const;
export type PharmaDosageForm = (typeof PHARMA_DOSAGE_FORMS)[number];

export const QUANTITY_UNITS = [
  "NOS",
  "TABLETS",
  "CAPSULES",
  "BOTTLES",
  "BOXES",
  "CARTONS",
  "KG",
  "LITRES",
  "OTHER",
] as const;
export type QuantityUnit = (typeof QUANTITY_UNITS)[number];

export const PACKAGING_TYPES = [
  "PVC_ALU",
  "ALU_ALU",
  "BOTTLE",
  "HDPE_BOTTLE",
  "BLISTER",
  "STRIP",
  "SACHET",
  "CARTON",
  "BOX",
  "OTHER",
] as const;
export type PackagingType = (typeof PACKAGING_TYPES)[number];

export const PRICE_BASES = [
  "PER_TABLET",
  "PER_CAPSULE",
  "PER_BOTTLE",
  "PER_BOX",
  "PER_CARTON",
  "PER_KG",
  "PER_UNIT",
] as const;
export type PriceBasis = (typeof PRICE_BASES)[number];

export const ENQUIRY_CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED", "OTHER"] as const;
export type EnquiryCurrency = (typeof ENQUIRY_CURRENCIES)[number];

export const INGREDIENT_ROLES = ["API", "EXCIPIENT", "COATING", "FLAVOUR", "PRESERVATIVE", "OTHER"] as const;
export type IngredientRole = (typeof INGREDIENT_ROLES)[number];

export const STRENGTH_UNITS = ["mg", "g", "mcg", "ml", "IU", "%", "other"] as const;

export function pharmaLabel(value: string): string {
  return value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function optionsFrom(values: readonly string[]) {
  return values.map((value) => ({ value, label: pharmaLabel(value) }));
}

export const DOSAGE_FORM_OPTIONS = optionsFrom(PHARMA_DOSAGE_FORMS);
export const QUANTITY_UNIT_OPTIONS = optionsFrom(QUANTITY_UNITS);
export const PACKAGING_TYPE_OPTIONS = optionsFrom(PACKAGING_TYPES);
export const PRICE_BASIS_OPTIONS = optionsFrom(PRICE_BASES);
export const ENQUIRY_CURRENCY_OPTIONS = ENQUIRY_CURRENCIES.map((value) => ({ value, label: value }));
export const INGREDIENT_ROLE_OPTIONS = optionsFrom(INGREDIENT_ROLES);
export const STRENGTH_UNIT_OPTIONS = STRENGTH_UNITS.map((value) => ({ value, label: value }));
