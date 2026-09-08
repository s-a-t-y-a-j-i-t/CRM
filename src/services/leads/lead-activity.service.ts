import { isDemoMode } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { authorizeClient } from "@/lib/auth/authorize-client";
import { assertCan } from "@/lib/rbac/can";
import { isPastDate, todayIso } from "@/lib/dates";
import { useLeadStore } from "@/stores/lead-store";
import { useAppStore } from "@/services/store";
import { getLeadById } from "@/services/leads/lead.service";
import { notifyLeadEvent } from "@/services/leads/lead-notify";
import { INACTIVE_LEAD_DAYS } from "@/constants/leads";
import type { LeadActivityFormValues, LeadFollowUpFormValues } from "@/schemas/leads";
import type { AuthenticatedUser } from "@/types/rbac";
import type { AuditLogEntry } from "@/types/audit";
import type { FollowUpStatus, LeadActivity, LeadFollowUp, LeadNote } from "@/types/leads";

export function listLeadActivities(leadId: string): LeadActivity[] {
  return useLeadStore
    .getState()
    .activities.filter((item) => item.leadId === leadId)
    .sort((a, b) => b.activityDate.localeCompare(a.activityDate));
}

export function listLeadNotes(leadId: string): LeadNote[] {
  return useLeadStore
    .getState()
    .notes.filter((item) => item.leadId === leadId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function listLeadFollowUps(leadId?: string): LeadFollowUp[] {
  return useLeadStore
    .getState()
    .followUps.filter((item) => !leadId || item.leadId === leadId)
    .sort((a, b) => a.followUpAt.localeCompare(b.followUpAt));
}

export function listLeadAudit(leadId: string): AuditLogEntry[] {
  return useAppStore
    .getState()
    .db.auditLogs.filter((entry) => entry.recordId === leadId || entry.module === "leads")
    .filter((entry) => entry.recordId === leadId)
    .slice(0, 50);
}

export function classifyFollowUp(item: LeadFollowUp): "today" | "upcoming" | "overdue" | "done" {
  if (item.status === "COMPLETED" || item.status === "CANCELLED") return "done";
  const day = item.followUpAt.slice(0, 10);
  const today = todayIso();
  if (item.status === "MISSED" || isPastDate(day)) return "overdue";
  if (day === today) return "today";
  return "upcoming";
}

export async function createLeadActivity(
  leadId: string,
  values: LeadActivityFormValues,
  actor: AuthenticatedUser,
): Promise<LeadActivity> {
  assertCan(actor, "activities.create");
  await authorizeClient("activities.create");
  const lead = getLeadById(leadId, actor);
  if (isDemoMode()) {
    return useLeadStore.getState().addActivity(
      {
        leadId,
        customerId: lead.customerId,
        contactId: lead.contactId,
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
  throw new AppError("FIREBASE_UNCONFIGURED", "Lead activity API is available after Firebase Admin setup.", 501);
}

export async function createLeadNote(leadId: string, text: string, actor: AuthenticatedUser): Promise<LeadNote> {
  assertCan(actor, "leads.update");
  await authorizeClient("leads.update");
  getLeadById(leadId, actor);
  if (isDemoMode()) {
    return useLeadStore.getState().addNote(leadId, text, actor);
  }
  const response = await fetch("/api/crm/leads/notes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ leadId, text }),
  });
  const data = (await response.json().catch(() => ({}))) as { note?: LeadNote; error?: string };
  if (!response.ok || !data.note) {
    throw new AppError("INTERNAL", data.error ?? "Unable to add note.", response.status || 500);
  }
  return data.note;
}

export async function createLeadFollowUp(
  leadId: string,
  values: LeadFollowUpFormValues,
  actor: AuthenticatedUser,
): Promise<LeadFollowUp> {
  assertCan(actor, "activities.create");
  await authorizeClient("activities.create");
  getLeadById(leadId, actor);
  const owner = values.assignedTo;
  if (isDemoMode()) {
    const followUp = useLeadStore.getState().addFollowUp(
      {
        leadId,
        followUpAt: values.followUpAt,
        assignedTo: owner,
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
      await notifyLeadEvent({
        kind: bucket === "overdue" ? "follow_up_overdue" : "follow_up_due",
        title: bucket === "overdue" ? "Follow-up overdue" : "Follow-up due",
        body: `${followUp.purpose} · ${followUp.followUpAt.slice(0, 10)}`,
        href: `/crm/leads/${leadId}`,
        recipientId: followUp.assignedTo,
        leadId,
        actor,
      });
    }
    return followUp;
  }
  throw new AppError("FIREBASE_UNCONFIGURED", "Follow-up API is available after Firebase Admin setup.", 501);
}

export async function completeLeadFollowUp(id: string, actor: AuthenticatedUser): Promise<LeadFollowUp> {
  assertCan(actor, "activities.update");
  await authorizeClient("activities.update");
  if (isDemoMode()) {
    return useLeadStore.getState().updateFollowUp(id, { status: "COMPLETED" }, actor);
  }
  throw new AppError("FIREBASE_UNCONFIGURED", "Follow-up API is available after Firebase Admin setup.", 501);
}

export async function updateLeadFollowUpStatus(
  id: string,
  status: FollowUpStatus,
  actor: AuthenticatedUser,
): Promise<LeadFollowUp> {
  assertCan(actor, "activities.update");
  await authorizeClient("activities.update");
  if (isDemoMode()) {
    return useLeadStore.getState().updateFollowUp(id, { status }, actor);
  }
  throw new AppError("FIREBASE_UNCONFIGURED", "Follow-up API is available after Firebase Admin setup.", 501);
}

export async function refreshLeadReminders(actor: AuthenticatedUser): Promise<void> {
  const followUps = listLeadFollowUps();
  for (const item of followUps) {
    const bucket = classifyFollowUp(item);
    if (bucket === "overdue" || bucket === "today") {
      await notifyLeadEvent({
        kind: bucket === "overdue" ? "follow_up_overdue" : "follow_up_due",
        title: bucket === "overdue" ? "Follow-up overdue" : "Follow-up due",
        body: item.purpose,
        href: `/crm/leads/${item.leadId}`,
        recipientId: item.assignedTo,
        leadId: item.leadId,
        actor,
      });
    }
  }
  const cutoff = Date.now() - INACTIVE_LEAD_DAYS * 86_400_000;
  for (const lead of useLeadStore.getState().leads) {
    if (lead.status === "WON" || lead.status === "LOST") continue;
    if (new Date(lead.updatedAt).getTime() < cutoff) {
      await notifyLeadEvent({
        kind: "follow_up_overdue",
        title: "Lead inactive",
        body: `${lead.leadCode} has had no activity for ${INACTIVE_LEAD_DAYS} days.`,
        href: `/crm/leads/${lead.id}`,
        recipientId: lead.assignedTo,
        leadId: lead.id,
        actor,
      });
    }
  }
}
