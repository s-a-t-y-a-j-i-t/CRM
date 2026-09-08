import { Badge } from "@/components/ui/badge";
import { toTitleCase } from "@/lib/utils";

const SUCCESS = new Set([
  "active",
  "ACTIVE",
  "paid",
  "completed",
  "released",
  "delivered",
  "closed",
  "won",
  "WON",
  "QUALIFIED",
  "COMPLETED",
  "accepted",
  "converted",
  "feasible",
  "FEASIBLE",
  "resolved",
  "APPROVED",
  "COMPLETED",
  "ACCEPTED",
  "SENT",
]);
const WARNING = new Set([
  "ON_HOLD",
  "INACTIVE",
  "pending",
  "partially_paid",
  "in_progress",
  "investigation",
  "negotiation",
  "NEGOTIATION",
  "PROPOSAL",
  "REQUIREMENT_PENDING",
  "UNDER_REVIEW",
  "TECHNICAL_REVIEW",
  "FEASIBILITY_PENDING",
  "FEASIBILITY_APPROVED",
  "QUOTATION_PENDING",
  "QUOTATION_CREATED",
  "ENQUIRY_CREATED",
  "HIGH",
  "MEDIUM",
  "sent",
  "planned",
  "conditional",
  "DOCUMENT_REVIEW",
  "DEPARTMENT_REVIEW",
  "CLARIFICATION_REQUIRED",
  "UNDER_EVALUATION",
  "APPROVAL_PENDING",
  "PARTIALLY_FEASIBLE",
  "CONDITIONALLY_APPROVED",
  "CONDITIONALLY_FEASIBLE",
  "IN_PROGRESS",
  "APPROVAL_PENDING",
  "VIEWED",
  "NEGOTIATION",
]);
const DANGER = new Set([
  "BLOCKED",
  "SUSPENDED",
  "overdue",
  "critical",
  "rejected",
  "lost",
  "LOST",
  "URGENT",
  "MISSED",
  "cancelled",
  "CANCELLED",
  "disputed",
  "expired",
  "not_feasible",
  "NOT_FEASIBLE",
  "OVERDUE",
  "DISCONTINUED",
  "REJECTED",
  "EXPIRED",
]);
const INFO = new Set(["new", "NEW", "CONTACTED", "PENDING", "LOW", "acknowledged", "open", "confirmed", "in_production", "PROSPECT", "DRAFT", "INITIATED"]);

export function StatusBadge({ value }: { value: string }) {
  const tone = SUCCESS.has(value)
    ? "success"
    : WARNING.has(value)
      ? "warning"
      : DANGER.has(value)
        ? "danger"
        : INFO.has(value)
          ? "info"
          : "neutral";
  return <Badge tone={tone}>{toTitleCase(value)}</Badge>;
}
