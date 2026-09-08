import { isDemoMode } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { authorizeClient } from "@/lib/auth/authorize-client";
import { assertCan, can } from "@/lib/rbac/can";
import { DEFAULT_PAGE_SIZE } from "@/config/app";
import { isPastDate, todayIso } from "@/lib/dates";
import { useQuotationStore } from "@/stores/quotation-store";
import { useCrmStore } from "@/stores/crm-store";
import { useEnquiryStore } from "@/stores/enquiry-store";
import { useIdentityStore } from "@/stores/identity-store";
import { getCostingById, getQuotationReadyCosting } from "@/services/costing/costing.service";
import { getEnquiryById, changeEnquiryStatus } from "@/services/enquiries/enquiry.service";
import { getFeasibilityById } from "@/services/feasibility/feasibility.service";
import { notifyQuotationEvent } from "@/services/quotations/quotation-notify";
import { calculateLine, emptyQuotationTotals } from "@/services/quotations/quotation-calculation.service";
import { EDITABLE_QUOTATION_STATUSES } from "@/constants/quotations";
import type { PaginatedResult } from "@/types/common";
import type { AuthenticatedUser } from "@/types/rbac";
import type { CrmQuotation, QuotationKpis, SalesOrderReadyQuotation } from "@/types/quotations";
import type { CreateQuotationValues, QuotationHeaderValues } from "@/schemas/quotations";
import type { QuotationStatus } from "@/constants/quotations";

export interface QuotationListQuery {
  search?: string;
  status?: string;
  customerId?: string;
  product?: string;
  salesOwner?: string;
  currency?: string;
  approvalStatus?: string;
  createdFrom?: string;
  createdTo?: string;
  validFrom?: string;
  validTo?: string;
  valueMin?: number;
  valueMax?: number;
  page?: number;
  pageSize?: number;
  cursor?: string;
}

export function isQuotationExpired(item: CrmQuotation): boolean {
  return Boolean(item.validUntil && isPastDate(item.validUntil) && item.status !== "CANCELLED" && item.status !== "ACCEPTED");
}

export function daysUntilExpiry(item: CrmQuotation): number | null {
  if (!item.validUntil) return null;
  const due = new Date(`${item.validUntil}T23:59:59`).getTime();
  return Math.ceil((due - Date.now()) / 86_400_000);
}

export function expiryBucket(item: CrmQuotation): "7" | "3" | "1" | "EXPIRED" | null {
  if (item.status === "CANCELLED" || item.status === "ACCEPTED") return null;
  const days = daysUntilExpiry(item);
  if (days == null) return null;
  if (days < 0) return "EXPIRED";
  if (days <= 1) return "1";
  if (days <= 3) return "3";
  if (days <= 7) return "7";
  return null;
}

export function assertCanEditQuotation(item: CrmQuotation): void {
  if (!EDITABLE_QUOTATION_STATUSES.includes(item.status)) {
    throw new AppError("VALIDATION", "Approved or sent quotations cannot be edited. Create a revision.", 400);
  }
}

export function getQuotation(id: string): CrmQuotation | null {
  return useQuotationStore.getState().getQuotation(id) ?? null;
}

export function getQuotationById(id: string, actor: AuthenticatedUser): CrmQuotation {
  assertCan(actor, "quotations.view");
  const item = getQuotation(id);
  if (!item) throw new AppError("NOT_FOUND", "Quotation not found.", 404);
  return item;
}

export function listQuotations(
  query: QuotationListQuery = {},
  actor: AuthenticatedUser,
  source?: CrmQuotation[],
): PaginatedResult<CrmQuotation> & { nextCursor?: string } {
  assertCan(actor, "quotations.view");
  const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
  const rows = (source ?? useQuotationStore.getState().quotations)
    .filter((item) => {
      if (query.status && item.status !== query.status) return false;
      if (query.customerId && item.customerId !== query.customerId) return false;
      if (query.product && !item.productName.toLowerCase().includes(query.product.toLowerCase())) return false;
      if (query.salesOwner && item.salesOwner !== query.salesOwner) return false;
      if (query.approvalStatus && item.approvalStatus !== query.approvalStatus) return false;
      if (query.currency && item.currency !== query.currency) return false;
      if (query.createdFrom && item.quotationDate < query.createdFrom) return false;
      if (query.createdTo && item.quotationDate > query.createdTo) return false;
      if (query.validFrom && item.validUntil < query.validFrom) return false;
      if (query.validTo && item.validUntil > query.validTo) return false;
      if (query.valueMin != null && item.totals.grandTotalMinor < query.valueMin) return false;
      if (query.valueMax != null && item.totals.grandTotalMinor > query.valueMax) return false;
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

export function searchQuotations(search: string, actor: AuthenticatedUser): CrmQuotation[] {
  return listQuotations({ search, pageSize: 12 }, actor).items;
}

export function getQuotationsForEnquiry(enquiryId: string, actor: AuthenticatedUser): CrmQuotation[] {
  assertCan(actor, "quotations.view");
  return useQuotationStore.getState().quotations.filter((item) => item.enquiryId === enquiryId);
}

export function getQuotationsForCosting(costingId: string, actor: AuthenticatedUser): CrmQuotation[] {
  assertCan(actor, "quotations.view");
  return useQuotationStore.getState().quotations.filter((item) => item.costingId === costingId);
}

export function getQuotationsForCustomer(customerId: string, actor: AuthenticatedUser): CrmQuotation[] {
  assertCan(actor, "quotations.view");
  return useQuotationStore.getState().quotations.filter((item) => item.customerId === customerId);
}

export function canStartQuotationFromCosting(costingId: string, actor: AuthenticatedUser): boolean {
  if (!can(actor, "quotations.create")) return false;
  try {
    return getCostingById(costingId, actor).status === "APPROVED";
  } catch {
    return false;
  }
}

export async function createQuotation(values: CreateQuotationValues, actor: AuthenticatedUser): Promise<CrmQuotation> {
  assertCan(actor, "quotations.create");
  await authorizeClient("quotations.create");
  const costing = getCostingById(values.costingId, actor);
  if (costing.status !== "APPROVED") {
    if (!values.overrideReason?.trim() || !can(actor, "quotations.approve")) {
      throw new AppError("VALIDATION", "Quotations are created from approved costing unless an authorized override is recorded.", 400);
    }
  }
  const ready = costing.status === "APPROVED" ? getQuotationReadyCosting(costing.id, actor) : {
    costingId: costing.id,
    customerId: costing.customerId,
    productId: costing.productId,
    enquiryId: costing.enquiryId,
    currency: costing.currency,
    quantity: costing.baseQuantity,
    quantityUnit: costing.quantityUnit,
    unitPriceMinor: costing.totals.unitPriceMinor,
    sellingPriceMinor: costing.totals.sellingPriceMinor,
    validUntil: costing.validUntil,
  };
  const enquiry = getEnquiryById(ready.enquiryId, actor);
  const requirement = useEnquiryStore.getState().getRequirement(enquiry.id);
  if (!requirement) throw new AppError("VALIDATION", "A product requirement is required before quotation.", 400);
  const customer = useCrmStore.getState().customers.find((item) => item.id === enquiry.customerId);
  if (!customer) throw new AppError("VALIDATION", "Customer was not found.", 400);
  const contact = useCrmStore.getState().contacts.find((item) => item.id === (values.contactId || enquiry.contactId));
  try {
    getFeasibilityById(costing.feasibilityId, actor);
  } catch {
    throw new AppError("VALIDATION", "Feasibility is required for quotation traceability.", 400);
  }
  const owner = useIdentityStore.getState().users.find((item) => item.id === values.salesOwner);
  if (!owner) throw new AppError("VALIDATION", "Sales owner was not found.", 400);
  if (isDemoMode()) {
    const created = useQuotationStore.getState().createQuotation(
      {
        customerId: customer.id,
        customerName: customer.companyName,
        contactId: contact?.id,
        enquiryId: enquiry.id,
        enquiryNumber: enquiry.enquiryNumber,
        feasibilityId: costing.feasibilityId,
        feasibilityNumber: costing.feasibilityNumber,
        costingId: costing.id,
        costingNumber: costing.costingNumber,
        productId: ready.productId ?? requirement.productMasterId,
        productName: costing.productName || requirement.productName,
        quotationDate: values.quotationDate,
        validUntil: values.validUntil,
        status: "DRAFT",
        approvalStatus: "NOT_SUBMITTED",
        currency: values.currency,
        preparedBy: actor.uid,
        preparedByName: actor.displayName,
        salesOwner: owner.id,
        salesOwnerName: owner.displayName,
        notes: "",
        internalNotes: values.overrideReason || "",
        customerNotes: "",
        headerDiscountType: "PERCENTAGE",
        headerDiscountValue: 0,
        customer: {
          customerName: customer.companyName,
          legalName: customer.legalName,
          billingAddress: customer.billingAddress,
          shippingAddress: customer.shippingAddress,
          city: customer.city,
          state: customer.state,
          country: customer.country,
          postalCode: customer.postalCode,
          gstin: customer.gstin,
          pan: customer.pan,
          email: customer.primaryEmail,
          phone: customer.primaryPhone,
          contactName: contact?.fullName,
          contactEmail: contact?.email,
          contactPhone: contact?.phone,
        },
        costingSnapshot: {
          costingId: costing.id,
          costingNumber: costing.costingNumber,
          quantity: ready.quantity,
          quantityUnit: ready.quantityUnit,
          unitPriceMinor: ready.unitPriceMinor,
          sellingPriceMinor: ready.sellingPriceMinor,
          currency: ready.currency,
        },
        terms: {
          paymentTerms: "NET_30",
          deliveryTerms: "EX_WORKS",
          estimatedLeadTime: 45,
          leadTimeUnit: "DAYS",
          priceBasis: costing.commercial.deliveryTermsPlaceholder,
        },
        isDemoData: false,
      },
      actor,
    );
    const calc = calculateLine({
      quantity: ready.quantity,
      unitPriceMinor: ready.unitPriceMinor,
      discountType: "PERCENTAGE",
      discountValue: 0,
      taxRate: 0,
    });
    useQuotationStore.getState().replaceItems(created.id, [{
      id: `qitem_${crypto.randomUUID().slice(0, 8)}`,
      quotationId: created.id,
      productId: ready.productId ?? requirement.productMasterId,
      productName: costing.productName || requirement.productName,
      description: requirement.specialRequirements || costing.productName,
      dosageForm: requirement.dosageForm,
      strength: requirement.strength,
      packaging: requirement.packaging.primaryType,
      packSize: requirement.packSize ?? requirement.packaging.packSize,
      quantity: ready.quantity,
      quantityUnit: ready.quantityUnit,
      unitPriceMinor: ready.unitPriceMinor,
      discountType: "PERCENTAGE",
      discountValue: 0,
      taxType: "OTHER",
      taxRate: 0,
      costingId: costing.id,
      moq: requirement.moqRequirement,
      sortOrder: 0,
      ...calc,
    }]);
    const next = useQuotationStore.getState().recalculate(created.id);
    try {
      await changeEnquiryStatus(enquiry.id, "QUOTATION_CREATED", actor);
    } catch {
      // Enquiry may already be past this stage.
    }
    await notifyQuotationEvent({
      kind: "quotation_assigned",
      title: "Quotation assigned",
      body: `${next.displayNumber} · ${next.customerName}`,
      href: `/crm/quotations/${next.id}`,
      recipientId: next.salesOwner,
      quotationId: next.id,
      actor,
    });
    return next;
  }
  const response = await fetch("/api/crm/quotations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });
  const data = (await response.json().catch(() => ({}))) as { quotation?: CrmQuotation; error?: string };
  if (!response.ok || !data.quotation) {
    throw new AppError("INTERNAL", data.error ?? "Unable to create quotation.", response.status || 500);
  }
  return data.quotation;
}

export async function updateQuotation(id: string, values: QuotationHeaderValues, actor: AuthenticatedUser): Promise<CrmQuotation> {
  assertCan(actor, "quotations.update");
  await authorizeClient("quotations.update");
  const current = getQuotationById(id, actor);
  assertCanEditQuotation(current);
  const owner = useIdentityStore.getState().users.find((item) => item.id === values.salesOwner);
  if (!owner) throw new AppError("VALIDATION", "Sales owner was not found.", 400);
  if (isDemoMode()) {
    return useQuotationStore.getState().updateQuotation(id, {
      salesOwner: owner.id,
      salesOwnerName: owner.displayName,
      contactId: values.contactId || undefined,
      quotationDate: values.quotationDate,
      validUntil: values.validUntil,
      notes: values.notes,
      internalNotes: values.internalNotes,
      customerNotes: values.customerNotes,
      customer: {
        ...current.customer,
        billingAddress: values.billingAddress || current.customer.billingAddress,
        shippingAddress: values.shippingAddress || current.customer.shippingAddress,
      },
    }, actor);
  }
  const response = await fetch(`/api/crm/quotations/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });
  const data = (await response.json().catch(() => ({}))) as { quotation?: CrmQuotation; error?: string };
  if (!response.ok || !data.quotation) {
    throw new AppError("INTERNAL", data.error ?? "Unable to update quotation.", response.status || 500);
  }
  return data.quotation;
}

export async function changeQuotationStatus(id: string, status: QuotationStatus, actor: AuthenticatedUser): Promise<CrmQuotation> {
  const permission = status === "CANCELLED" ? "quotations.cancel" : status === "ACCEPTED" ? "quotations.approve" : "quotations.update";
  assertCan(actor, permission);
  await authorizeClient(permission);
  getQuotationById(id, actor);
  if (isDemoMode()) {
    const next = useQuotationStore.getState().changeStatus(id, status, actor);
    if (status === "ACCEPTED") {
      useQuotationStore.getState().updateQuotation(id, { acceptedAt: new Date().toISOString(), acceptedBy: actor.uid }, actor);
      await notifyQuotationEvent({
        kind: "quotation_accepted",
        title: "Quotation accepted",
        body: `${next.displayNumber} is ready for a sales order.`,
        href: `/crm/quotations/${id}`,
        recipientId: next.salesOwner,
        quotationId: id,
        actor,
      });
    }
    return useQuotationStore.getState().getQuotation(id) ?? next;
  }
  const response = await fetch(`/api/crm/quotations/${id}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  const data = (await response.json().catch(() => ({}))) as { quotation?: CrmQuotation; error?: string };
  if (!response.ok || !data.quotation) {
    throw new AppError("INTERNAL", data.error ?? "Unable to change quotation status.", response.status || 500);
  }
  return data.quotation;
}

export function compareQuotationVersions(familyId: string, actor: AuthenticatedUser) {
  assertCan(actor, "quotations.view");
  return useQuotationStore.getState().quotations
    .filter((item) => item.familyId === familyId)
    .sort((a, b) => a.version - b.version)
    .map((item) => ({
      id: item.id,
      version: item.version,
      displayNumber: item.displayNumber,
      quantity: useQuotationStore.getState().items.find((line) => line.quotationId === item.id)?.quantity ?? 0,
      unitPriceMinor: useQuotationStore.getState().items.find((line) => line.quotationId === item.id)?.unitPriceMinor ?? 0,
      discountAmountMinor: item.totals.discountAmountMinor,
      taxAmountMinor: item.totals.taxAmountMinor,
      additionalChargesMinor: item.totals.additionalChargesMinor,
      grandTotalMinor: item.totals.grandTotalMinor,
      paymentTerms: item.terms.paymentTerms,
      deliveryTerms: item.terms.deliveryTerms,
      validUntil: item.validUntil,
      createdByName: item.preparedByName,
      createdAt: item.createdAt,
      status: item.status,
    }));
}

export function getSalesOrderReadyQuotation(id: string, actor: AuthenticatedUser): SalesOrderReadyQuotation {
  const item = getQuotationById(id, actor);
  if (item.status !== "ACCEPTED") {
    throw new AppError("VALIDATION", "Only an accepted quotation can start a sales order.", 400);
  }
  return {
    quotationId: item.id,
    customerId: item.customerId,
    enquiryId: item.enquiryId,
    currency: item.currency,
    acceptedQuantities: useQuotationStore.getState().items.filter((line) => line.quotationId === id).map((line) => ({
      itemId: line.id,
      productId: line.productId,
      productName: line.productName,
      quantity: line.quantity,
      quantityUnit: line.quantityUnit,
      unitPriceMinor: line.unitPriceMinor,
      lineTotalMinor: line.lineTotalMinor,
    })),
    acceptedPrices: { grandTotalMinor: item.totals.grandTotalMinor },
    commercialTerms: item.terms,
  };
}

export function computeQuotationKpis(actor: AuthenticatedUser, source?: CrmQuotation[]): QuotationKpis {
  assertCan(actor, "quotations.view");
  const rows = source ?? useQuotationStore.getState().quotations;
  const sum = (filter: (item: CrmQuotation) => boolean) =>
    rows.filter(filter).reduce((total, item) => total + item.totals.grandTotalMinor, 0);
  return {
    total: rows.length,
    draft: rows.filter((item) => item.status === "DRAFT").length,
    approvalPending: rows.filter((item) => item.status === "APPROVAL_PENDING" || item.status === "UNDER_REVIEW").length,
    approved: rows.filter((item) => item.status === "APPROVED").length,
    sent: rows.filter((item) => item.status === "SENT" || item.status === "VIEWED").length,
    negotiation: rows.filter((item) => item.status === "NEGOTIATION").length,
    accepted: rows.filter((item) => item.status === "ACCEPTED").length,
    rejected: rows.filter((item) => item.status === "REJECTED").length,
    expired: rows.filter((item) => isQuotationExpired(item)).length,
    quotedValueMinor: sum(() => true),
    acceptedValueMinor: sum((item) => item.status === "ACCEPTED"),
    rejectedValueMinor: sum((item) => item.status === "REJECTED"),
    pendingValueMinor: sum((item) => item.status === "SENT" || item.status === "VIEWED" || item.status === "NEGOTIATION" || item.status === "APPROVED"),
  };
}

export function exportQuotationsCsv(rows: CrmQuotation[], actor: AuthenticatedUser): string {
  assertCan(actor, "quotations.export");
  const header = ["Quotation Number", "Customer", "Product", "Quantity", "Currency", "Grand Total", "Status", "Quotation Date", "Valid Until"];
  const lines = rows.map((row) => {
    const qty = useQuotationStore.getState().items.find((line) => line.quotationId === row.id)?.quantity ?? "";
    return [row.displayNumber, row.customerName, row.productName, qty, row.currency, row.totals.grandTotalMinor, row.status, row.quotationDate, row.validUntil]
      .map((value) => `"${String(value).replaceAll('"', '""')}"`)
      .join(",");
  });
  return [header.join(","), ...lines].join("\n");
}

export { emptyQuotationTotals, todayIso };
