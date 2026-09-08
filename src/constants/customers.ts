import {
  CONTACT_TYPES,
  CUSTOMER_CATEGORIES,
  CUSTOMER_STATUSES,
  CUSTOMER_TYPES,
  type CustomerStatus,
} from "@/types/crm";

export const CUSTOMER_TYPE_OPTIONS = CUSTOMER_TYPES.map((value) => ({
  value,
  label: value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase()),
}));

export const CUSTOMER_CATEGORY_OPTIONS = CUSTOMER_CATEGORIES.map((value) => ({
  value,
  label: value.charAt(0) + value.slice(1).toLowerCase(),
}));

export const CUSTOMER_STATUS_OPTIONS = CUSTOMER_STATUSES.map((value) => ({
  value,
  label: value.replaceAll("_", " "),
}));

export const CONTACT_TYPE_OPTIONS = CONTACT_TYPES.map((value) => ({
  value,
  label: value.charAt(0) + value.slice(1).toLowerCase(),
}));

export const PAYMENT_TERM_OPTIONS = [
  { value: "ADVANCE", label: "Advance" },
  { value: "NET_15", label: "Net 15" },
  { value: "NET_30", label: "Net 30" },
  { value: "NET_45", label: "Net 45" },
  { value: "NET_60", label: "Net 60" },
  { value: "LC", label: "Letter of credit" },
  { value: "CAD", label: "Cash against documents" },
] as const;

export const COUNTRY_OPTIONS = [
  { value: "India", label: "India" },
  { value: "UAE", label: "United Arab Emirates" },
  { value: "United Kingdom", label: "United Kingdom" },
  { value: "United States", label: "United States" },
  { value: "Singapore", label: "Singapore" },
  { value: "Other", label: "Other" },
] as const;

export const BLOCKED_ROLES = new Set(["super_admin", "admin", "management", "sales_manager"]);

export const STATUS_TRANSITIONS: Record<CustomerStatus, CustomerStatus[]> = {
  PROSPECT: ["ACTIVE", "INACTIVE", "BLOCKED"],
  ACTIVE: ["ON_HOLD", "INACTIVE", "BLOCKED"],
  ON_HOLD: ["ACTIVE", "INACTIVE", "BLOCKED"],
  INACTIVE: ["PROSPECT", "ACTIVE", "BLOCKED"],
  BLOCKED: ["ACTIVE", "INACTIVE"],
};

export function labelForType(value: string): string {
  return value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}
