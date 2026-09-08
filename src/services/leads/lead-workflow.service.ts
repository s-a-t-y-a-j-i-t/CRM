import { AppError } from "@/lib/errors";
import type { LeadStatus } from "@/types/leads";

export const LEAD_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  NEW: ["CONTACTED", "ON_HOLD", "LOST"],
  CONTACTED: ["QUALIFIED", "ON_HOLD", "LOST"],
  QUALIFIED: ["REQUIREMENT_PENDING", "ON_HOLD", "LOST"],
  REQUIREMENT_PENDING: ["ENQUIRY_CREATED", "ON_HOLD", "LOST"],
  ENQUIRY_CREATED: ["PROPOSAL", "ON_HOLD", "LOST"],
  PROPOSAL: ["NEGOTIATION", "WON", "LOST", "ON_HOLD"],
  NEGOTIATION: ["WON", "LOST", "ON_HOLD"],
  ON_HOLD: ["NEW", "CONTACTED", "QUALIFIED", "REQUIREMENT_PENDING", "ENQUIRY_CREATED", "PROPOSAL", "NEGOTIATION"],
  WON: [],
  LOST: ["QUALIFIED", "CONTACTED", "ON_HOLD"],
};

export function canTransition(from: LeadStatus, to: LeadStatus): boolean {
  if (from === to) return true;
  return LEAD_TRANSITIONS[from].includes(to);
}

export function validateTransition(from: LeadStatus, to: LeadStatus): void {
  if (!canTransition(from, to)) {
    throw new AppError("VALIDATION", `Cannot move a lead from ${from} to ${to}.`, 400);
  }
}

export function transitionLead(from: LeadStatus, to: LeadStatus): LeadStatus {
  validateTransition(from, to);
  return to;
}

export function reactivateTarget(lead: { status: LeadStatus; previousStatus?: LeadStatus }): LeadStatus {
  if (lead.status === "ON_HOLD" && lead.previousStatus && lead.previousStatus !== "ON_HOLD") {
    return lead.previousStatus;
  }
  if (lead.status === "LOST") {
    return lead.previousStatus && lead.previousStatus !== "LOST" ? lead.previousStatus : "QUALIFIED";
  }
  throw new AppError("VALIDATION", "Only lost or on-hold leads can be reactivated.", 400);
}
