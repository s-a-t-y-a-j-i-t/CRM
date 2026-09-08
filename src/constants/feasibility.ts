import { optionsFrom, pharmaLabel } from "@/constants/pharma";

export const FEASIBILITY_STATUSES = [
  "INITIATED",
  "DOCUMENT_REVIEW",
  "TECHNICAL_REVIEW",
  "DEPARTMENT_REVIEW",
  "CLARIFICATION_REQUIRED",
  "UNDER_EVALUATION",
  "APPROVAL_PENDING",
  "FEASIBLE",
  "PARTIALLY_FEASIBLE",
  "NOT_FEASIBLE",
  "ON_HOLD",
  "CANCELLED",
] as const;
export type FeasibilityStatus = (typeof FEASIBILITY_STATUSES)[number];

export const FINAL_FEASIBILITY_STATUSES: FeasibilityStatus[] = ["FEASIBLE", "PARTIALLY_FEASIBLE", "NOT_FEASIBLE", "CANCELLED"];

export const ACTIVE_FEASIBILITY_STATUSES: FeasibilityStatus[] = FEASIBILITY_STATUSES.filter(
  (status) => !FINAL_FEASIBILITY_STATUSES.includes(status),
);

export const FEASIBILITY_DECISIONS = ["FEASIBLE", "PARTIALLY_FEASIBLE", "NOT_FEASIBLE"] as const;
export type FeasibilityDecision = (typeof FEASIBILITY_DECISIONS)[number];

export const DEPARTMENT_REVIEW_STATUSES = [
  "PENDING",
  "IN_REVIEW",
  "CLARIFICATION_REQUIRED",
  "APPROVED",
  "CONDITIONALLY_APPROVED",
  "REJECTED",
  "NOT_APPLICABLE",
] as const;
export type DepartmentReviewStatus = (typeof DEPARTMENT_REVIEW_STATUSES)[number];

export const CLARIFICATION_STATUSES = ["OPEN", "RESPONDED", "RESOLVED", "CANCELLED"] as const;
export type ClarificationStatus = (typeof CLARIFICATION_STATUSES)[number];

export const CONDITION_STATUSES = ["OPEN", "RESOLVED", "WAIVED"] as const;
export type ConditionStatus = (typeof CONDITION_STATUSES)[number];

export const EVALUATION_FACTOR_STATUSES = ["PENDING", "ACCEPTABLE", "CONDITIONAL", "NOT_ACCEPTABLE"] as const;
export type EvaluationFactorStatus = (typeof EVALUATION_FACTOR_STATUSES)[number];

export const SUPPLY_AVAILABILITY = ["AVAILABLE", "PARTIALLY_AVAILABLE", "NOT_AVAILABLE"] as const;
export type SupplyAvailability = (typeof SUPPLY_AVAILABILITY)[number];

export const NOT_FEASIBLE_REASONS = [
  "CAPACITY",
  "EQUIPMENT",
  "RAW_MATERIAL",
  "PACKAGING",
  "QUALITY",
  "REGULATORY",
  "COMMERCIAL",
  "TIMELINE",
  "OTHER",
] as const;
export type NotFeasibleReason = (typeof NOT_FEASIBLE_REASONS)[number];

export const FEASIBILITY_DEPARTMENTS = [
  { id: "PRODUCTION", name: "Production", enabled: true },
  { id: "QA", name: "QA", enabled: true },
  { id: "QC", name: "QC", enabled: true },
  { id: "REGULATORY", name: "Regulatory", enabled: true },
  { id: "RND", name: "R&D / Technical", enabled: true },
  { id: "SUPPLY_CHAIN", name: "Supply Chain", enabled: true },
  { id: "PACKAGING", name: "Packaging", enabled: true },
] as const;
export type FeasibilityDepartmentId = (typeof FEASIBILITY_DEPARTMENTS)[number]["id"];

export const EVALUATION_FACTORS = [
  { id: "product_fit", name: "Product Fit", weight: 15 },
  { id: "manufacturing", name: "Manufacturing Capability", weight: 15 },
  { id: "equipment", name: "Equipment Capability", weight: 10 },
  { id: "capacity", name: "Capacity", weight: 15 },
  { id: "material", name: "Material Availability", weight: 10 },
  { id: "testing", name: "Testing Capability", weight: 10 },
  { id: "packaging", name: "Packaging Capability", weight: 10 },
  { id: "regulatory", name: "Regulatory Feasibility", weight: 10 },
  { id: "timeline", name: "Timeline Feasibility", weight: 5 },
] as const;

export const FEASIBILITY_STATUS_OPTIONS = optionsFrom(FEASIBILITY_STATUSES);
export const FEASIBILITY_DECISION_OPTIONS = optionsFrom(FEASIBILITY_DECISIONS);
export const DEPARTMENT_REVIEW_STATUS_OPTIONS = optionsFrom(DEPARTMENT_REVIEW_STATUSES);
export const NOT_FEASIBLE_REASON_OPTIONS = optionsFrom(NOT_FEASIBLE_REASONS);
export const SUPPLY_AVAILABILITY_OPTIONS = optionsFrom(SUPPLY_AVAILABILITY);
export const EVALUATION_FACTOR_STATUS_OPTIONS = optionsFrom(EVALUATION_FACTOR_STATUSES);
export const DEPARTMENT_OPTIONS = FEASIBILITY_DEPARTMENTS.filter((item) => item.enabled).map((item) => ({
  value: item.id,
  label: item.name,
}));

export { pharmaLabel };
