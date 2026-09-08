import { AppError } from "@/lib/errors";
import type { FeasibilityStatus } from "@/constants/feasibility";

export const FEASIBILITY_TRANSITIONS: Record<FeasibilityStatus, FeasibilityStatus[]> = {
  INITIATED: ["DOCUMENT_REVIEW", "ON_HOLD", "CANCELLED"],
  DOCUMENT_REVIEW: ["TECHNICAL_REVIEW", "CLARIFICATION_REQUIRED", "ON_HOLD", "CANCELLED"],
  TECHNICAL_REVIEW: ["DEPARTMENT_REVIEW", "CLARIFICATION_REQUIRED", "ON_HOLD", "CANCELLED"],
  DEPARTMENT_REVIEW: ["UNDER_EVALUATION", "CLARIFICATION_REQUIRED", "ON_HOLD", "CANCELLED"],
  CLARIFICATION_REQUIRED: ["DOCUMENT_REVIEW", "TECHNICAL_REVIEW", "DEPARTMENT_REVIEW", "UNDER_EVALUATION", "ON_HOLD"],
  UNDER_EVALUATION: ["APPROVAL_PENDING", "CLARIFICATION_REQUIRED", "ON_HOLD"],
  APPROVAL_PENDING: ["FEASIBLE", "PARTIALLY_FEASIBLE", "NOT_FEASIBLE", "UNDER_EVALUATION", "ON_HOLD"],
  ON_HOLD: ["INITIATED", "DOCUMENT_REVIEW", "TECHNICAL_REVIEW", "DEPARTMENT_REVIEW", "UNDER_EVALUATION"],
  FEASIBLE: [],
  PARTIALLY_FEASIBLE: ["FEASIBLE", "ON_HOLD"],
  NOT_FEASIBLE: ["UNDER_EVALUATION", "ON_HOLD"],
  CANCELLED: ["INITIATED"],
};

export function canTransition(from: FeasibilityStatus, to: FeasibilityStatus): boolean {
  if (from === to) return true;
  return FEASIBILITY_TRANSITIONS[from].includes(to);
}

export function validateTransition(from: FeasibilityStatus, to: FeasibilityStatus): void {
  if (!canTransition(from, to)) {
    throw new AppError("VALIDATION", `Cannot move a feasibility from ${from} to ${to}.`, 400);
  }
}

export function transitionFeasibility(from: FeasibilityStatus, to: FeasibilityStatus): FeasibilityStatus {
  validateTransition(from, to);
  return to;
}
