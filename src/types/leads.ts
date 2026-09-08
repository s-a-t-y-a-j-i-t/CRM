import type { EntityId, IsoDateString, MoneyMinor, UserId } from "@/types/common";

export const LEAD_TYPES = [
  "NEW_BUSINESS",
  "EXISTING_CUSTOMER",
  "REFERRAL",
  "EXPORT",
  "DISTRIBUTOR",
  "INSTITUTIONAL",
  "OTHER",
] as const;
export type LeadType = (typeof LEAD_TYPES)[number];

export const LEAD_SOURCES = [
  "WEBSITE",
  "EMAIL",
  "PHONE",
  "REFERRAL",
  "EXHIBITION",
  "EXISTING_CUSTOMER",
  "DISTRIBUTOR",
  "SOCIAL_MEDIA",
  "ADVERTISEMENT",
  "SALES_VISIT",
  "OTHER",
] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export const LEAD_STATUSES = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "REQUIREMENT_PENDING",
  "ENQUIRY_CREATED",
  "PROPOSAL",
  "NEGOTIATION",
  "WON",
  "LOST",
  "ON_HOLD",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export type LeadPriority = (typeof LEAD_PRIORITIES)[number];

export const LOST_REASONS = [
  "PRICE",
  "PRODUCT_NOT_AVAILABLE",
  "CUSTOMER_SELECTED_COMPETITOR",
  "REGULATORY_ISSUE",
  "TIMELINE",
  "NO_RESPONSE",
  "QUANTITY",
  "PAYMENT_TERMS",
  "OTHER",
] as const;
export type LostReason = (typeof LOST_REASONS)[number];

export const LEAD_ACTIVITY_TYPES = ["CALL", "EMAIL", "MEETING", "VISIT", "NOTE", "FOLLOW_UP", "TASK"] as const;
export type LeadActivityType = (typeof LEAD_ACTIVITY_TYPES)[number];

export const FOLLOW_UP_STATUSES = ["PENDING", "COMPLETED", "MISSED", "CANCELLED"] as const;
export type FollowUpStatus = (typeof FOLLOW_UP_STATUSES)[number];

export const DOSAGE_FORMS = ["tablet", "capsule", "syrup", "injection", "ointment", "sachet", "other"] as const;
export type DosageForm = (typeof DOSAGE_FORMS)[number];

export interface CrmLead {
  id: EntityId;
  leadCode: string;
  companyName: string;
  contactName: string;
  contactDesignation?: string;
  email?: string;
  phone?: string;
  alternatePhone?: string;
  whatsapp?: string;
  website?: string;
  customerId?: EntityId;
  contactId?: EntityId;
  leadSource: LeadSource;
  leadType?: LeadType;
  productInterest?: string;
  dosageForm?: DosageForm;
  strength?: string;
  composition?: string;
  requiredQuantity?: number;
  annualQuantity?: number;
  targetPriceMinor?: MoneyMinor;
  market?: string;
  country?: string;
  state?: string;
  expectedBusinessValueMinor: MoneyMinor;
  expectedClosingDate?: string;
  priority: LeadPriority;
  assignedTo: UserId;
  assignedToName: string;
  assignedAt?: IsoDateString;
  status: LeadStatus;
  previousStatus?: LeadStatus;
  nextFollowUpDate?: string;
  description?: string;
  notes?: string;
  convertedCustomerId?: EntityId;
  convertedEnquiryId?: EntityId;
  convertedAt?: IsoDateString;
  lostReason?: LostReason;
  lostNotes?: string;
  lostAt?: IsoDateString;
  lostBy?: UserId;
  score: number;
  searchIndex: string;
  isDemoData: boolean;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
  createdBy: UserId;
  updatedBy: UserId;
}

export interface LeadActivity {
  id: EntityId;
  leadId: EntityId;
  customerId?: EntityId;
  contactId?: EntityId;
  type: LeadActivityType;
  subject: string;
  description?: string;
  assignedTo?: UserId;
  activityDate: IsoDateString;
  nextFollowUpDate?: string;
  status: "OPEN" | "COMPLETED" | "CANCELLED";
  createdAt: IsoDateString;
  createdBy: UserId;
  createdByName: string;
  updatedAt: IsoDateString;
  updatedBy: UserId;
}

export interface LeadFollowUp {
  id: EntityId;
  leadId: EntityId;
  followUpAt: IsoDateString;
  assignedTo: UserId;
  assignedToName: string;
  purpose: string;
  notes?: string;
  priority: LeadPriority;
  status: FollowUpStatus;
  createdAt: IsoDateString;
  createdBy: UserId;
  updatedAt: IsoDateString;
  updatedBy: UserId;
}

export interface LeadNote {
  id: EntityId;
  leadId: EntityId;
  text: string;
  createdAt: IsoDateString;
  createdBy: UserId;
  createdByName: string;
}

export interface LeadDocument {
  id: EntityId;
  leadId: EntityId;
  name: string;
  type: string;
  version: string;
  storagePath?: string;
  uploadedBy: UserId;
  uploadedByName: string;
  uploadedAt: IsoDateString;
  status: "ACTIVE" | "ARCHIVED";
}

export interface LeadDuplicateMatch {
  lead: CrmLead;
  matchedOn: string[];
}

export interface LeadKpis {
  total: number;
  newer: number;
  qualified: number;
  open: number;
  won: number;
  lost: number;
  conversionRate: number;
  expectedValueMinor: MoneyMinor;
  openPipelineMinor: MoneyMinor;
  wonValueMinor: MoneyMinor;
  lostValueMinor: MoneyMinor;
}
