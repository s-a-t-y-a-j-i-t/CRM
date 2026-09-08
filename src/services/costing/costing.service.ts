import { isDemoMode } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { authorizeClient } from "@/lib/auth/authorize-client";
import { assertCan, can } from "@/lib/rbac/can";
import { DEFAULT_PAGE_SIZE } from "@/config/app";
import { isPastDate, todayIso } from "@/lib/dates";
import { useCostingStore } from "@/stores/costing-store";
import { useEnquiryStore } from "@/stores/enquiry-store";
import { useIdentityStore } from "@/stores/identity-store";
import { getFeasibilityById } from "@/services/feasibility/feasibility.service";
import { getEnquiryById, changeEnquiryStatus } from "@/services/enquiries/enquiry.service";
import { notifyCostingEvent } from "@/services/costing/costing-notify";
import { formatCostingDisplay } from "@/services/costing/costing-code";
import { EDITABLE_COSTING_STATUSES } from "@/constants/costing";
import type { PaginatedResult } from "@/types/common";
import type { AuthenticatedUser } from "@/types/rbac";
import type { CostSheet, CostingKpis, QuotationReadyCosting } from "@/types/costing";
import type { CreateCostingValues, CostingHeaderValues } from "@/schemas/costing";
import type { CostingStatus } from "@/constants/costing";

export interface CostingListQuery {
  search?: string;
  status?: string;
  customerId?: string;
  product?: string;
  preparedBy?: string;
  approvalStatus?: string;
  currency?: string;
  createdFrom?: string;
  createdTo?: string;
  validFrom?: string;
  validTo?: string;
  page?: number;
  pageSize?: number;
  cursor?: string;
}

export function isCostingExpired(item: CostSheet): boolean {
  return Boolean(item.validUntil && isPastDate(item.validUntil) && item.status !== "CANCELLED");
}

export function assertCanEditCosting(item: CostSheet): void {
  if (!EDITABLE_COSTING_STATUSES.includes(item.status)) {
    throw new AppError("VALIDATION", "Approved costing cannot be edited. Create a new version.", 400);
  }
}

export function assertCanSeeBreakdown(actor: AuthenticatedUser): void {
  assertCan(actor, "costing.calculate");
}

export function getCosting(id: string): CostSheet | null {
  return useCostingStore.getState().getCosting(id) ?? null;
}

export function getCostingById(id: string, actor: AuthenticatedUser): CostSheet {
  assertCan(actor, "costing.view");
  const item = getCosting(id);
  if (!item) throw new AppError("NOT_FOUND", "Costing not found.", 404);
  return item;
}

export function listCostings(
  query: CostingListQuery = {},
  actor: AuthenticatedUser,
  source?: CostSheet[],
): PaginatedResult<CostSheet> & { nextCursor?: string } {
  assertCan(actor, "costing.view");
  const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
  const rows = (source ?? useCostingStore.getState().costings)
    .filter((item) => {
      if (query.status && item.status !== query.status) return false;
      if (query.customerId && item.customerId !== query.customerId) return false;
      if (query.product && !item.productName.toLowerCase().includes(query.product.toLowerCase())) return false;
      if (query.preparedBy && item.preparedBy !== query.preparedBy) return false;
      if (query.approvalStatus && item.approvalStatus !== query.approvalStatus) return false;
      if (query.currency && item.currency !== query.currency) return false;
      if (query.createdFrom && item.createdAt.slice(0, 10) < query.createdFrom) return false;
      if (query.createdTo && item.createdAt.slice(0, 10) > query.createdTo) return false;
      if (query.validFrom && (item.validUntil ?? "") < query.validFrom) return false;
      if (query.validTo && (item.validUntil ?? "") > query.validTo) return false;
      if (query.search?.trim() && !item.searchIndex.includes(query.search.trim().toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

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

export function searchCostings(search: string, actor: AuthenticatedUser): CostSheet[] {
  return listCostings({ search, pageSize: 12 }, actor).items;
}

export function getCostingsForEnquiry(enquiryId: string, actor: AuthenticatedUser): CostSheet[] {
  assertCan(actor, "costing.view");
  return useCostingStore.getState().costings.filter((item) => item.enquiryId === enquiryId);
}

export function getCostingsForFeasibility(feasibilityId: string, actor: AuthenticatedUser): CostSheet[] {
  assertCan(actor, "costing.view");
  return useCostingStore.getState().costings.filter((item) => item.feasibilityId === feasibilityId);
}

export function canStartCostingFromFeasibility(feasibilityId: string, actor: AuthenticatedUser): boolean {
  if (!can(actor, "costing.create")) return false;
  try {
    const feasibility = getFeasibilityById(feasibilityId, actor);
    return feasibility.overallDecision === "FEASIBLE" || feasibility.overallDecision === "PARTIALLY_FEASIBLE" || feasibility.status === "FEASIBLE" || feasibility.status === "PARTIALLY_FEASIBLE";
  } catch {
    return false;
  }
}

export async function createCosting(values: CreateCostingValues, actor: AuthenticatedUser): Promise<CostSheet> {
  assertCan(actor, "costing.create");
  await authorizeClient("costing.create");
  const feasibility = getFeasibilityById(values.feasibilityId, actor);
  const enquiry = getEnquiryById(feasibility.enquiryId, actor);
  const requirement = useEnquiryStore.getState().getRequirement(enquiry.id);
  if (!requirement) {
    throw new AppError("VALIDATION", "A product requirement is required before costing.", 400);
  }
  const eligible = feasibility.overallDecision === "FEASIBLE" || feasibility.overallDecision === "PARTIALLY_FEASIBLE" || feasibility.status === "FEASIBLE" || feasibility.status === "PARTIALLY_FEASIBLE";
  if (!eligible) {
    if (!values.overrideReason?.trim() || !can(actor, "costing.adjust")) {
      throw new AppError("VALIDATION", "Costing is only allowed for feasible assessments unless an authorized override is recorded.", 400);
    }
  }
  const owner = useIdentityStore.getState().users.find((item) => item.id === values.assignedTo);
  if (!owner) throw new AppError("VALIDATION", "Assigned user was not found.", 400);
  if (isDemoMode()) {
    const created = useCostingStore.getState().createCosting(
      {
        enquiryId: enquiry.id,
        enquiryNumber: enquiry.enquiryNumber,
        customerId: enquiry.customerId,
        customerName: enquiry.customerName,
        productId: requirement.productMasterId,
        productName: requirement.productName,
        productRequirementId: requirement.id,
        feasibilityId: feasibility.id,
        feasibilityNumber: feasibility.feasibilityNumber,
        status: "DRAFT",
        approvalStatus: "NOT_SUBMITTED",
        currency: values.currency,
        costingDate: values.costingDate,
        validUntil: values.validUntil || undefined,
        preparedBy: actor.uid,
        preparedByName: actor.displayName,
        assignedTo: values.assignedTo,
        assignedToName: owner.displayName,
        baseQuantity: values.baseQuantity,
        quantityUnit: values.quantityUnit,
        batchSize: values.batchSize,
        numberOfBatches: values.numberOfBatches,
        annualQuantity: values.annualQuantity ?? requirement.annualQuantity,
        marginType: "PERCENTAGE_MARGIN",
        marginValue: 0,
        overrideReason: values.overrideReason || undefined,
        commercial: {
          market: requirement.market ?? requirement.country,
          specialRequirement: requirement.specialRequirements,
        },
        yield: {},
        isDemoData: false,
      },
      actor,
    );
    await notifyCostingEvent({
      kind: "costing_assigned",
      title: "Costing assigned",
      body: `${created.displayNumber} · ${created.customerName}`,
      href: `/crm/costing/${created.id}`,
      recipientId: created.assignedTo,
      costingId: created.id,
      actor,
    });
    return created;
  }
  const response = await fetch("/api/crm/costing", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });
  const data = (await response.json().catch(() => ({}))) as { costing?: CostSheet; error?: string };
  if (!response.ok || !data.costing) {
    throw new AppError("INTERNAL", data.error ?? "Unable to create costing.", response.status || 500);
  }
  return data.costing;
}

export async function updateCosting(id: string, values: CostingHeaderValues, actor: AuthenticatedUser): Promise<CostSheet> {
  assertCan(actor, "costing.update");
  await authorizeClient("costing.update");
  const current = getCostingById(id, actor);
  assertCanEditCosting(current);
  const owner = useIdentityStore.getState().users.find((item) => item.id === values.assignedTo);
  if (!owner) throw new AppError("VALIDATION", "Assigned user was not found.", 400);
  if (isDemoMode()) {
    const next = useCostingStore.getState().updateCosting(
      id,
      {
        assignedTo: values.assignedTo,
        assignedToName: owner.displayName,
        currency: values.currency,
        costingDate: values.costingDate,
        validUntil: values.validUntil || undefined,
        baseQuantity: values.baseQuantity,
        quantityUnit: values.quantityUnit,
        batchSize: values.batchSize,
        numberOfBatches: values.numberOfBatches,
        annualQuantity: values.annualQuantity,
        remarks: values.remarks,
        commercial: {
          market: values.market,
          paymentTermsPlaceholder: values.paymentTermsPlaceholder,
          deliveryTermsPlaceholder: values.deliveryTermsPlaceholder,
          specialRequirement: values.specialRequirement,
        },
        yield: {
          expectedYieldPercent: values.expectedYieldPercent,
          materialWastagePercent: values.materialWastagePercent,
          productionLossPercent: values.productionLossPercent,
          packagingLossPercent: values.packagingLossPercent,
        },
      },
      actor,
    );
    return useCostingStore.getState().recalculate(next.id);
  }
  const response = await fetch(`/api/crm/costing/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });
  const data = (await response.json().catch(() => ({}))) as { costing?: CostSheet; error?: string };
  if (!response.ok || !data.costing) {
    throw new AppError("INTERNAL", data.error ?? "Unable to update costing.", response.status || 500);
  }
  return data.costing;
}

export async function changeCostingStatus(id: string, status: CostingStatus, actor: AuthenticatedUser): Promise<CostSheet> {
  assertCan(actor, "costing.update");
  await authorizeClient("costing.update");
  getCostingById(id, actor);
  if (isDemoMode()) {
    const next = useCostingStore.getState().changeStatus(id, status, actor);
    if (status === "COMPLETED") {
      await notifyCostingEvent({
        kind: "costing_completed",
        title: "Costing completed",
        body: `${next.displayNumber} is ready for review.`,
        href: `/crm/costing/${next.id}`,
        recipientId: next.assignedTo,
        costingId: next.id,
        actor,
      });
    }
    return next;
  }
  const response = await fetch(`/api/crm/costing/${id}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  const data = (await response.json().catch(() => ({}))) as { costing?: CostSheet; error?: string };
  if (!response.ok || !data.costing) {
    throw new AppError("INTERNAL", data.error ?? "Unable to change costing status.", response.status || 500);
  }
  return data.costing;
}

export async function createCostingVersion(id: string, changeReason: string, actor: AuthenticatedUser): Promise<CostSheet> {
  assertCan(actor, "costing.version");
  await authorizeClient("costing.version");
  const current = getCostingById(id, actor);
  if (isDemoMode()) {
    const store = useCostingStore.getState();
    const family = store.costings.filter((item) => item.familyId === current.familyId);
    const nextVersion = Math.max(...family.map((item) => item.version)) + 1;
    store.addVersion({
      id: `cver_${crypto.randomUUID().slice(0, 8)}`,
      costingId: current.id,
      version: current.version,
      costingNumber: current.costingNumber,
      changeReason,
      totals: current.totals,
      createdAt: new Date().toISOString(),
      createdBy: actor.uid,
      createdByName: actor.displayName,
    });
    const created = store.createCosting(
      {
        ...current,
        status: "DRAFT",
        approvalStatus: "NOT_SUBMITTED",
        approvedBy: undefined,
        approvedByName: undefined,
        approvedAt: undefined,
        version: nextVersion,
        familyId: current.familyId,
        costingNumber: current.costingNumber,
        remarks: changeReason,
        isDemoData: false,
      },
      actor,
    );
    const copyLines = <T extends { costingId: string; id: string }>(rows: T[]): T[] =>
      rows.filter((row) => row.costingId === current.id).map((row) => ({ ...row, id: `${row.id}_${created.id}`, costingId: created.id }));
    store.replaceMaterials(created.id, copyLines(store.materials));
    store.replacePackaging(created.id, copyLines(store.packaging));
    const manufacturing = store.manufacturing.find((item) => item.costingId === current.id);
    if (manufacturing) store.upsertManufacturing({ ...manufacturing, costingId: created.id });
    store.replaceQuality(created.id, copyLines(store.quality));
    store.replaceRegulatory(created.id, copyLines(store.regulatory));
    store.replaceDocumentation(created.id, copyLines(store.documentation));
    store.replaceOverhead(created.id, copyLines(store.overhead));
    const next = store.recalculate(created.id);
    await notifyCostingEvent({
      kind: "costing_version_created",
      title: "Costing version created",
      body: `${formatCostingDisplay(next.costingNumber, next.version)} · ${changeReason}`,
      href: `/crm/costing/${next.id}`,
      recipientId: next.assignedTo,
      costingId: next.id,
      actor,
    });
    return next;
  }
  const response = await fetch(`/api/crm/costing/${id}/version`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ changeReason }),
  });
  const data = (await response.json().catch(() => ({}))) as { costing?: CostSheet; error?: string };
  if (!response.ok || !data.costing) {
    throw new AppError("INTERNAL", data.error ?? "Unable to version costing.", response.status || 500);
  }
  return data.costing;
}

export function compareCostingVersions(familyId: string, actor: AuthenticatedUser) {
  assertCan(actor, "costing.view");
  return useCostingStore.getState().costings
    .filter((item) => item.familyId === familyId)
    .sort((a, b) => a.version - b.version)
    .map((item) => ({
      id: item.id,
      version: item.version,
      displayNumber: item.displayNumber,
      materialCostMinor: item.totals.materialCostMinor,
      packagingCostMinor: item.totals.packagingCostMinor,
      manufacturingCostMinor: item.totals.manufacturingCostMinor,
      qualityCostMinor: item.totals.qualityCostMinor,
      overheadCostMinor: item.totals.overheadCostMinor,
      totalCostMinor: item.totals.totalCostMinor,
      marginAmountMinor: item.totals.marginAmountMinor,
      sellingPriceMinor: item.totals.sellingPriceMinor,
      createdByName: item.preparedByName,
      createdAt: item.createdAt,
      status: item.status,
    }));
}

export function getQuotationReadyCosting(id: string, actor: AuthenticatedUser): QuotationReadyCosting {
  const item = getCostingById(id, actor);
  if (item.status !== "APPROVED") {
    throw new AppError("VALIDATION", "Only an approved costing can be used for quotation.", 400);
  }
  return {
    costingId: item.id,
    customerId: item.customerId,
    productId: item.productId,
    enquiryId: item.enquiryId,
    currency: item.currency,
    quantity: item.baseQuantity,
    quantityUnit: item.quantityUnit,
    unitPriceMinor: item.totals.unitPriceMinor,
    sellingPriceMinor: item.totals.sellingPriceMinor,
    validUntil: item.validUntil,
  };
}

export async function markEnquiryReadyForQuotation(costing: CostSheet, actor: AuthenticatedUser): Promise<void> {
  try {
    await changeEnquiryStatus(costing.enquiryId, "QUOTATION_PENDING", actor);
  } catch {
    // Enquiry may already be past this stage.
  }
}

export function computeCostingKpis(actor: AuthenticatedUser, source?: CostSheet[]): CostingKpis {
  assertCan(actor, "costing.view");
  const rows = source ?? useCostingStore.getState().costings;
  return {
    total: rows.length,
    draft: rows.filter((item) => item.status === "DRAFT").length,
    inProgress: rows.filter((item) => item.status === "IN_PROGRESS").length,
    approvalPending: rows.filter((item) => item.status === "APPROVAL_PENDING" || item.status === "UNDER_REVIEW").length,
    approved: rows.filter((item) => item.status === "APPROVED" && !isCostingExpired(item)).length,
    rejected: rows.filter((item) => item.status === "REJECTED").length,
    expired: rows.filter((item) => isCostingExpired(item)).length,
  };
}

export function exportCostingsCsv(rows: CostSheet[], actor: AuthenticatedUser): string {
  assertCan(actor, "costing.export");
  const showInternal = can(actor, "costing.calculate");
  const header = showInternal
    ? ["Costing Number", "Customer", "Product", "Quantity", "Material Cost", "Packaging Cost", "Manufacturing Cost", "Quality Cost", "Overhead", "Total Cost", "Margin", "Selling Price", "Status"]
    : ["Costing Number", "Customer", "Product", "Quantity", "Selling Price", "Status"];
  const lines = rows.map((row) => {
    const values = showInternal
      ? [row.displayNumber, row.customerName, row.productName, row.baseQuantity, row.totals.materialCostMinor, row.totals.packagingCostMinor, row.totals.manufacturingCostMinor, row.totals.qualityCostMinor, row.totals.overheadCostMinor, row.totals.totalCostMinor, row.totals.marginAmountMinor, row.totals.sellingPriceMinor, row.status]
      : [row.displayNumber, row.customerName, row.productName, row.baseQuantity, row.totals.sellingPriceMinor, row.status];
    return values.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",");
  });
  return [header.join(","), ...lines].join("\n");
}

export { can, todayIso };
