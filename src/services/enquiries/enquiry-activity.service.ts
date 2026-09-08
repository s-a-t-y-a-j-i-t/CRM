import { isDemoMode } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { authorizeClient } from "@/lib/auth/authorize-client";
import { assertCan } from "@/lib/rbac/can";
import { isPastDate, todayIso } from "@/lib/dates";
import { useEnquiryStore } from "@/stores/enquiry-store";
import { useAppStore } from "@/services/store";
import { getEnquiryById } from "@/services/enquiries/enquiry.service";
import { notifyEnquiryEvent } from "@/services/enquiries/enquiry-notify";
import type { EnquiryActivityFormValues, EnquiryFollowUpFormValues } from "@/schemas/enquiries";
import type { AuthenticatedUser } from "@/types/rbac";
import type { AuditLogEntry } from "@/types/audit";
import type { EnquiryActivity, EnquiryFollowUp, EnquiryFollowUpStatus } from "@/types/enquiries";

export function listEnquiryActivities(enquiryId: string): EnquiryActivity[] {
  return useEnquiryStore
    .getState()
    .activities.filter((item) => item.enquiryId === enquiryId)
    .sort((a, b) => b.activityDate.localeCompare(a.activityDate));
}

export function listEnquiryFollowUps(enquiryId?: string): EnquiryFollowUp[] {
  return useEnquiryStore
    .getState()
    .followUps.filter((item) => !enquiryId || item.enquiryId === enquiryId)
    .sort((a, b) => a.followUpAt.localeCompare(b.followUpAt));
}

export function listEnquiryAudit(enquiryId: string): AuditLogEntry[] {
  return useAppStore
    .getState()
    .db.auditLogs.filter((entry) => entry.recordId === enquiryId || entry.module === "enquiries" || entry.module === "product_requirements")
    .filter((entry) => entry.recordId === enquiryId)
    .slice(0, 50);
}

export function classifyFollowUp(item: EnquiryFollowUp): "today" | "upcoming" | "overdue" | "done" {
  if (item.status === "COMPLETED" || item.status === "CANCELLED") return "done";
  const day = item.followUpAt.slice(0, 10);
  if (item.status === "MISSED" || isPastDate(day)) return "overdue";
  if (day === todayIso()) return "today";
  return "upcoming";
}

export async function createEnquiryActivity(
  enquiryId: string,
  values: EnquiryActivityFormValues,
  actor: AuthenticatedUser,
): Promise<EnquiryActivity> {
  assertCan(actor, "activities.create");
  await authorizeClient("activities.create");
  const enquiry = getEnquiryById(enquiryId, actor);
  if (!isDemoMode()) {
    throw new AppError("FIREBASE_UNCONFIGURED", "Enquiry activity API is available after Firebase Admin setup.", 501);
  }
  return useEnquiryStore.getState().addActivity(
    {
      enquiryId,
      customerId: enquiry.customerId,
      contactId: enquiry.contactId,
      type: values.type,
      subject: values.subject,
      description: values.description,
      assignedTo: actor.uid,
      activityDate: values.activityDate,
      nextFollowUpDate: values.nextFollowUpDate || undefined,
      status: "COMPLETED",
    },
    actor,
  );
}

export async function createEnquiryFollowUp(
  enquiryId: string,
  values: EnquiryFollowUpFormValues,
  actor: AuthenticatedUser,
): Promise<EnquiryFollowUp> {
  assertCan(actor, "activities.create");
  await authorizeClient("activities.create");
  getEnquiryById(enquiryId, actor);
  if (!isDemoMode()) {
    throw new AppError("FIREBASE_UNCONFIGURED", "Follow-up API is available after Firebase Admin setup.", 501);
  }
  const followUp = useEnquiryStore.getState().addFollowUp(
    {
      enquiryId,
      followUpAt: values.followUpAt,
      assignedTo: values.assignedTo,
      assignedToName: actor.displayName,
      purpose: values.purpose,
      notes: values.notes,
      priority: values.priority,
      status: values.status,
    },
    actor,
  );
  const bucket = classifyFollowUp(followUp);
  if (bucket === "today" || bucket === "overdue") {
    await notifyEnquiryEvent({
      kind: bucket === "overdue" ? "follow_up_overdue" : "follow_up_due",
      title: bucket === "overdue" ? "Follow-up overdue" : "Follow-up due",
      body: followUp.purpose,
      href: `/crm/enquiries/${enquiryId}`,
      recipientId: followUp.assignedTo,
      enquiryId,
      actor,
    });
  }
  return followUp;
}

export async function completeEnquiryFollowUp(id: string, actor: AuthenticatedUser): Promise<EnquiryFollowUp> {
  assertCan(actor, "activities.update");
  await authorizeClient("activities.update");
  return useEnquiryStore.getState().updateFollowUp(id, { status: "COMPLETED" as EnquiryFollowUpStatus }, actor);
}
