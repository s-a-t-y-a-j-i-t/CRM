import { isDemoMode } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { authorizeClient } from "@/lib/auth/authorize-client";
import { assertCan, can } from "@/lib/rbac/can";
import { DEFAULT_PAGE_SIZE } from "@/config/app";
import { toMinorUnits } from "@/lib/money";
import { useLeadStore } from "@/stores/lead-store";
import { useIdentityStore } from "@/stores/identity-store";
import { findDuplicateLeads } from "@/services/leads/duplicate.service";
import { buildLeadSearchIndex, scoreLead } from "@/services/leads/lead-code";
import { notifyLeadEvent } from "@/services/leads/lead-notify";
import { canTransition, validateTransition } from "@/services/leads/lead-workflow.service";
import { createCustomer } from "@/services/crm/customer.service";
import { createContact } from "@/services/crm/contact.service";
import { OPEN_LEAD_STATUSES } from "@/constants/leads";
import type { CustomerFormValues, ContactFormValues } from "@/schemas/crm";
import type { PaginatedResult } from "@/types/common";
import type { AuthenticatedUser } from "@/types/rbac";
import type { CrmLead, LeadDuplicateMatch, LeadKpis, LeadStatus, LostReason } from "@/types/leads";
import type { LeadConvertValues, LeadFormValues } from "@/schemas/leads";

export interface LeadListQuery {
  search?: string;
  status?: string;
  priority?: string;
  leadSource?: string;
  leadType?: string;
  assignedTo?: string;
  country?: string;
  product?: string;
  dosageForm?: string;
  createdFrom?: string;
  createdTo?: string;
  closingFrom?: string;
  closingTo?: string;
  page?: number;
  pageSize?: number;
  cursor?: string;
  sortBy?: "leadCode" | "companyName" | "createdAt" | "expectedClosingDate" | "priority" | "nextFollowUpDate" | "status";
  sortDirection?: "asc" | "desc";
}

const PRIORITY_RANK: Record<string, number> = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };

export function visibleLeads(actor: AuthenticatedUser, source?: CrmLead[]): CrmLead[] {
  const rows = source ?? useLeadStore.getState().leads;
  if (can(actor, "leads.view_all")) return rows;
  return rows.filter((lead) => lead.assignedTo === actor.uid);
}

export function assertCanAccessLead(actor: AuthenticatedUser, lead: CrmLead): void {
  assertCan(actor, "leads.view");
  if (can(actor, "leads.view_all")) return;
  if (lead.assignedTo !== actor.uid) {
    throw new AppError("FORBIDDEN", "You can only access leads assigned to you.", 403);
  }
}

function matchesSearch(lead: CrmLead, search?: string): boolean {
  if (!search?.trim()) return true;
  return lead.searchIndex.includes(search.trim().toLowerCase());
}

export function listLeads(query: LeadListQuery = {}, actor: AuthenticatedUser, source?: CrmLead[]): PaginatedResult<CrmLead> & { nextCursor?: string } {
  const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
  const direction = query.sortDirection === "asc" ? 1 : -1;
  const sortBy = query.sortBy ?? "createdAt";
  const rows = visibleLeads(actor, source)
    .filter((lead) => {
      if (query.status && lead.status !== query.status) return false;
      if (query.priority && lead.priority !== query.priority) return false;
      if (query.leadSource && lead.leadSource !== query.leadSource) return false;
      if (query.leadType && lead.leadType !== query.leadType) return false;
      if (query.assignedTo && lead.assignedTo !== query.assignedTo) return false;
      if (query.country && lead.country !== query.country) return false;
      if (query.product && !(lead.productInterest ?? "").toLowerCase().includes(query.product.toLowerCase())) return false;
      if (query.dosageForm && lead.dosageForm !== query.dosageForm) return false;
      if (query.createdFrom && lead.createdAt.slice(0, 10) < query.createdFrom) return false;
      if (query.createdTo && lead.createdAt.slice(0, 10) > query.createdTo) return false;
      if (query.closingFrom && (lead.expectedClosingDate ?? "") < query.closingFrom) return false;
      if (query.closingTo && (lead.expectedClosingDate ?? "") > query.closingTo) return false;
      return matchesSearch(lead, query.search);
    })
    .sort((a, b) => {
      if (sortBy === "priority") {
        return ((PRIORITY_RANK[a.priority] ?? 0) - (PRIORITY_RANK[b.priority] ?? 0)) * direction;
      }
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
  const hasMore = start + pageSize < rows.length;
  return {
    items,
    total: rows.length,
    page: query.page ?? (start === 0 ? 1 : Math.floor(start / pageSize) + 1),
    pageSize,
    hasMore,
    nextCursor: hasMore ? items[items.length - 1]?.id : undefined,
  };
}

export function searchLeads(search: string, actor: AuthenticatedUser): CrmLead[] {
  return listLeads({ search, pageSize: 20 }, actor).items;
}

export function getLead(id: string): CrmLead | null {
  return useLeadStore.getState().getLead(id) ?? null;
}

export function getLeadById(id: string, actor: AuthenticatedUser): CrmLead {
  const lead = getLead(id);
  if (!lead) throw new AppError("NOT_FOUND", "Lead not found.", 404);
  assertCanAccessLead(actor, lead);
  return lead;
}

export function checkDuplicateLead(
  input: Pick<CrmLead, "companyName" | "email" | "phone" | "productInterest" | "customerId">,
  ignoreId?: string,
): LeadDuplicateMatch[] {
  return findDuplicateLeads(input, useLeadStore.getState().leads, ignoreId);
}

function blankToUndefined(value?: string): string | undefined {
  return value?.trim() ? value.trim() : undefined;
}

export function formToLeadPatch(values: LeadFormValues, actor: AuthenticatedUser) {
  const owner = useIdentityStore.getState().users.find((item) => item.id === values.assignedTo);
  return {
    companyName: values.companyName,
    website: blankToUndefined(values.website),
    country: blankToUndefined(values.country),
    state: blankToUndefined(values.state),
    contactName: values.contactName,
    contactDesignation: blankToUndefined(values.contactDesignation),
    email: blankToUndefined(values.email),
    phone: blankToUndefined(values.phone),
    alternatePhone: blankToUndefined(values.alternatePhone),
    whatsapp: blankToUndefined(values.whatsapp),
    leadSource: values.leadSource,
    leadType: values.leadType || undefined,
    assignedTo: values.assignedTo,
    assignedToName: owner?.displayName ?? actor.displayName,
    priority: values.priority,
    customerId: blankToUndefined(values.customerId),
    contactId: blankToUndefined(values.contactId),
    productInterest: blankToUndefined(values.productInterest),
    dosageForm: values.dosageForm || undefined,
    strength: blankToUndefined(values.strength),
    composition: blankToUndefined(values.composition),
    requiredQuantity: values.requiredQuantity,
    annualQuantity: values.annualQuantity,
    targetPriceMinor: values.targetPrice ? toMinorUnits(values.targetPrice, "INR") : undefined,
    expectedBusinessValueMinor: toMinorUnits(values.expectedBusinessValue || 0, "INR"),
    expectedClosingDate: blankToUndefined(values.expectedClosingDate),
    nextFollowUpDate: blankToUndefined(values.nextFollowUpDate),
    description: values.description,
    notes: values.notes,
    status: values.status,
    isDemoData: false,
    createdBy: actor.uid,
    updatedBy: actor.uid,
  };
}

export async function createLead(
  values: LeadFormValues,
  actor: AuthenticatedUser,
  options?: { acknowledgeDuplicates?: boolean },
): Promise<CrmLead> {
  assertCan(actor, "leads.create");
  await authorizeClient("leads.create");
  const patch = formToLeadPatch({ ...values, status: "NEW" }, actor);
  const duplicates = checkDuplicateLead(patch);
  if (duplicates.length > 0 && !options?.acknowledgeDuplicates) {
    throw new AppError("CONFLICT", "Potential duplicate lead found.", 409);
  }
  if (isDemoMode()) {
    const created = useLeadStore.getState().createLead(patch, actor);
    await notifyLeadEvent({
      kind: "lead_assigned",
      title: "Lead assigned",
      body: `${created.leadCode} · ${created.companyName}`,
      href: `/crm/leads/${created.id}`,
      recipientId: created.assignedTo,
      leadId: created.id,
      actor,
    });
    return created;
  }
  const response = await fetch("/api/crm/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...values, acknowledgeDuplicates: options?.acknowledgeDuplicates }),
  });
  const data = (await response.json().catch(() => ({}))) as { lead?: CrmLead; error?: string };
  if (!response.ok || !data.lead) {
    throw new AppError("INTERNAL", data.error ?? "Unable to create lead.", response.status || 500);
  }
  return data.lead;
}

export async function updateLead(id: string, values: LeadFormValues, actor: AuthenticatedUser): Promise<CrmLead> {
  assertCan(actor, "leads.update");
  await authorizeClient("leads.update");
  const current = getLeadById(id, actor);
  if (isDemoMode()) {
    return useLeadStore.getState().updateLead(id, { ...formToLeadPatch({ ...values, status: current.status }, actor), status: current.status }, actor);
  }
  const response = await fetch(`/api/crm/leads/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });
  const data = (await response.json().catch(() => ({}))) as { lead?: CrmLead; error?: string };
  if (!response.ok || !data.lead) {
    throw new AppError("INTERNAL", data.error ?? "Unable to update lead.", response.status || 500);
  }
  return data.lead;
}

export async function assignLead(id: string, assignedTo: string, actor: AuthenticatedUser): Promise<CrmLead> {
  assertCan(actor, "leads.assign");
  await authorizeClient("leads.assign");
  const current = getLeadById(id, actor);
  const owner = useIdentityStore.getState().users.find((item) => item.id === assignedTo);
  if (!owner) throw new AppError("VALIDATION", "Assigned sales person was not found.", 400);
  if (isDemoMode()) {
    const next = useLeadStore.getState().assignLead(id, assignedTo, owner.displayName, actor);
    await notifyLeadEvent({
      kind: current.assignedTo === assignedTo ? "lead_assigned" : "lead_reassigned",
      title: current.assignedTo === assignedTo ? "Lead assigned" : "Lead reassigned",
      body: `${next.leadCode} · ${next.companyName} is now assigned to ${owner.displayName}.`,
      href: `/crm/leads/${next.id}`,
      recipientId: assignedTo,
      leadId: next.id,
      actor,
    });
    return next;
  }
  const response = await fetch(`/api/crm/leads/${id}/assign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assignedTo }),
  });
  const data = (await response.json().catch(() => ({}))) as { lead?: CrmLead; error?: string };
  if (!response.ok || !data.lead) {
    throw new AppError("INTERNAL", data.error ?? "Unable to assign lead.", response.status || 500);
  }
  return data.lead;
}

export async function changeLeadStatus(
  id: string,
  status: LeadStatus,
  actor: AuthenticatedUser,
  extras?: { lostReason?: LostReason; lostNotes?: string },
): Promise<CrmLead> {
  assertCan(actor, "leads.change_status");
  await authorizeClient("leads.change_status");
  const current = getLeadById(id, actor);
  if (status === "WON") {
    throw new AppError("VALIDATION", "Use the conversion workflow to mark a lead as won.", 400);
  }
  validateTransition(current.status, status);
  if (isDemoMode()) {
    const next = useLeadStore.getState().changeStatus(id, status, actor, extras);
    if (status !== current.status) {
      await notifyLeadEvent({
        kind: "lead_status_changed",
        title: "Lead status changed",
        body: `${next.leadCode} moved from ${current.status} to ${status}.`,
        href: `/crm/leads/${next.id}`,
        recipientId: next.assignedTo,
        leadId: next.id,
        actor,
      });
    }
    return next;
  }
  const response = await fetch(`/api/crm/leads/${id}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, ...extras }),
  });
  const data = (await response.json().catch(() => ({}))) as { lead?: CrmLead; error?: string };
  if (!response.ok || !data.lead) {
    throw new AppError("INTERNAL", data.error ?? "Unable to change lead status.", response.status || 500);
  }
  return data.lead;
}

export async function markLeadLost(id: string, lostReason: LostReason, lostNotes: string | undefined, actor: AuthenticatedUser): Promise<CrmLead> {
  return changeLeadStatus(id, "LOST", actor, { lostReason, lostNotes });
}

export async function reactivateLead(id: string, actor: AuthenticatedUser): Promise<CrmLead> {
  assertCan(actor, "leads.change_status");
  await authorizeClient("leads.change_status");
  getLeadById(id, actor);
  if (isDemoMode()) {
    return useLeadStore.getState().reactivate(id, actor);
  }
  const response = await fetch(`/api/crm/leads/${id}/reactivate`, { method: "POST" });
  const data = (await response.json().catch(() => ({}))) as { lead?: CrmLead; error?: string };
  if (!response.ok || !data.lead) {
    throw new AppError("INTERNAL", data.error ?? "Unable to reactivate lead.", response.status || 500);
  }
  return data.lead;
}

export async function convertLead(id: string, values: LeadConvertValues, actor: AuthenticatedUser): Promise<CrmLead> {
  assertCan(actor, "leads.convert");
  await authorizeClient("leads.convert");
  const current = getLeadById(id, actor);
  if (current.convertedEnquiryId) {
    throw new AppError("CONFLICT", "This lead has already been converted.", 409);
  }

  let customerId = values.customerId || current.customerId;
  if (values.customerMode === "existing") {
    if (!customerId) throw new AppError("VALIDATION", "Select an existing customer.", 400);
  } else {
    assertCan(actor, "customers.create");
    const customerValues: CustomerFormValues = {
      companyName: current.companyName,
      legalName: "",
      shortName: "",
      customerType:
        current.leadType === "EXPORT"
          ? "EXPORT_CUSTOMER"
          : current.leadType === "DISTRIBUTOR"
            ? "DISTRIBUTOR"
            : current.leadType === "INSTITUTIONAL"
              ? "INSTITUTIONAL_CUSTOMER"
              : "PHARMACEUTICAL_COMPANY",
      customerCategory: current.leadType === "EXPORT" ? "EXPORT" : "DOMESTIC",
      website: current.website ?? "",
      primaryEmail: current.email ?? "",
      primaryPhone: current.phone ?? "",
      alternatePhone: current.alternatePhone ?? "",
      billingAddress: "",
      shippingAddress: "",
      sameAsBilling: true,
      city: "",
      state: current.state ?? "",
      country: current.country ?? "India",
      postalCode: "",
      gstin: "",
      pan: "",
      drugLicenseNumber: "",
      licenseExpiryDate: "",
      paymentTerms: "NET_30",
      creditLimit: 0,
      currency: "INR",
      assignedSalesPersonId: current.assignedTo,
      customerSince: "",
      notes: current.description,
      status: "PROSPECT",
    };
    const created = await createCustomer(customerValues, actor, { acknowledgeDuplicates: true });
    customerId = created.id;
  }

  if (!customerId) {
    throw new AppError("VALIDATION", "A customer is required to convert this lead.", 400);
  }

  let contactId = values.contactId || current.contactId;
  if (values.contactMode === "existing") {
    if (!contactId) throw new AppError("VALIDATION", "Select an existing contact.", 400);
  } else {
    assertCan(actor, "contacts.create");
    const [firstName, ...rest] = current.contactName.split(" ");
    const contactValues: ContactFormValues = {
      firstName: firstName || current.contactName,
      lastName: rest.join(" "),
      designation: current.contactDesignation ?? "",
      department: "",
      email: current.email ?? "",
      phone: current.phone ?? "",
      alternatePhone: current.alternatePhone ?? "",
      whatsapp: current.whatsapp ?? "",
      contactType: "GENERAL",
      isPrimary: true,
      status: "ACTIVE",
      notes: "",
    };
    const created = await createContact(customerId, contactValues, actor);
    contactId = created.id;
  }

  let enquiryId = current.convertedEnquiryId;
  if (values.createEnquiry) {
    const { createEnquiryFromLead } = await import("@/services/enquiries/enquiry.service");
    const enquiry = await createEnquiryFromLead(current, customerId, contactId, actor);
    enquiryId = enquiry.id;
  }

  if (isDemoMode()) {
    const next = useLeadStore.getState().convertLead(id, customerId, enquiryId, actor);
    await notifyLeadEvent({
      kind: "lead_converted",
      title: "Lead converted",
      body: `${next.leadCode} converted to customer ${customerId}.`,
      href: `/crm/customers/${customerId}`,
      recipientId: next.assignedTo,
      leadId: next.id,
      actor,
    });
    return next;
  }

  const response = await fetch(`/api/crm/leads/${id}/convert`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...values, customerId, contactId, enquiryId }),
  });
  const data = (await response.json().catch(() => ({}))) as { lead?: CrmLead; error?: string };
  if (!response.ok || !data.lead) {
    throw new AppError("INTERNAL", data.error ?? "Unable to convert lead.", response.status || 500);
  }
  return data.lead;
}

export function computeLeadKpis(actor: AuthenticatedUser, source?: CrmLead[]): LeadKpis {
  const rows = visibleLeads(actor, source);
  const newer = rows.filter((item) => item.status === "NEW").length;
  const qualified = rows.filter((item) => item.status === "QUALIFIED").length;
  const open = rows.filter((item) => OPEN_LEAD_STATUSES.includes(item.status));
  const won = rows.filter((item) => item.status === "WON");
  const lost = rows.filter((item) => item.status === "LOST");
  const closed = won.length + lost.length;
  return {
    total: rows.length,
    newer,
    qualified,
    open: open.length,
    won: won.length,
    lost: lost.length,
    conversionRate: closed === 0 ? 0 : Math.round((won.length / closed) * 100),
    expectedValueMinor: rows.reduce((sum, item) => sum + (item.expectedBusinessValueMinor || 0), 0),
    openPipelineMinor: open.reduce((sum, item) => sum + (item.expectedBusinessValueMinor || 0), 0),
    wonValueMinor: won.reduce((sum, item) => sum + (item.expectedBusinessValueMinor || 0), 0),
    lostValueMinor: lost.reduce((sum, item) => sum + (item.expectedBusinessValueMinor || 0), 0),
  };
}

export function exportLeadsCsv(rows: CrmLead[]): string {
  const header = [
    "Lead Code",
    "Company",
    "Contact",
    "Email",
    "Phone",
    "Product Interest",
    "Source",
    "Type",
    "Assigned To",
    "Priority",
    "Status",
    "Expected Value",
    "Next Follow-up",
    "Created Date",
  ];
  const lines = rows.map((row) =>
    [
      row.leadCode,
      row.companyName,
      row.contactName,
      row.email ?? "",
      row.phone ?? "",
      row.productInterest ?? "",
      row.leadSource,
      row.leadType ?? "",
      row.assignedToName,
      row.priority,
      row.status,
      (row.expectedBusinessValueMinor / 100).toFixed(2),
      row.nextFollowUpDate ?? "",
      row.createdAt.slice(0, 10),
    ]
      .map((value) => `"${String(value).replaceAll('"', '""')}"`)
      .join(","),
  );
  return [header.join(","), ...lines].join("\n");
}

export function leadToSearchDocument(lead: CrmLead) {
  return {
    id: lead.id,
    searchIndex: buildLeadSearchIndex(lead),
    score: scoreLead(lead),
  };
}

export { canTransition };
