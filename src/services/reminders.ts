import { isPastDate } from "@/lib/dates";
import { roleHas } from "@/lib/rbac/catalog";
import type { Activity, AppNotification, NotificationKind } from "@/types/activity";
import type { AuthenticatedUser } from "@/types/rbac";
import type { Complaint } from "@/types/quality";
import type { Invoice } from "@/types/finance";
import type { ControlledDocument } from "@/types/quality";
import type { ManufacturingOrder, Quotation } from "@/types/entities";

function visibleToUser(notification: AppNotification, user: AuthenticatedUser): boolean {
  if (notification.recipientUserIds.includes(user.uid)) {
    return true;
  }
  return notification.audienceRoles.includes(user.role);
}

export function filterNotificationsForUser(
  notifications: AppNotification[],
  user: AuthenticatedUser,
): AppNotification[] {
  return notifications.filter((notification) => visibleToUser(notification, user));
}

export function canSeeKind(user: AuthenticatedUser, kind: NotificationKind): boolean {
  const map: Record<NotificationKind, import("@/types/rbac").PermissionKey> = {
    follow_up_due: "activities.view",
    follow_up_overdue: "activities.view",
    quotation_expiry: "quotations.view",
    payment_overdue: "receivables.view",
    document_expiry: "documents.view",
    complaint_pending: "complaints.view",
    order_delay: "manufacturing.view",
    lead_assigned: "leads.view",
    lead_reassigned: "leads.view",
    lead_converted: "leads.view",
    lead_status_changed: "leads.view",
    enquiry_assigned: "enquiries.view",
    enquiry_reassigned: "enquiries.view",
    enquiry_status_changed: "enquiries.view",
    technical_review_started: "enquiries.view",
    requirement_updated: "product_requirements.view",
    document_uploaded: "enquiry_documents.view",
    feasibility_assigned: "feasibility.view",
    department_review_assigned: "feasibility.review",
    clarification_requested: "feasibility.view",
    clarification_responded: "feasibility.review",
    review_completed: "feasibility.view",
    approval_pending: "feasibility.approve",
    final_decision_made: "feasibility.view",
    feasibility_overdue: "feasibility.view",
    costing_assigned: "costing.view",
    costing_completed: "costing.view",
    costing_approval_requested: "costing.review",
    costing_approved: "costing.view",
    costing_rejected: "costing.view",
    costing_version_created: "costing.view",
    costing_expiring: "costing.view",
    quotation_assigned: "quotations.view",
    quotation_submitted: "quotations.view",
    quotation_approval_requested: "quotations.review",
    quotation_approved: "quotations.view",
    quotation_rejected: "quotations.view",
    quotation_revised: "quotations.view",
    quotation_sent: "quotations.view",
    quotation_accepted: "quotations.view",
    quotation_customer_rejected: "quotations.view",
    quotation_expiring: "quotations.view",
  };
  return roleHas(user.role, map[kind]);
}

export function buildOperationalReminders(input: {
  activities: Activity[];
  quotations: Quotation[];
  invoices: Invoice[];
  documents: ControlledDocument[];
  complaints: Complaint[];
  manufacturingOrders: ManufacturingOrder[];
  now?: Date;
}): Omit<AppNotification, "id" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy" | "status">[] {
  const reminders: Omit<AppNotification, "id" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy" | "status">[] = [];

  for (const activity of input.activities) {
    if (activity.activityStatus === "completed" || activity.activityStatus === "cancelled") continue;
    if (activity.dueAt && isPastDate(activity.dueAt)) {
      reminders.push({
        kind: "follow_up_overdue",
        title: "Follow-up overdue",
        body: activity.subject,
        href: "/crm/activities",
        recipientUserIds: [activity.assignedUserId],
        audienceRoles: ["sales_manager", "sales_executive"],
        readBy: [],
        relatedType: "activity",
        relatedId: activity.id,
        dueAt: activity.dueAt,
      });
    }
  }

  for (const quotation of input.quotations) {
    if (quotation.stage === "accepted" || quotation.stage === "rejected") continue;
    if (isPastDate(quotation.validUntil) || quotation.stage === "expired") {
      reminders.push({
        kind: "quotation_expiry",
        title: "Quotation expired or expiring",
        body: `${quotation.quotationNumber} validity ${quotation.validUntil}`,
        href: "/bd/quotations",
        recipientUserIds: [],
        audienceRoles: ["business_development", "sales_manager"],
        readBy: [],
        relatedType: "quotation",
        relatedId: quotation.id,
        dueAt: quotation.validUntil,
      });
    }
  }

  for (const invoice of input.invoices) {
    if (invoice.invoiceStatus === "overdue") {
      reminders.push({
        kind: "payment_overdue",
        title: "Payment overdue",
        body: `${invoice.invoiceNumber} outstanding requires collection.`,
        href: "/finance/receivables",
        recipientUserIds: [],
        audienceRoles: ["finance", "sales_manager"],
        readBy: [],
        relatedType: "invoice",
        relatedId: invoice.id,
        dueAt: invoice.dueDate,
      });
    }
  }

  for (const document of input.documents) {
    if (document.expiryDate && isPastDate(document.expiryDate)) {
      reminders.push({
        kind: "document_expiry",
        title: "Controlled document expired",
        body: `${document.name} expired on ${document.expiryDate}`,
        href: "/quality/documents",
        recipientUserIds: [],
        audienceRoles: ["quality_assurance", "regulatory"],
        readBy: [],
        relatedType: "document",
        relatedId: document.id,
        dueAt: document.expiryDate,
      });
    }
  }

  for (const complaint of input.complaints) {
    if (!["resolved", "closed"].includes(complaint.investigationStatus)) {
      reminders.push({
        kind: "complaint_pending",
        title: "Complaint pending",
        body: `${complaint.complaintNumber} is in ${complaint.investigationStatus}.`,
        href: "/quality/complaints",
        recipientUserIds: [complaint.receivedBy],
        audienceRoles: ["quality_assurance", "customer_support"],
        readBy: [],
        relatedType: "complaint",
        relatedId: complaint.id,
      });
    }
  }

  for (const order of input.manufacturingOrders) {
    if (order.plannedEnd && isPastDate(order.plannedEnd) && order.stage !== "closed") {
      reminders.push({
        kind: "order_delay",
        title: "Manufacturing order delayed",
        body: `${order.moNumber} planned end ${order.plannedEnd} is past due.`,
        href: "/manufacturing/orders",
        recipientUserIds: [],
        audienceRoles: ["production", "sales_manager"],
        readBy: [],
        relatedType: "manufacturing_order",
        relatedId: order.id,
        dueAt: order.plannedEnd,
      });
    }
  }

  return reminders;
}
