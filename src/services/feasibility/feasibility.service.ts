import { isDemoMode } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { authorizeClient } from "@/lib/auth/authorize-client";
import { assertCan, can } from "@/lib/rbac/can";
import { DEFAULT_PAGE_SIZE } from "@/config/app";
import { isPastDate, todayIso } from "@/lib/dates";
import { useFeasibilityStore } from "@/stores/feasibility-store";
import { useEnquiryStore } from "@/stores/enquiry-store";
import { useIdentityStore } from "@/stores/identity-store";
import { getEnquiryById, changeEnquiryStatus } from "@/services/enquiries/enquiry.service";
import { notifyFeasibilityEvent } from "@/services/feasibility/feasibility-notify";
import { validateTransition } from "@/services/feasibility/feasibility-workflow.service";
import { FINAL_FEASIBILITY_STATUSES } from "@/constants/feasibility";
import type { PaginatedResult } from "@/types/common";
import type { AuthenticatedUser } from "@/types/rbac";
import type { FeasibilityAssessment, FeasibilityKpis } from "@/types/feasibility";
import type { FeasibilityDecisionValues, FeasibilityUpdateValues, StartFeasibilityValues } from "@/schemas/feasibility";
import type { FeasibilityStatus } from "@/constants/feasibility";

export interface FeasibilityListQuery {
  search?: string;
  status?: string;
  decision?: string;
  priority?: string;
  department?: string;
  assignedTo?: string;
  product?: string;
  customerId?: string;
  createdFrom?: string;
  createdTo?: string;
  targetFrom?: string;
  targetTo?: string;
  page?: number;
  pageSize?: number;
  cursor?: string;
  sortBy?: "feasibilityNumber" | "customerName" | "createdAt" | "targetCompletionDate" | "status";
  sortDirection?: "asc" | "desc";
}

export function isOverdue(item: FeasibilityAssessment): boolean {
  if (!item.targetCompletionDate) return false;
  if (FINAL_FEASIBILITY_STATUSES.includes(item.status)) return false;
  return isPastDate(item.targetCompletionDate);
}

export function listFeasibilities(
  query: FeasibilityListQuery = {},
  actor: AuthenticatedUser,
  source?: FeasibilityAssessment[],
): PaginatedResult<FeasibilityAssessment> & { nextCursor?: string } {
  assertCan(actor, "feasibility.view");
  const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
  const direction = query.sortDirection === "asc" ? 1 : -1;
  const sortBy = query.sortBy ?? "createdAt";
  const reviews = useFeasibilityStore.getState().reviews;
  const rows = (source ?? useFeasibilityStore.getState().assessments)
    .filter((item) => {
      if (query.status && item.status !== query.status) return false;
      if (query.decision && item.overallDecision !== query.decision) return false;
      if (query.priority && item.priority !== query.priority) return false;
      if (query.assignedTo && item.assignedTo !== query.assignedTo) return false;
      if (query.customerId && item.customerId !== query.customerId) return false;
      if (query.product && !item.productName.toLowerCase().includes(query.product.toLowerCase())) return false;
      if (query.department && !reviews.some((review) => review.feasibilityId === item.id && review.departmentId === query.department)) return false;
      if (query.createdFrom && item.createdAt.slice(0, 10) < query.createdFrom) return false;
      if (query.createdTo && item.createdAt.slice(0, 10) > query.createdTo) return false;
      if (query.targetFrom && (item.targetCompletionDate ?? "") < query.targetFrom) return false;
      if (query.targetTo && (item.targetCompletionDate ?? "") > query.targetTo) return false;
      if (query.search?.trim() && !item.searchIndex.includes(query.search.trim().toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => String(a[sortBy] ?? "").localeCompare(String(b[sortBy] ?? "")) * direction);

  let start = 0;
  if (query.cursor) {
    const index = rows.findIndex((item) => item.id === query.cursor);
    start = index >= 0 ? index + 1 : 0;
  } else if (query.page && query.page > 1) {
    start = (query.page - 1) * pageSize;
  }
  const items = rows.slice(start, start + pageSize);
  return {
    items,
    total: rows.length,
    page: query.page ?? (start === 0 ? 1 : Math.floor(start / pageSize) + 1),
    pageSize,
    hasMore: start + pageSize < rows.length,
    nextCursor: start + pageSize < rows.length ? items[items.length - 1]?.id : undefined,
  };
}

export function getFeasibility(id: string): FeasibilityAssessment | null {
  return useFeasibilityStore.getState().getAssessment(id) ?? null;
}

export function getFeasibilityById(id: string, actor: AuthenticatedUser): FeasibilityAssessment {
  assertCan(actor, "feasibility.view");
  const item = getFeasibility(id);
  if (!item) throw new AppError("NOT_FOUND", "Feasibility not found.", 404);
  return item;
}

export function getActiveFeasibilityForEnquiry(enquiryId: string): FeasibilityAssessment | null {
  return useFeasibilityStore.getState().getActiveForEnquiry(enquiryId) ?? null;
}

export function getCustomerFeasibilities(customerId: string, actor: AuthenticatedUser): FeasibilityAssessment[] {
  assertCan(actor, "feasibility.view");
  return useFeasibilityStore.getState().assessments.filter((item) => item.customerId === customerId);
}

export async function startFeasibility(values: StartFeasibilityValues, actor: AuthenticatedUser): Promise<FeasibilityAssessment> {
  assertCan(actor, "feasibility.create");
  await authorizeClient("feasibility.create");
  const enquiry = getEnquiryById(values.enquiryId, actor);
  const requirement = useEnquiryStore.getState().getRequirement(enquiry.id);
  if (!requirement) {
    throw new AppError("VALIDATION", "A product requirement is required before starting feasibility.", 400);
  }
  const existing = getActiveFeasibilityForEnquiry(enquiry.id);
  if (existing) {
    throw new AppError("CONFLICT", `Active feasibility ${existing.feasibilityNumber} already exists for this enquiry.`, 409);
  }
  const owner = useIdentityStore.getState().users.find((item) => item.id === values.assignedTo);
  const reviewer = values.technicalReviewer
    ? useIdentityStore.getState().users.find((item) => item.id === values.technicalReviewer)
    : undefined;
  if (isDemoMode()) {
    const created = useFeasibilityStore.getState().createAssessment(
      {
        enquiryId: enquiry.id,
        enquiryNumber: enquiry.enquiryNumber,
        customerId: enquiry.customerId,
        customerName: enquiry.customerName,
        productId: requirement.productMasterId,
        productName: requirement.productName,
        genericName: requirement.genericName,
        productRequirementId: requirement.id,
        dosageForm: requirement.dosageForm,
        strength: requirement.strength,
        quantity: requirement.requiredQuantity,
        annualQuantity: requirement.annualQuantity,
        packaging: requirement.packaging.primaryType,
        market: requirement.market ?? requirement.country,
        assignedTo: values.assignedTo,
        assignedToName: owner?.displayName ?? actor.displayName,
        assignedDepartment: owner?.departmentName,
        technicalReviewer: reviewer?.id,
        technicalReviewerName: reviewer?.displayName,
        priority: values.priority,
        status: "INITIATED",
        initiatedAt: new Date().toISOString(),
        targetCompletionDate: values.targetCompletionDate || undefined,
        isDemoData: false,
      },
      actor,
    );
    if (enquiry.status !== "FEASIBILITY_PENDING") {
      await changeEnquiryStatus(enquiry.id, "FEASIBILITY_PENDING", actor);
    }
    await notifyFeasibilityEvent({
      kind: "feasibility_assigned",
      title: "Feasibility assigned",
      body: `${created.feasibilityNumber} · ${created.customerName}`,
      href: `/crm/feasibility/${created.id}`,
      recipientId: created.assignedTo,
      feasibilityId: created.id,
      actor,
    });
    return created;
  }
  const response = await fetch("/api/crm/feasibility", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });
  const data = (await response.json().catch(() => ({}))) as { feasibility?: FeasibilityAssessment; error?: string };
  if (!response.ok || !data.feasibility) {
    throw new AppError("INTERNAL", data.error ?? "Unable to start feasibility.", response.status || 500);
  }
  return data.feasibility;
}

export async function updateFeasibility(
  id: string,
  values: FeasibilityUpdateValues,
  actor: AuthenticatedUser,
): Promise<FeasibilityAssessment> {
  assertCan(actor, "feasibility.update");
  await authorizeClient("feasibility.update");
  getFeasibilityById(id, actor);
  const owner = useIdentityStore.getState().users.find((item) => item.id === values.assignedTo);
  if (!owner) throw new AppError("VALIDATION", "Assigned user was not found.", 400);
  const reviewer = values.technicalReviewer
    ? useIdentityStore.getState().users.find((item) => item.id === values.technicalReviewer)
    : undefined;
  if (isDemoMode()) {
    return useFeasibilityStore.getState().updateAssessment(
      id,
      {
        assignedTo: values.assignedTo,
        assignedToName: owner.displayName,
        assignedDepartment: owner.departmentName,
        technicalReviewer: reviewer?.id,
        technicalReviewerName: reviewer?.displayName,
        priority: values.priority,
        targetCompletionDate: values.targetCompletionDate || undefined,
      },
      actor,
    );
  }
  const response = await fetch(`/api/crm/feasibility/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });
  const data = (await response.json().catch(() => ({}))) as { feasibility?: FeasibilityAssessment; error?: string };
  if (!response.ok || !data.feasibility) {
    throw new AppError("INTERNAL", data.error ?? "Unable to update feasibility.", response.status || 500);
  }
  return data.feasibility;
}

export async function assignFeasibility(
  id: string,
  assignedTo: string,
  actor: AuthenticatedUser,
  technicalReviewer?: string,
): Promise<FeasibilityAssessment> {
  assertCan(actor, "feasibility.assign");
  await authorizeClient("feasibility.assign");
  getFeasibilityById(id, actor);
  const owner = useIdentityStore.getState().users.find((item) => item.id === assignedTo);
  if (!owner) throw new AppError("VALIDATION", "Assigned user was not found.", 400);
  const reviewer = technicalReviewer
    ? useIdentityStore.getState().users.find((item) => item.id === technicalReviewer)
    : undefined;
  if (isDemoMode()) {
    const next = useFeasibilityStore.getState().updateAssessment(
      id,
      {
        assignedTo,
        assignedToName: owner.displayName,
        assignedDepartment: owner.departmentName,
        technicalReviewer: reviewer?.id,
        technicalReviewerName: reviewer?.displayName,
      },
      actor,
    );
    await notifyFeasibilityEvent({
      kind: "feasibility_assigned",
      title: "Feasibility assigned",
      body: `${next.feasibilityNumber} is now owned by ${owner.displayName}.`,
      href: `/crm/feasibility/${next.id}`,
      recipientId: assignedTo,
      feasibilityId: next.id,
      actor,
    });
    return next;
  }
  const response = await fetch(`/api/crm/feasibility/${id}/assign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assignedTo, technicalReviewer }),
  });
  const data = (await response.json().catch(() => ({}))) as { feasibility?: FeasibilityAssessment; error?: string };
  if (!response.ok || !data.feasibility) {
    throw new AppError("INTERNAL", data.error ?? "Unable to assign feasibility.", response.status || 500);
  }
  return data.feasibility;
}

export async function changeFeasibilityStatus(id: string, status: FeasibilityStatus, actor: AuthenticatedUser): Promise<FeasibilityAssessment> {
  assertCan(actor, "feasibility.change_status");
  await authorizeClient("feasibility.change_status");
  const current = getFeasibilityById(id, actor);
  validateTransition(current.status, status);
  if (isDemoMode()) {
    const next = useFeasibilityStore.getState().changeStatus(id, status, actor);
    if (status === "APPROVAL_PENDING") {
      await notifyFeasibilityEvent({
        kind: "approval_pending",
        title: "Feasibility approval pending",
        body: `${next.feasibilityNumber} is ready for approval.`,
        href: `/crm/feasibility/${next.id}`,
        recipientId: next.assignedTo,
        feasibilityId: next.id,
        actor,
      });
    }
    return next;
  }
  const response = await fetch(`/api/crm/feasibility/${id}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  const data = (await response.json().catch(() => ({}))) as { feasibility?: FeasibilityAssessment; error?: string };
  if (!response.ok || !data.feasibility) {
    throw new AppError("INTERNAL", data.error ?? "Unable to change feasibility status.", response.status || 500);
  }
  return data.feasibility;
}

export async function submitFinalDecision(id: string, values: FeasibilityDecisionValues, actor: AuthenticatedUser): Promise<FeasibilityAssessment> {
  assertCan(actor, "feasibility.final_decision");
  await authorizeClient("feasibility.final_decision");
  const current = getFeasibilityById(id, actor);
  if (current.status !== "APPROVAL_PENDING" && current.status !== "UNDER_EVALUATION") {
    throw new AppError("VALIDATION", "Final decision can only be recorded after evaluation / approval pending.", 400);
  }
  if (values.decision === "PARTIALLY_FEASIBLE") {
    const open = (values.conditions ?? []).length;
    if (open === 0) throw new AppError("VALIDATION", "Partial feasibility requires at least one condition.", 400);
  }
  if (isDemoMode()) {
    const next = useFeasibilityStore.getState().updateAssessment(
      id,
      {
        status: values.decision,
        overallDecision: values.decision,
        overallRemarks: values.remarks,
        notFeasibleReason: values.notFeasibleReason,
        conditions: (values.conditions ?? []).map((condition) => ({
          id: `fcond_${crypto.randomUUID().slice(0, 6)}`,
          condition: condition.condition,
          department: condition.department as FeasibilityAssessment["conditions"][number]["department"],
          owner: condition.owner,
          ownerName: useIdentityStore.getState().users.find((user) => user.id === condition.owner)?.displayName ?? actor.displayName,
          dueDate: condition.dueDate || undefined,
          status: "OPEN",
        })),
      },
      actor,
    );
    if (values.decision === "FEASIBLE") {
      try {
        await changeEnquiryStatus(next.enquiryId, "FEASIBILITY_APPROVED", actor);
      } catch {
        // Enquiry may already be past this stage.
      }
    }
    await notifyFeasibilityEvent({
      kind: "final_decision_made",
      title: "Feasibility decision made",
      body: `${next.feasibilityNumber} · ${values.decision}`,
      href: `/crm/feasibility/${next.id}`,
      recipientId: next.assignedTo,
      feasibilityId: next.id,
      actor,
    });
    return next;
  }
  const response = await fetch(`/api/crm/feasibility/${id}/decision`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });
  const data = (await response.json().catch(() => ({}))) as { feasibility?: FeasibilityAssessment; error?: string };
  if (!response.ok || !data.feasibility) {
    throw new AppError("INTERNAL", data.error ?? "Unable to record decision.", response.status || 500);
  }
  return data.feasibility;
}

export function computeFeasibilityKpis(actor: AuthenticatedUser, source?: FeasibilityAssessment[]): FeasibilityKpis {
  assertCan(actor, "feasibility.view");
  const rows = source ?? useFeasibilityStore.getState().assessments;
  return {
    total: rows.length,
    pendingReview: rows.filter((item) => ["INITIATED", "DOCUMENT_REVIEW", "TECHNICAL_REVIEW", "DEPARTMENT_REVIEW"].includes(item.status)).length,
    underEvaluation: rows.filter((item) => item.status === "UNDER_EVALUATION").length,
    clarificationRequired: rows.filter((item) => item.status === "CLARIFICATION_REQUIRED").length,
    approvalPending: rows.filter((item) => item.status === "APPROVAL_PENDING").length,
    feasible: rows.filter((item) => item.status === "FEASIBLE").length,
    partiallyFeasible: rows.filter((item) => item.status === "PARTIALLY_FEASIBLE").length,
    notFeasible: rows.filter((item) => item.status === "NOT_FEASIBLE").length,
    overdue: rows.filter((item) => isOverdue(item)).length,
  };
}

export function exportFeasibilitiesCsv(rows: FeasibilityAssessment[]): string {
  const header = ["Feasibility Number", "Enquiry", "Customer", "Product", "Assigned User", "Priority", "Status", "Target Completion", "Decision", "Created Date"];
  const lines = rows.map((row) =>
    [row.feasibilityNumber, row.enquiryNumber, row.customerName, row.productName, row.assignedToName, row.priority, row.status, row.targetCompletionDate ?? "", row.overallDecision ?? "", row.createdAt.slice(0, 10)]
      .map((value) => `"${String(value).replaceAll('"', '""')}"`)
      .join(","),
  );
  return [header.join(","), ...lines].join("\n");
}

export { can, todayIso };
export { startFeasibility as createFeasibility };
