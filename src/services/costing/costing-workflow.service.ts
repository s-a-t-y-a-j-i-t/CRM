import { AppError } from "@/lib/errors";
import type { CostingStatus } from "@/constants/costing";

export const COSTING_TRANSITIONS: Record<CostingStatus, CostingStatus[]> = {
  DRAFT: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "DRAFT", "CANCELLED"],
  COMPLETED: ["UNDER_REVIEW", "IN_PROGRESS", "CANCELLED"],
  UNDER_REVIEW: ["APPROVAL_PENDING", "IN_PROGRESS", "REJECTED"],
  APPROVAL_PENDING: ["APPROVED", "REJECTED"],
  APPROVED: ["EXPIRED"],
  REJECTED: ["IN_PROGRESS", "CANCELLED"],
  EXPIRED: ["CANCELLED"],
  CANCELLED: [],
};

export function canTransitionCosting(from: CostingStatus, to: CostingStatus): boolean {
  return COSTING_TRANSITIONS[from].includes(to);
}

export function validateCostingTransition(from: CostingStatus, to: CostingStatus): void {
  if (from === to) return;
  if (!canTransitionCosting(from, to)) {
    throw new AppError("VALIDATION", `Costing cannot move from ${from} to ${to}.`, 400);
  }
}
