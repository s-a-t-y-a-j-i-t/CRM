import { AppError } from "@/lib/errors";
import type { QuotationStatus } from "@/constants/quotations";

export const QUOTATION_TRANSITIONS: Record<QuotationStatus, QuotationStatus[]> = {
  DRAFT: ["UNDER_REVIEW", "CANCELLED"],
  UNDER_REVIEW: ["APPROVAL_PENDING", "DRAFT", "CANCELLED"],
  APPROVAL_PENDING: ["APPROVED", "REJECTED"],
  APPROVED: ["SENT", "CANCELLED"],
  REJECTED: ["DRAFT", "CANCELLED"],
  SENT: ["VIEWED", "NEGOTIATION", "ACCEPTED", "REJECTED", "EXPIRED"],
  VIEWED: ["NEGOTIATION", "ACCEPTED", "REJECTED", "EXPIRED"],
  NEGOTIATION: ["ACCEPTED", "REJECTED", "EXPIRED"],
  ACCEPTED: [],
  EXPIRED: ["CANCELLED"],
  CANCELLED: [],
};

export function canTransitionQuotation(from: QuotationStatus, to: QuotationStatus): boolean {
  return QUOTATION_TRANSITIONS[from].includes(to);
}

export function validateQuotationTransition(from: QuotationStatus, to: QuotationStatus): void {
  if (from === to) return;
  if (!canTransitionQuotation(from, to)) {
    throw new AppError("VALIDATION", `Quotation cannot move from ${from} to ${to}.`, 400);
  }
}
