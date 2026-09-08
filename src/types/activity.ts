import type { AuditFields, EntityId } from "@/types/common";

export const ACTIVITY_TYPES = [
  "call",
  "email",
  "meeting",
  "follow_up",
  "task",
  "note",
  "visit",
  "whatsapp_log",
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const ACTIVITY_STATUSES = [
  "pending",
  "in_progress",
  "completed",
  "cancelled",
  "overdue",
] as const;

export type ActivityStatus = (typeof ACTIVITY_STATUSES)[number];

export const ACTIVITY_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type ActivityPriority = (typeof ACTIVITY_PRIORITIES)[number];

export interface Activity extends AuditFields {
  activityNumber: string;
  type: ActivityType;
  subject: string;
  description?: string;
  customerId?: EntityId;
  contactId?: EntityId;
  leadId?: EntityId;
  enquiryId?: EntityId;
  opportunityId?: EntityId;
  orderId?: EntityId;
  assignedUserId: EntityId;
  dueAt?: string;
  reminderAt?: string;
  completedAt?: string;
  priority: ActivityPriority;
  activityStatus: ActivityStatus;
}

export const NOTIFICATION_KINDS = [
  "follow_up_due",
  "follow_up_overdue",
  "quotation_expiry",
  "payment_overdue",
  "document_expiry",
  "complaint_pending",
  "order_delay",
  "lead_assigned",
  "lead_reassigned",
  "lead_converted",
  "lead_status_changed",
  "enquiry_assigned",
  "enquiry_reassigned",
  "enquiry_status_changed",
  "technical_review_started",
  "requirement_updated",
  "document_uploaded",
  "feasibility_assigned",
  "department_review_assigned",
  "clarification_requested",
  "clarification_responded",
  "review_completed",
  "approval_pending",
  "final_decision_made",
  "feasibility_overdue",
  "costing_assigned",
  "costing_completed",
  "costing_approval_requested",
  "costing_approved",
  "costing_rejected",
  "costing_version_created",
  "costing_expiring",
  "quotation_assigned",
  "quotation_submitted",
  "quotation_approval_requested",
  "quotation_approved",
  "quotation_rejected",
  "quotation_revised",
  "quotation_sent",
  "quotation_accepted",
  "quotation_customer_rejected",
  "quotation_expiring",
] as const;

export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export interface AppNotification extends AuditFields {
  kind: NotificationKind;
  title: string;
  body: string;
  href: string;
  recipientUserIds: EntityId[];
  audienceRoles: string[];
  readBy: EntityId[];
  relatedType?: string;
  relatedId?: EntityId;
  dueAt?: string;
}
