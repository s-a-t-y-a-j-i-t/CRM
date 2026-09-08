import { isDemoMode } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { authorizeClient } from "@/lib/auth/authorize-client";
import { assertCan } from "@/lib/rbac/can";
import { useCrmStore } from "@/stores/crm-store";
import { useAppStore } from "@/services/store";
import type { CustomerActivityFormValues } from "@/schemas/crm";
import type { CrmCustomerActivity, CrmNote } from "@/types/crm";
import type { AuthenticatedUser } from "@/types/rbac";
import type { AuditLogEntry } from "@/types/audit";

export function listCustomerActivities(customerId: string): CrmCustomerActivity[] {
  return useCrmStore
    .getState()
    .activities.filter((item) => item.customerId === customerId)
    .sort((a, b) => b.activityDate.localeCompare(a.activityDate));
}

export function listCustomerNotes(customerId: string): CrmNote[] {
  return useCrmStore
    .getState()
    .notes.filter((item) => item.customerId === customerId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function listCustomerAudit(customerId: string): AuditLogEntry[] {
  return useAppStore
    .getState()
    .db.auditLogs.filter((entry) => entry.recordId === customerId || entry.module === "customers" || entry.module === "contacts")
    .filter((entry) => {
      if (entry.recordId === customerId) return true;
      const contactIds = useCrmStore.getState().contacts.filter((item) => item.customerId === customerId).map((item) => item.id);
      return contactIds.includes(entry.recordId);
    })
    .slice(0, 40);
}

export async function createCustomerActivity(
  customerId: string,
  values: CustomerActivityFormValues,
  actor: AuthenticatedUser,
): Promise<CrmCustomerActivity> {
  assertCan(actor, "activities.create");
  await authorizeClient("activities.create");
  if (isDemoMode()) {
    return useCrmStore.getState().addActivity(
      {
        customerId,
        contactId: values.contactId || undefined,
        type: values.type,
        subject: values.subject,
        description: values.description,
        assignedTo: values.assignedTo || actor.uid,
        assignedToName: actor.displayName,
        activityDate: values.activityDate,
        nextFollowUpDate: values.nextFollowUpDate || undefined,
        status: values.status,
      },
      actor,
    );
  }
  throw new AppError("FIREBASE_UNCONFIGURED", "Activity API is available after Firebase Admin setup.", 501);
}

export async function createCustomerNote(
  customerId: string,
  text: string,
  actor: AuthenticatedUser,
): Promise<CrmNote> {
  assertCan(actor, "customer_notes.create");
  await authorizeClient("customer_notes.create");
  if (isDemoMode()) {
    return useCrmStore.getState().addNote(customerId, text, actor);
  }
  const response = await fetch("/api/crm/notes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ customerId, text }),
  });
  const data = (await response.json().catch(() => ({}))) as { note?: CrmNote; error?: string };
  if (!response.ok || !data.note) {
    throw new AppError("INTERNAL", data.error ?? "Unable to add note.", response.status || 500);
  }
  return data.note;
}
