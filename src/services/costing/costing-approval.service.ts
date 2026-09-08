import { authorizeClient } from "@/lib/auth/authorize-client";
import { assertCan } from "@/lib/rbac/can";
import { AppError } from "@/lib/errors";
import { useCostingStore } from "@/stores/costing-store";
import { getCostingById, markEnquiryReadyForQuotation } from "@/services/costing/costing.service";
import { notifyCostingEvent } from "@/services/costing/costing-notify";
import { COSTING_APPROVAL_LEVELS, HIGH_DISCOUNT_PERCENT } from "@/constants/costing";
import type { CostingApprovalValues } from "@/schemas/costing";
import type { AuthenticatedUser } from "@/types/rbac";
import type { CostingApprovalRecord, CostSheet } from "@/types/costing";

function approvalFallback() {
  const level = COSTING_APPROVAL_LEVELS.find((item) => item.id === "MANAGEMENT");
  if (!level) {
    throw new AppError("VALIDATION", "Approval levels are not configured.", 500);
  }
  return level;
}

export function requiredApprovalLevel(costing: CostSheet) {
  const discountPercent = costing.totals.sellingPriceMinor > 0
    ? Math.max(0, -((costing.totals.priceAdjustmentMinor / costing.totals.sellingPriceMinor) * 100))
    : 0;
  const highDiscount = discountPercent >= HIGH_DISCOUNT_PERCENT;
  if (highDiscount) {
    return approvalFallback();
  }
  return COSTING_APPROVAL_LEVELS.find((level) => level.maxSellingMinor == null || costing.totals.sellingPriceMinor <= level.maxSellingMinor)
    ?? approvalFallback();
}

export function getApprovalHistory(costingId: string): CostingApprovalRecord[] {
  return useCostingStore.getState().approvals.filter((item) => item.costingId === costingId);
}

export async function submitForApproval(costingId: string, actor: AuthenticatedUser): Promise<CostSheet> {
  assertCan(actor, "costing.submit");
  await authorizeClient("costing.submit");
  const current = getCostingById(costingId, actor);
  if (current.status !== "COMPLETED" && current.status !== "UNDER_REVIEW") {
    throw new AppError("VALIDATION", "Complete the costing before submitting for approval.", 400);
  }
  const next = useCostingStore.getState().changeStatus(costingId, current.status === "COMPLETED" ? "UNDER_REVIEW" : "APPROVAL_PENDING", actor);
  const submitted = next.status === "UNDER_REVIEW"
    ? useCostingStore.getState().changeStatus(costingId, "APPROVAL_PENDING", actor)
    : next;
  useCostingStore.getState().updateCosting(costingId, { approvalStatus: "APPROVAL_PENDING" }, actor);
  const level = requiredApprovalLevel(submitted);
  useCostingStore.getState().addApproval({
    costingId,
    levelId: level.id,
    levelName: level.name,
    decision: "SUBMITTED",
    remarks: `Required level: ${level.name}`,
    actorId: actor.uid,
    actorName: actor.displayName,
    actorRole: String(actor.role),
  });
  await notifyCostingEvent({
    kind: "costing_approval_requested",
    title: "Costing approval requested",
    body: `${submitted.displayNumber} requires ${level.name} review.`,
    href: `/crm/costing/${costingId}/approval`,
    recipientId: submitted.assignedTo,
    costingId,
    actor,
  });
  return useCostingStore.getState().getCosting(costingId) ?? submitted;
}

export async function approveCosting(costingId: string, values: CostingApprovalValues, actor: AuthenticatedUser): Promise<CostSheet> {
  assertCan(actor, "costing.approve");
  await authorizeClient("costing.approve");
  const current = getCostingById(costingId, actor);
  if (current.status !== "APPROVAL_PENDING" && current.status !== "UNDER_REVIEW") {
    throw new AppError("VALIDATION", "This costing is not waiting for approval.", 400);
  }
  const level = requiredApprovalLevel(current);
  useCostingStore.getState().addApproval({
    costingId,
    levelId: level.id,
    levelName: level.name,
    decision: "APPROVED",
    remarks: values.remarks,
    actorId: actor.uid,
    actorName: actor.displayName,
    actorRole: String(actor.role),
  });
  useCostingStore.getState().changeStatus(costingId, "APPROVED", actor);
  const next = useCostingStore.getState().updateCosting(
    costingId,
    {
      approvalStatus: "APPROVED",
      approvedBy: actor.uid,
      approvedByName: actor.displayName,
      approvedAt: new Date().toISOString(),
    },
    actor,
  );
  await markEnquiryReadyForQuotation(next, actor);
  await notifyCostingEvent({
    kind: "costing_approved",
    title: "Costing approved",
    body: `${next.displayNumber} is ready for quotation.`,
    href: `/crm/costing/${costingId}`,
    recipientId: next.assignedTo,
    costingId,
    actor,
  });
  return next;
}

export async function rejectCosting(costingId: string, values: CostingApprovalValues, actor: AuthenticatedUser): Promise<CostSheet> {
  assertCan(actor, "costing.reject");
  await authorizeClient("costing.reject");
  if (!values.reason?.trim()) {
    throw new AppError("VALIDATION", "A rejection reason is required.", 400);
  }
  const current = getCostingById(costingId, actor);
  const level = requiredApprovalLevel(current);
  useCostingStore.getState().addApproval({
    costingId,
    levelId: level.id,
    levelName: level.name,
    decision: "REJECTED",
    remarks: values.reason,
    actorId: actor.uid,
    actorName: actor.displayName,
    actorRole: String(actor.role),
  });
  useCostingStore.getState().changeStatus(costingId, "REJECTED", actor);
  const next = useCostingStore.getState().updateCosting(costingId, { approvalStatus: "REJECTED" }, actor);
  await notifyCostingEvent({
    kind: "costing_rejected",
    title: "Costing rejected",
    body: `${next.displayNumber} · ${values.reason}`,
    href: `/crm/costing/${costingId}`,
    recipientId: next.assignedTo,
    costingId,
    actor,
  });
  return next;
}
