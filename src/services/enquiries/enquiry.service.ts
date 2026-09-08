import { isDemoMode } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { authorizeClient } from "@/lib/auth/authorize-client";
import { assertCan, can } from "@/lib/rbac/can";
import { DEFAULT_PAGE_SIZE } from "@/config/app";
import { todayIso } from "@/lib/dates";
import { useEnquiryStore } from "@/stores/enquiry-store";
import { useIdentityStore } from "@/stores/identity-store";
import { useCrmStore } from "@/stores/crm-store";
import { notifyEnquiryEvent } from "@/services/enquiries/enquiry-notify";
import { validateTransition } from "@/services/enquiries/enquiry-workflow.service";
import { formToRequirementPatch } from "@/services/enquiries/requirement-map";
import { OPEN_ENQUIRY_STATUSES } from "@/constants/enquiries";
import type { PaginatedResult } from "@/types/common";
import type { AuthenticatedUser } from "@/types/rbac";
import type { CrmEnquiry, EnquiryKpis, EnquiryStatus, ProductRequirement } from "@/types/enquiries";
import type { EnquiryFormValues } from "@/schemas/enquiries";
import type { CrmLead } from "@/types/leads";

export interface EnquiryListQuery {
  search?: string;
  status?: string;
  priority?: string;
  enquirySource?: string;
  enquiryType?: string;
  assignedTo?: string;
  customerId?: string;
  product?: string;
  dosageForm?: string;
  country?: string;
  receivedFrom?: string;
  receivedTo?: string;
  decisionFrom?: string;
  decisionTo?: string;
  page?: number;
  pageSize?: number;
  cursor?: string;
  sortBy?: "enquiryNumber" | "customerName" | "receivedDate" | "expectedDecisionDate" | "priority" | "status";
  sortDirection?: "asc" | "desc";
}

const PRIORITY_RANK: Record<string, number> = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };

export function visibleEnquiries(actor: AuthenticatedUser, source?: CrmEnquiry[]): CrmEnquiry[] {
  const rows = source ?? useEnquiryStore.getState().enquiries;
  if (can(actor, "enquiries.view_all")) return rows;
  return rows.filter((item) => item.assignedTo === actor.uid);
}

export function assertCanAccessEnquiry(actor: AuthenticatedUser, enquiry: CrmEnquiry): void {
  assertCan(actor, "enquiries.view");
  if (can(actor, "enquiries.view_all")) return;
  if (enquiry.assignedTo !== actor.uid) {
    throw new AppError("FORBIDDEN", "You can only access enquiries assigned to you.", 403);
  }
}

export function listEnquiries(
  query: EnquiryListQuery = {},
  actor: AuthenticatedUser,
  source?: CrmEnquiry[],
): PaginatedResult<CrmEnquiry> & { nextCursor?: string } {
  const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
  const direction = query.sortDirection === "asc" ? 1 : -1;
  const sortBy = query.sortBy ?? "receivedDate";
  const store = useEnquiryStore.getState();
  const rows = visibleEnquiries(actor, source)
    .filter((enquiry) => {
      if (query.status && enquiry.status !== query.status) return false;
      if (query.priority && enquiry.priority !== query.priority) return false;
      if (query.enquirySource && enquiry.enquirySource !== query.enquirySource) return false;
      if (query.enquiryType && enquiry.enquiryType !== query.enquiryType) return false;
      if (query.assignedTo && enquiry.assignedTo !== query.assignedTo) return false;
      if (query.customerId && enquiry.customerId !== query.customerId) return false;
      if (query.receivedFrom && enquiry.receivedDate < query.receivedFrom) return false;
      if (query.receivedTo && enquiry.receivedDate > query.receivedTo) return false;
      if (query.decisionFrom && (enquiry.expectedDecisionDate ?? "") < query.decisionFrom) return false;
      if (query.decisionTo && (enquiry.expectedDecisionDate ?? "") > query.decisionTo) return false;
      const requirement = store.getRequirement(enquiry.id);
      if (query.product && !(requirement?.productName ?? "").toLowerCase().includes(query.product.toLowerCase())) return false;
      if (query.dosageForm && requirement?.dosageForm !== query.dosageForm) return false;
      if (query.country && requirement?.country !== query.country && enquiry.customerName) {
        if (requirement?.country && requirement.country !== query.country) return false;
      }
      if (query.search?.trim() && !enquiry.searchIndex.includes(query.search.trim().toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "priority") return ((PRIORITY_RANK[a.priority] ?? 0) - (PRIORITY_RANK[b.priority] ?? 0)) * direction;
      return String(a[sortBy] ?? "").localeCompare(String(b[sortBy] ?? "")) * direction;
    });

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

export function searchEnquiries(search: string, actor: AuthenticatedUser): CrmEnquiry[] {
  return listEnquiries({ search, pageSize: 20 }, actor).items;
}

export function getEnquiry(id: string): CrmEnquiry | null {
  return useEnquiryStore.getState().getEnquiry(id) ?? null;
}

export function getEnquiryById(id: string, actor: AuthenticatedUser): CrmEnquiry {
  const enquiry = getEnquiry(id);
  if (!enquiry) throw new AppError("NOT_FOUND", "Enquiry not found.", 404);
  assertCanAccessEnquiry(actor, enquiry);
  return enquiry;
}

export function getCustomerEnquiries(customerId: string, actor: AuthenticatedUser): CrmEnquiry[] {
  return visibleEnquiries(actor).filter((item) => item.customerId === customerId);
}

export function getRequirementForEnquiry(enquiryId: string): ProductRequirement | null {
  return useEnquiryStore.getState().getRequirement(enquiryId) ?? null;
}

async function persistEnquiry(values: EnquiryFormValues, actor: AuthenticatedUser, existingId?: string): Promise<CrmEnquiry> {
  const customer = useCrmStore.getState().getCustomer(values.customerId);
  const contact = useCrmStore.getState().getContact(values.contactId);
  if (!customer) throw new AppError("VALIDATION", "Customer was not found.", 400);
  if (!contact || contact.customerId !== customer.id) {
    throw new AppError("VALIDATION", "Select a contact that belongs to this customer.", 400);
  }
  const owner = useIdentityStore.getState().users.find((item) => item.id === values.assignedTo);
  const patch = {
    leadId: values.leadId || undefined,
    customerId: customer.id,
    contactId: contact.id,
    customerName: customer.companyName,
    contactName: contact.fullName,
    enquirySource: values.enquirySource,
    enquiryType: values.enquiryType,
    assignedTo: values.assignedTo,
    assignedToName: owner?.displayName ?? actor.displayName,
    priority: values.priority,
    status: existingId ? (getEnquiry(existingId)?.status ?? values.status) : "NEW",
    receivedDate: values.receivedDate,
    expectedDecisionDate: values.expectedDecisionDate || undefined,
    description: values.description,
    internalNotes: values.internalNotes,
    technicalReviewStatus: existingId ? (getEnquiry(existingId)?.technicalReviewStatus ?? "NOT_STARTED") : "NOT_STARTED",
    isDemoData: false,
  };

  const store = useEnquiryStore.getState();
  const enquiry = existingId
    ? store.updateEnquiry(existingId, patch, actor)
    : store.createEnquiry(patch, actor);

  const requirementPatch = formToRequirementPatch(values.requirement, enquiry.id, actor);
  const currentReq = store.getRequirement(enquiry.id);
  if (currentReq && existingId) {
    store.updateRequirement(
      currentReq.id,
      { ...currentReq, ...requirementPatch },
      values.requirement.changeReason || "Requirement updated",
      actor,
    );
  } else if (!currentReq) {
    store.createRequirement(requirementPatch, actor);
  }
  return store.getEnquiry(enquiry.id) ?? enquiry;
}

export async function createEnquiry(values: EnquiryFormValues, actor: AuthenticatedUser): Promise<CrmEnquiry> {
  assertCan(actor, "enquiries.create");
  await authorizeClient("enquiries.create");
  if (isDemoMode()) {
    const created = await persistEnquiry({ ...values, status: "NEW" }, actor);
    await notifyEnquiryEvent({
      kind: "enquiry_assigned",
      title: "Enquiry assigned",
      body: `${created.enquiryNumber} · ${created.customerName}`,
      href: `/crm/enquiries/${created.id}`,
      recipientId: created.assignedTo,
      enquiryId: created.id,
      actor,
    });
    return created;
  }
  const response = await fetch("/api/crm/enquiries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });
  const data = (await response.json().catch(() => ({}))) as { enquiry?: CrmEnquiry; error?: string };
  if (!response.ok || !data.enquiry) {
    throw new AppError("INTERNAL", data.error ?? "Unable to create enquiry.", response.status || 500);
  }
  return data.enquiry;
}

export async function updateEnquiry(id: string, values: EnquiryFormValues, actor: AuthenticatedUser): Promise<CrmEnquiry> {
  assertCan(actor, "enquiries.update");
  await authorizeClient("enquiries.update");
  getEnquiryById(id, actor);
  if (isDemoMode()) {
    return persistEnquiry(values, actor, id);
  }
  const response = await fetch(`/api/crm/enquiries/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });
  const data = (await response.json().catch(() => ({}))) as { enquiry?: CrmEnquiry; error?: string };
  if (!response.ok || !data.enquiry) {
    throw new AppError("INTERNAL", data.error ?? "Unable to update enquiry.", response.status || 500);
  }
  return data.enquiry;
}

export async function assignEnquiry(id: string, assignedTo: string, actor: AuthenticatedUser): Promise<CrmEnquiry> {
  assertCan(actor, "enquiries.assign");
  await authorizeClient("enquiries.assign");
  const current = getEnquiryById(id, actor);
  const owner = useIdentityStore.getState().users.find((item) => item.id === assignedTo);
  if (!owner) throw new AppError("VALIDATION", "Assigned user was not found.", 400);
  if (isDemoMode()) {
    const next = useEnquiryStore.getState().assignEnquiry(id, assignedTo, owner.displayName, actor);
    await notifyEnquiryEvent({
      kind: current.assignedTo === assignedTo ? "enquiry_assigned" : "enquiry_reassigned",
      title: current.assignedTo === assignedTo ? "Enquiry assigned" : "Enquiry reassigned",
      body: `${next.enquiryNumber} is now assigned to ${owner.displayName}.`,
      href: `/crm/enquiries/${next.id}`,
      recipientId: assignedTo,
      enquiryId: next.id,
      actor,
    });
    return next;
  }
  const response = await fetch(`/api/crm/enquiries/${id}/assign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assignedTo }),
  });
  const data = (await response.json().catch(() => ({}))) as { enquiry?: CrmEnquiry; error?: string };
  if (!response.ok || !data.enquiry) {
    throw new AppError("INTERNAL", data.error ?? "Unable to assign enquiry.", response.status || 500);
  }
  return data.enquiry;
}

export async function changeEnquiryStatus(id: string, status: EnquiryStatus, actor: AuthenticatedUser): Promise<CrmEnquiry> {
  assertCan(actor, "enquiries.change_status");
  await authorizeClient("enquiries.change_status");
  const current = getEnquiryById(id, actor);
  validateTransition(current.status, status);
  if (isDemoMode()) {
    const next = useEnquiryStore.getState().changeStatus(id, status, actor);
    await notifyEnquiryEvent({
      kind: "enquiry_status_changed",
      title: "Enquiry status changed",
      body: `${next.enquiryNumber} moved from ${current.status} to ${status}.`,
      href: `/crm/enquiries/${next.id}`,
      recipientId: next.assignedTo,
      enquiryId: next.id,
      actor,
    });
    return next;
  }
  const response = await fetch(`/api/crm/enquiries/${id}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  const data = (await response.json().catch(() => ({}))) as { enquiry?: CrmEnquiry; error?: string };
  if (!response.ok || !data.enquiry) {
    throw new AppError("INTERNAL", data.error ?? "Unable to change enquiry status.", response.status || 500);
  }
  return data.enquiry;
}

export async function startTechnicalReview(id: string, actor: AuthenticatedUser, notes?: string): Promise<CrmEnquiry> {
  assertCan(actor, "enquiries.technical_review");
  await authorizeClient("enquiries.technical_review");
  const current = getEnquiryById(id, actor);
  if (current.status !== "TECHNICAL_REVIEW") {
    validateTransition(current.status, "TECHNICAL_REVIEW");
  }
  if (isDemoMode()) {
    if (current.status !== "TECHNICAL_REVIEW") {
      useEnquiryStore.getState().changeStatus(id, "TECHNICAL_REVIEW", actor);
    }
    const next = useEnquiryStore.getState().updateEnquiry(
      id,
      {
        technicalReviewStatus: "IN_PROGRESS",
        technicalReviewer: actor.uid,
        technicalReviewStartedAt: new Date().toISOString(),
        technicalReviewNotes: notes,
      },
      actor,
    );
    useEnquiryStore.getState().addActivity(
      {
        enquiryId: id,
        type: "NOTE",
        subject: "Technical review started",
        description: notes || "Technical review opened. Full feasibility is a later phase.",
        activityDate: new Date().toISOString(),
        status: "COMPLETED",
      },
      actor,
    );
    await notifyEnquiryEvent({
      kind: "technical_review_started",
      title: "Technical review started",
      body: `${next.enquiryNumber} is in technical review.`,
      href: `/crm/enquiries/${next.id}`,
      recipientId: next.assignedTo,
      enquiryId: next.id,
      actor,
    });
    return next;
  }
  const response = await fetch(`/api/crm/enquiries/${id}/technical-review`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ notes }) });
  const data = (await response.json().catch(() => ({}))) as { enquiry?: CrmEnquiry; error?: string };
  if (!response.ok || !data.enquiry) {
    throw new AppError("INTERNAL", data.error ?? "Unable to start technical review.", response.status || 500);
  }
  return data.enquiry;
}

const LEAD_DOSAGE_MAP = ["TABLET", "CAPSULE", "SYRUP", "INJECTION", "OINTMENT", "SACHET"] as const;

export async function createEnquiryFromLead(
  lead: CrmLead,
  customerId: string,
  contactId: string | undefined,
  actor: AuthenticatedUser,
): Promise<CrmEnquiry> {
  assertCan(actor, "enquiries.create");
  const customer = useCrmStore.getState().getCustomer(customerId);
  const contact = contactId ? useCrmStore.getState().getContact(contactId) : undefined;
  if (!contactId) {
    throw new AppError("VALIDATION", "A contact is required to convert this lead into an enquiry.", 400);
  }
  const dosage = (lead.dosageForm ?? "tablet").toUpperCase();
  return createEnquiry(
    {
      customerId,
      contactId: contact?.id || contactId,
      leadId: lead.id,
      enquirySource: "LEAD",
      enquiryType: lead.leadType === "EXPORT" ? "EXPORT" : lead.leadType === "EXISTING_CUSTOMER" ? "REPEAT_ORDER" : "NEW_PRODUCT",
      priority: lead.priority,
      assignedTo: lead.assignedTo,
      receivedDate: todayIso(),
      expectedDecisionDate: lead.expectedClosingDate ?? "",
      description: lead.description,
      internalNotes: lead.notes,
      status: "NEW",
      requirement: {
        productMasterId: "",
        isNewProductRequirement: true,
        productName: lead.productInterest || customer?.companyName || "Product requirement",
        genericName: "",
        brandName: "",
        dosageForm: LEAD_DOSAGE_MAP.includes(dosage as (typeof LEAD_DOSAGE_MAP)[number])
          ? (dosage as EnquiryFormValues["requirement"]["dosageForm"])
          : "OTHER",
        strength: lead.strength ?? "",
        composition: [
          {
            id: "cmp_lead",
            ingredient: lead.composition || lead.productInterest || "API",
            strength: lead.strength || "—",
            unit: "mg",
            role: "API",
            sortOrder: 0,
          },
        ],
        primaryType: "",
        secondaryType: "",
        tertiaryType: "",
        packSize: "",
        quantityUnit: "TABLETS",
        requiredQuantity: lead.requiredQuantity,
        annualQuantity: lead.annualQuantity,
        targetPrice: lead.targetPriceMinor ? lead.targetPriceMinor / 100 : undefined,
        currency: "INR",
        country: lead.country ?? "",
        market: lead.market ?? "",
        marketType: lead.leadType === "EXPORT" ? "EXPORT" : "DOMESTIC",
        artworkStatus: "ARTWORK_REQUIRED",
        specificationStatus: "SPECIFICATION_REQUIRED",
        sampleRequired: false,
        sampleStatus: "NOT_REQUIRED",
        stabilityRequired: false,
      },
    },
    actor,
  );
}

export function computeEnquiryKpis(actor: AuthenticatedUser, source?: CrmEnquiry[]): EnquiryKpis {
  const rows = visibleEnquiries(actor, source);
  const won = rows.filter((item) => item.status === "WON").length;
  const lost = rows.filter((item) => item.status === "LOST").length;
  const closed = won + lost;
  return {
    total: rows.length,
    newer: rows.filter((item) => item.status === "NEW").length,
    underReview: rows.filter((item) => item.status === "UNDER_REVIEW").length,
    technicalReview: rows.filter((item) => item.status === "TECHNICAL_REVIEW").length,
    pendingFeasibility: rows.filter((item) => item.status === "FEASIBILITY_PENDING").length,
    pendingQuotation: rows.filter((item) => item.status === "QUOTATION_PENDING" || item.status === "QUOTATION_CREATED").length,
    won,
    lost,
    onHold: rows.filter((item) => item.status === "ON_HOLD").length,
    conversionRate: closed === 0 ? 0 : Math.round((won / closed) * 100),
  };
}

export function exportEnquiriesCsv(rows: CrmEnquiry[]): string {
  const store = useEnquiryStore.getState();
  const header = ["Enquiry Number", "Customer", "Contact", "Product", "Dosage Form", "Quantity", "Priority", "Status", "Assigned User", "Received Date"];
  const lines = rows.map((row) => {
    const req = store.getRequirement(row.id);
    return [
      row.enquiryNumber,
      row.customerName,
      row.contactName,
      req?.productName ?? "",
      req?.dosageForm ?? "",
      req?.requiredQuantity ?? "",
      row.priority,
      row.status,
      row.assignedToName,
      row.receivedDate,
    ]
      .map((value) => `"${String(value).replaceAll('"', '""')}"`)
      .join(",");
  });
  return [header.join(","), ...lines].join("\n");
}

export { OPEN_ENQUIRY_STATUSES };
