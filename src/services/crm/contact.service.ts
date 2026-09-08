import { isDemoMode } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { authorizeClient } from "@/lib/auth/authorize-client";
import { assertCan } from "@/lib/rbac/can";
import { useCrmStore } from "@/stores/crm-store";
import type { ContactFormValues } from "@/schemas/crm";
import type { CrmContact } from "@/types/crm";
import type { AuthenticatedUser } from "@/types/rbac";

function toPatch(values: ContactFormValues, customerId: string) {
  return {
    customerId,
    firstName: values.firstName,
    lastName: values.lastName ?? "",
    designation: values.designation || undefined,
    department: values.department || undefined,
    email: values.email || undefined,
    phone: values.phone || undefined,
    alternatePhone: values.alternatePhone || undefined,
    whatsapp: values.whatsapp || undefined,
    contactType: values.contactType,
    isPrimary: values.isPrimary,
    status: values.status,
    notes: values.notes || undefined,
  };
}

export function listContacts(customerId: string): CrmContact[] {
  return useCrmStore.getState().listContacts(customerId);
}

export function getContact(id: string): CrmContact | null {
  return useCrmStore.getState().getContact(id) ?? null;
}

export async function createContact(
  customerId: string,
  values: ContactFormValues,
  actor: AuthenticatedUser,
): Promise<CrmContact> {
  assertCan(actor, "contacts.create");
  await authorizeClient("contacts.create");
  if (isDemoMode()) {
    return useCrmStore.getState().createContact(toPatch(values, customerId), actor);
  }
  const response = await fetch("/api/crm/contacts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ customerId, ...values }),
  });
  const data = (await response.json().catch(() => ({}))) as { contact?: CrmContact; error?: string };
  if (!response.ok || !data.contact) {
    throw new AppError("INTERNAL", data.error ?? "Unable to create contact.", response.status || 500);
  }
  return data.contact;
}

export async function updateContact(
  id: string,
  values: ContactFormValues,
  actor: AuthenticatedUser,
): Promise<CrmContact> {
  assertCan(actor, "contacts.update");
  await authorizeClient("contacts.update");
  const current = getContact(id);
  if (!current) throw new AppError("NOT_FOUND", "Contact not found.", 404);
  if (isDemoMode()) {
    return useCrmStore.getState().updateContact(id, toPatch(values, current.customerId), actor);
  }
  const response = await fetch(`/api/crm/contacts/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });
  const data = (await response.json().catch(() => ({}))) as { contact?: CrmContact; error?: string };
  if (!response.ok || !data.contact) {
    throw new AppError("INTERNAL", data.error ?? "Unable to update contact.", response.status || 500);
  }
  return data.contact;
}

export async function setPrimaryContact(id: string, actor: AuthenticatedUser): Promise<CrmContact> {
  assertCan(actor, "contacts.update");
  await authorizeClient("contacts.update");
  if (isDemoMode()) {
    return useCrmStore.getState().setPrimaryContact(id, actor);
  }
  const response = await fetch(`/api/crm/contacts/${id}/primary`, { method: "POST" });
  const data = (await response.json().catch(() => ({}))) as { contact?: CrmContact; error?: string };
  if (!response.ok || !data.contact) {
    throw new AppError("INTERNAL", data.error ?? "Unable to set primary contact.", response.status || 500);
  }
  return data.contact;
}

export async function deactivateContact(id: string, actor: AuthenticatedUser): Promise<CrmContact> {
  assertCan(actor, "contacts.change_status");
  await authorizeClient("contacts.change_status");
  if (isDemoMode()) {
    return useCrmStore.getState().deactivateContact(id, actor);
  }
  const response = await fetch(`/api/crm/contacts/${id}/deactivate`, { method: "POST" });
  const data = (await response.json().catch(() => ({}))) as { contact?: CrmContact; error?: string };
  if (!response.ok || !data.contact) {
    throw new AppError("INTERNAL", data.error ?? "Unable to deactivate contact.", response.status || 500);
  }
  return data.contact;
}
