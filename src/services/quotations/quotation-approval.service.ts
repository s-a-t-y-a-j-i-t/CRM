import { authorizeClient } from "@/lib/auth/authorize-client";
import { assertCan } from "@/lib/rbac/can";
import { AppError } from "@/lib/errors";
import { useQuotationStore } from "@/stores/quotation-store";
import { getQuotationById } from "@/services/quotations/quotation.service";
import { notifyQuotationEvent } from "@/services/quotations/quotation-notify";
import { QUOTATION_APPROVAL_LEVELS, QUOTATION_HIGH_DISCOUNT_PERCENT } from "@/constants/quotations";
import type { QuotationApprovalValues } from "@/schemas/quotations";
import type { AuthenticatedUser } from "@/types/rbac";
import type { CrmQuotation, QuotationApprovalRecord } from "@/types/quotations";

function approvalFallback() {
  const level = QUOTATION_APPROVAL_LEVELS.find((item) => item.id === "MANAGEMENT");
  if (!level) throw new AppError("VALIDATION", "Approval levels are not configured.", 500);
  return level;
}

export function requiredQuotationApprovalLevel(quotation: CrmQuotation) {
  const discountPercent = quotation.totals.subtotalMinor > 0
    ? (quotation.totals.discountAmountMinor / quotation.totals.subtotalMinor) * 100
    : 0;
  if (discountPercent >= QUOTATION_HIGH_DISCOUNT_PERCENT) return approvalFallback();
  return QUOTATION_APPROVAL_LEVELS.find((level) => level.maxGrandMinor == null || quotation.totals.grandTotalMinor <= level.maxGrandMinor)
    ?? approvalFallback();
}

export function getQuotationApprovalHistory(quotationId: string): QuotationApprovalRecord[] {
  return useQuotationStore.getState().approvals.filter((item) => item.quotationId === quotationId);
}

export async function submitQuotationForApproval(quotationId: string, actor: AuthenticatedUser): Promise<CrmQuotation> {
  assertCan(actor, "quotations.submit");
  await authorizeClient("quotations.submit");
  const current = getQuotationById(quotationId, actor);
  if (current.status !== "DRAFT" && current.status !== "UNDER_REVIEW") {
    throw new AppError("VALIDATION", "Complete the quotation draft before submitting for approval.", 400);
  }
  if (current.status === "DRAFT") {
    useQuotationStore.getState().changeStatus(quotationId, "UNDER_REVIEW", actor);
  }
  const submitted = useQuotationStore.getState().changeStatus(quotationId, "APPROVAL_PENDING", actor);
  useQuotationStore.getState().updateQuotation(quotationId, { approvalStatus: "APPROVAL_PENDING" }, actor);
  const level = requiredQuotationApprovalLevel(submitted);
  useQuotationStore.getState().addApproval({
    quotationId,
    levelId: level.id,
    levelName: level.name,
    decision: "SUBMITTED",
    remarks: `Required level: ${level.name}`,
    actorId: actor.uid,
    actorName: actor.displayName,
    actorRole: String(actor.role),
  });
  await notifyQuotationEvent({
    kind: "quotation_approval_requested",
    title: "Quotation approval requested",
    body: `${submitted.displayNumber} requires ${level.name} review.`,
    href: `/crm/quotations/${quotationId}/approval`,
    recipientId: submitted.salesOwner,
    quotationId,
    actor,
  });
  return useQuotationStore.getState().getQuotation(quotationId) ?? submitted;
}

export async function approveQuotation(quotationId: string, values: QuotationApprovalValues, actor: AuthenticatedUser): Promise<CrmQuotation> {
  assertCan(actor, "quotations.approve");
  await authorizeClient("quotations.approve");
  const current = getQuotationById(quotationId, actor);
  if (current.status !== "APPROVAL_PENDING" && current.status !== "UNDER_REVIEW") {
    throw new AppError("VALIDATION", "This quotation is not waiting for approval.", 400);
  }
  const level = requiredQuotationApprovalLevel(current);
  useQuotationStore.getState().addApproval({
    quotationId,
    levelId: level.id,
    levelName: level.name,
    decision: "APPROVED",
    remarks: values.remarks,
    actorId: actor.uid,
    actorName: actor.displayName,
    actorRole: String(actor.role),
  });
  useQuotationStore.getState().changeStatus(quotationId, "APPROVED", actor);
  const next = useQuotationStore.getState().updateQuotation(quotationId, {
    approvalStatus: "APPROVED",
    approvedBy: actor.uid,
    approvedByName: actor.displayName,
    approvedAt: new Date().toISOString(),
  }, actor);
  await notifyQuotationEvent({
    kind: "quotation_approved",
    title: "Quotation approved",
    body: `${next.displayNumber} can be sent to the customer.`,
    href: `/crm/quotations/${quotationId}`,
    recipientId: next.salesOwner,
    quotationId,
    actor,
  });
  return next;
}

export async function rejectQuotation(quotationId: string, values: QuotationApprovalValues, actor: AuthenticatedUser): Promise<CrmQuotation> {
  assertCan(actor, "quotations.reject");
  await authorizeClient("quotations.reject");
  if (!values.reason?.trim()) {
    throw new AppError("VALIDATION", "A rejection reason is required.", 400);
  }
  const current = getQuotationById(quotationId, actor);
  const level = requiredQuotationApprovalLevel(current);
  useQuotationStore.getState().addApproval({
    quotationId,
    levelId: level.id,
    levelName: level.name,
    decision: "REJECTED",
    remarks: values.reason,
    actorId: actor.uid,
    actorName: actor.displayName,
    actorRole: String(actor.role),
  });
  useQuotationStore.getState().changeStatus(quotationId, "REJECTED", actor);
  const next = useQuotationStore.getState().updateQuotation(quotationId, { approvalStatus: "REJECTED" }, actor);
  await notifyQuotationEvent({
    kind: "quotation_rejected",
    title: "Quotation rejected",
    body: `${next.displayNumber} · ${values.reason}`,
    href: `/crm/quotations/${quotationId}`,
    recipientId: next.salesOwner,
    quotationId,
    actor,
  });
  return next;
}
