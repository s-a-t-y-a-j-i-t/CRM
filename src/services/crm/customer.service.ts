import { isDemoMode } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { authorizeClient } from "@/lib/auth/authorize-client";
import { assertCan } from "@/lib/rbac/can";
import { BLOCKED_ROLES } from "@/constants/customers";
import { DEFAULT_PAGE_SIZE } from "@/config/app";
import { useCrmStore } from "@/stores/crm-store";
import { findDuplicateCustomers } from "@/services/crm/duplicate.service";
import { toMinorUnits } from "@/lib/money";
import { useIdentityStore } from "@/stores/identity-store";
import type { PaginatedResult } from "@/types/common";
import type { CrmCustomer, CustomerStatus, DuplicateMatch } from "@/types/crm";
import type { AuthenticatedUser } from "@/types/rbac";
import type { CustomerFormValues } from "@/schemas/crm";

export interface CustomerListQuery {
  search?: string;
  customerType?: string;
  customerCategory?: string;
  status?: string;
  country?: string;
  state?: string;
  assignedSalesPersonId?: string;
  createdFrom?: string;
  createdTo?: string;
  page?: number;
  pageSize?: number;
  sortBy?: "companyName" | "createdAt" | "customerCode" | "status";
  sortDirection?: "asc" | "desc";
  includeArchived?: boolean;
}

function matchesSearch(customer: CrmCustomer, search?: string): boolean {
  if (!search?.trim()) return true;
  return customer.searchIndex.includes(search.trim().toLowerCase());
}

export function listCustomers(
  query: CustomerListQuery = {},
  source?: CrmCustomer[],
): PaginatedResult<CrmCustomer> {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
  const direction = query.sortDirection === "asc" ? 1 : -1;
  const sortBy = query.sortBy ?? "createdAt";
  const rows = (source ?? useCrmStore.getState().customers)
    .filter((customer) => {
      if (!query.includeArchived && customer.isArchived) return false;
      if (query.customerType && customer.customerType !== query.customerType) return false;
      if (query.customerCategory && customer.customerCategory !== query.customerCategory) return false;
      if (query.status && customer.status !== query.status) return false;
      if (query.country && customer.country !== query.country) return false;
      if (query.state && customer.state !== query.state) return false;
      if (query.assignedSalesPersonId && customer.assignedSalesPersonId !== query.assignedSalesPersonId) return false;
      if (query.createdFrom && customer.createdAt.slice(0, 10) < query.createdFrom) return false;
      if (query.createdTo && customer.createdAt.slice(0, 10) > query.createdTo) return false;
      return matchesSearch(customer, query.search);
    })
    .sort((a, b) => String(a[sortBy] ?? "").localeCompare(String(b[sortBy] ?? "")) * direction);

  const start = (page - 1) * pageSize;
  return {
    items: rows.slice(start, start + pageSize),
    total: rows.length,
    page,
    pageSize,
    hasMore: start + pageSize < rows.length,
  };
}

export function getCustomerById(id: string): CrmCustomer | null {
  return useCrmStore.getState().getCustomer(id) ?? null;
}

export function checkDuplicateCustomer(
  input: Pick<CrmCustomer, "companyName" | "gstin" | "pan" | "primaryEmail" | "primaryPhone">,
  ignoreId?: string,
): DuplicateMatch[] {
  return findDuplicateCustomers(input, useCrmStore.getState().customers, ignoreId);
}

export function formToCustomerPatch(values: CustomerFormValues, actor: AuthenticatedUser) {
  const shipping = values.sameAsBilling ? values.billingAddress : values.shippingAddress;
  return {
    companyName: values.companyName,
    legalName: values.legalName || undefined,
    shortName: values.shortName || undefined,
    customerType: values.customerType,
    customerCategory: values.customerCategory || undefined,
    website: values.website || undefined,
    primaryEmail: values.primaryEmail || undefined,
    primaryPhone: values.primaryPhone || undefined,
    alternatePhone: values.alternatePhone || undefined,
    billingAddress: values.billingAddress || undefined,
    shippingAddress: shipping || undefined,
    city: values.city || undefined,
    state: values.state || undefined,
    country: values.country || undefined,
    postalCode: values.postalCode || undefined,
    gstin: values.gstin?.toUpperCase() || undefined,
    pan: values.pan?.toUpperCase() || undefined,
    drugLicenseNumber: values.drugLicenseNumber || undefined,
    licenseExpiryDate: values.licenseExpiryDate || undefined,
    paymentTerms: values.paymentTerms || undefined,
    creditLimitMinor: toMinorUnits(values.creditLimit, values.currency),
    currency: values.currency,
    assignedSalesPersonId: values.assignedSalesPersonId || undefined,
    customerSince: values.customerSince || undefined,
    notes: values.notes || undefined,
    status: values.status,
    isDemoData: false,
    assignedSalesPersonName: values.assignedSalesPersonId
      ? useIdentityStore.getState().users.find((item) => item.id === values.assignedSalesPersonId)?.displayName
      : undefined,
    createdBy: actor.uid,
    updatedBy: actor.uid,
  };
}

export async function createCustomer(
  values: CustomerFormValues,
  actor: AuthenticatedUser,
  options?: { acknowledgeDuplicates?: boolean },
): Promise<CrmCustomer> {
  assertCan(actor, "customers.create");
  await authorizeClient("customers.create");
  const duplicates = checkDuplicateCustomer(values);
  if (duplicates.length > 0 && !options?.acknowledgeDuplicates) {
    throw new AppError("CONFLICT", "Possible duplicate customer found.", 409);
  }
  if (isDemoMode()) {
    return useCrmStore.getState().createCustomer(formToCustomerPatch(values, actor), actor);
  }
  const response = await fetch("/api/crm/customers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...values, acknowledgeDuplicates: options?.acknowledgeDuplicates }),
  });
  const data = (await response.json().catch(() => ({}))) as { customer?: CrmCustomer; error?: string };
  if (!response.ok || !data.customer) {
    throw new AppError("INTERNAL", data.error ?? "Unable to create customer.", response.status || 500);
  }
  return data.customer;
}

export async function updateCustomer(
  id: string,
  values: CustomerFormValues,
  actor: AuthenticatedUser,
): Promise<CrmCustomer> {
  assertCan(actor, "customers.update");
  await authorizeClient("customers.update");
  if (isDemoMode()) {
    return useCrmStore.getState().updateCustomer(id, formToCustomerPatch(values, actor), actor);
  }
  const response = await fetch(`/api/crm/customers/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });
  const data = (await response.json().catch(() => ({}))) as { customer?: CrmCustomer; error?: string };
  if (!response.ok || !data.customer) {
    throw new AppError("INTERNAL", data.error ?? "Unable to update customer.", response.status || 500);
  }
  return data.customer;
}

export async function updateCustomerStatus(
  id: string,
  status: CustomerStatus,
  actor: AuthenticatedUser,
): Promise<CrmCustomer> {
  assertCan(actor, "customers.change_status");
  await authorizeClient("customers.change_status");
  if (status === "BLOCKED" && !BLOCKED_ROLES.has(String(actor.role))) {
    throw new AppError("FORBIDDEN", "Only commercial leadership can block a customer.", 403);
  }
  if (isDemoMode()) {
    return useCrmStore.getState().updateCustomerStatus(id, status, actor);
  }
  const response = await fetch(`/api/crm/customers/${id}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  const data = (await response.json().catch(() => ({}))) as { customer?: CrmCustomer; error?: string };
  if (!response.ok || !data.customer) {
    throw new AppError("INTERNAL", data.error ?? "Unable to change status.", response.status || 500);
  }
  return data.customer;
}

export async function archiveCustomer(id: string, actor: AuthenticatedUser): Promise<CrmCustomer> {
  assertCan(actor, "customers.delete");
  await authorizeClient("customers.delete");
  if (isDemoMode()) {
    return useCrmStore.getState().archiveCustomer(id, actor);
  }
  return updateCustomerStatus(id, "INACTIVE", actor);
}

export function exportCustomersCsv(rows: CrmCustomer[]): string {
  const header = [
    "Customer Code",
    "Company Name",
    "Type",
    "Status",
    "Email",
    "Phone",
    "GSTIN",
    "City",
    "Country",
    "Sales Person",
  ];
  const lines = rows.map((row) =>
    [
      row.customerCode,
      row.companyName,
      row.customerType,
      row.status,
      row.primaryEmail ?? "",
      row.primaryPhone ?? "",
      row.gstin ?? "",
      row.city ?? "",
      row.country ?? "",
      row.assignedSalesPersonName ?? "",
    ]
      .map((value) => `"${String(value).replaceAll('"', '""')}"`)
      .join(","),
  );
  return [header.join(","), ...lines].join("\n");
}

export function emptyCustomerKpis() {
  return {
    totalEnquiries: 0,
    totalQuotations: 0,
    totalOrders: 0,
    totalRevenueMinor: 0,
    outstandingMinor: 0,
    openComplaints: 0,
    activeProducts: 0,
  };
}
