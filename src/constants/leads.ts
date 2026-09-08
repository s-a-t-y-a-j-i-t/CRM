import {
  DOSAGE_FORMS,
  FOLLOW_UP_STATUSES,
  LEAD_ACTIVITY_TYPES,
  LEAD_PRIORITIES,
  LEAD_SOURCES,
  LEAD_STATUSES,
  LEAD_TYPES,
  LOST_REASONS,
  type LeadStatus,
} from "@/types/leads";

export const INACTIVE_LEAD_DAYS = 14;

export const LEAD_TYPE_OPTIONS = LEAD_TYPES.map((value) => ({
  value,
  label: value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase()),
}));

export const LEAD_SOURCE_OPTIONS = LEAD_SOURCES.map((value) => ({
  value,
  label: value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase()),
}));

export const LEAD_STATUS_OPTIONS = LEAD_STATUSES.map((value) => ({
  value,
  label: value.replaceAll("_", " "),
}));

export const LEAD_PRIORITY_OPTIONS = LEAD_PRIORITIES.map((value) => ({
  value,
  label: value,
}));

export const LOST_REASON_OPTIONS = LOST_REASONS.map((value) => ({
  value,
  label: value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase()),
}));

export const DOSAGE_FORM_OPTIONS = DOSAGE_FORMS.map((value) => ({
  value,
  label: value.charAt(0).toUpperCase() + value.slice(1),
}));

export const LEAD_ACTIVITY_OPTIONS = LEAD_ACTIVITY_TYPES.map((value) => ({
  value,
  label: value.replaceAll("_", " "),
}));

export const FOLLOW_UP_STATUS_OPTIONS = FOLLOW_UP_STATUSES.map((value) => ({
  value,
  label: value,
}));

export const PIPELINE_COLUMNS: LeadStatus[] = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "REQUIREMENT_PENDING",
  "ENQUIRY_CREATED",
  "PROPOSAL",
  "NEGOTIATION",
  "WON",
  "LOST",
];

export const OPEN_LEAD_STATUSES: LeadStatus[] = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "REQUIREMENT_PENDING",
  "ENQUIRY_CREATED",
  "PROPOSAL",
  "NEGOTIATION",
  "ON_HOLD",
];

export function labelForLead(value: string): string {
  return value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}
