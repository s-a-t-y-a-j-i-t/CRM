import { AppError } from "@/lib/errors";
import type { EnquiryStatus } from "@/types/enquiries";

export const ENQUIRY_TRANSITIONS: Record<EnquiryStatus, EnquiryStatus[]> = {
  NEW: ["UNDER_REVIEW", "REQUIREMENT_PENDING", "ON_HOLD", "CANCELLED", "LOST"],
  UNDER_REVIEW: ["REQUIREMENT_PENDING", "TECHNICAL_REVIEW", "ON_HOLD", "LOST", "CANCELLED"],
  REQUIREMENT_PENDING: ["TECHNICAL_REVIEW", "UNDER_REVIEW", "ON_HOLD", "LOST", "CANCELLED"],
  TECHNICAL_REVIEW: ["FEASIBILITY_PENDING", "REQUIREMENT_PENDING", "ON_HOLD", "LOST", "CANCELLED"],
  FEASIBILITY_PENDING: ["FEASIBILITY_APPROVED", "TECHNICAL_REVIEW", "ON_HOLD", "LOST"],
  FEASIBILITY_APPROVED: ["QUOTATION_PENDING", "ON_HOLD", "LOST"],
  QUOTATION_PENDING: ["QUOTATION_CREATED", "NEGOTIATION", "ON_HOLD", "LOST"],
  QUOTATION_CREATED: ["NEGOTIATION", "WON", "LOST", "ON_HOLD"],
  NEGOTIATION: ["WON", "LOST", "ON_HOLD"],
  ON_HOLD: ["NEW", "UNDER_REVIEW", "REQUIREMENT_PENDING", "TECHNICAL_REVIEW", "FEASIBILITY_PENDING", "QUOTATION_PENDING", "NEGOTIATION"],
  WON: [],
  LOST: ["UNDER_REVIEW", "ON_HOLD"],
  CANCELLED: ["UNDER_REVIEW"],
};

export function canTransition(from: EnquiryStatus, to: EnquiryStatus): boolean {
  if (from === to) return true;
  return ENQUIRY_TRANSITIONS[from].includes(to);
}

export function validateTransition(from: EnquiryStatus, to: EnquiryStatus): void {
  if (!canTransition(from, to)) {
    throw new AppError("VALIDATION", `Cannot move an enquiry from ${from} to ${to}.`, 400);
  }
}

export function transitionEnquiry(from: EnquiryStatus, to: EnquiryStatus): EnquiryStatus {
  validateTransition(from, to);
  return to;
}
