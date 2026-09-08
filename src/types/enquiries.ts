import type { EntityId, IsoDateString, MoneyMinor, UserId } from "@/types/common";
import type {
  EnquiryCurrency,
  IngredientRole,
  PackagingType,
  PharmaDosageForm,
  PriceBasis,
  QuantityUnit,
} from "@/constants/pharma";

export const ENQUIRY_TYPES = [
  "NEW_PRODUCT",
  "EXISTING_PRODUCT",
  "PRODUCT_TRANSFER",
  "CUSTOMER_SPECIFIC",
  "EXPORT",
  "DOMESTIC",
  "REPEAT_ORDER",
  "OTHER",
] as const;
export type EnquiryType = (typeof ENQUIRY_TYPES)[number];

export const ENQUIRY_SOURCES = [
  "LEAD",
  "EXISTING_CUSTOMER",
  "EMAIL",
  "PHONE",
  "WEBSITE",
  "SALES_VISIT",
  "REFERRAL",
  "EXHIBITION",
  "DISTRIBUTOR",
  "OTHER",
] as const;
export type EnquirySource = (typeof ENQUIRY_SOURCES)[number];

export const ENQUIRY_STATUSES = [
  "NEW",
  "UNDER_REVIEW",
  "REQUIREMENT_PENDING",
  "TECHNICAL_REVIEW",
  "FEASIBILITY_PENDING",
  "FEASIBILITY_APPROVED",
  "QUOTATION_PENDING",
  "QUOTATION_CREATED",
  "NEGOTIATION",
  "WON",
  "LOST",
  "ON_HOLD",
  "CANCELLED",
] as const;
export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number];

export const ENQUIRY_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export type EnquiryPriority = (typeof ENQUIRY_PRIORITIES)[number];

export const ARTWORK_STATUSES = ["ARTWORK_REQUIRED", "ARTWORK_PROVIDED", "ARTWORK_PENDING", "ARTWORK_REVISION_REQUIRED"] as const;
export type ArtworkStatus = (typeof ARTWORK_STATUSES)[number];

export const SPECIFICATION_STATUSES = [
  "CUSTOMER_SPECIFICATION_AVAILABLE",
  "SPECIFICATION_REQUIRED",
  "SPECIFICATION_PROVIDED",
  "SPECIFICATION_PENDING",
] as const;
export type SpecificationStatus = (typeof SPECIFICATION_STATUSES)[number];

export const SAMPLE_STATUSES = ["NOT_REQUIRED", "REQUESTED", "PREPARING", "SENT", "RECEIVED", "APPROVED", "REJECTED"] as const;
export type SampleStatus = (typeof SAMPLE_STATUSES)[number];

export const MARKET_TYPES = ["DOMESTIC", "EXPORT"] as const;
export type MarketType = (typeof MARKET_TYPES)[number];

export const TECHNICAL_REVIEW_STATUSES = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED"] as const;
export type TechnicalReviewStatus = (typeof TECHNICAL_REVIEW_STATUSES)[number];

export const ENQUIRY_ACTIVITY_TYPES = ["CALL", "EMAIL", "MEETING", "VISIT", "NOTE", "FOLLOW_UP", "TASK"] as const;
export type EnquiryActivityType = (typeof ENQUIRY_ACTIVITY_TYPES)[number];

export const ENQUIRY_FOLLOW_UP_STATUSES = ["PENDING", "COMPLETED", "MISSED", "CANCELLED"] as const;
export type EnquiryFollowUpStatus = (typeof ENQUIRY_FOLLOW_UP_STATUSES)[number];

export const ENQUIRY_DOCUMENT_TYPES = [
  "CUSTOMER_REQUIREMENT",
  "PRODUCT_SPECIFICATION",
  "ARTWORK",
  "SAMPLE_REQUEST",
  "REGULATORY_DOCUMENT",
  "EMAIL_ATTACHMENT",
  "OTHER",
] as const;
export type EnquiryDocumentType = (typeof ENQUIRY_DOCUMENT_TYPES)[number];

export interface CompositionLine {
  id: string;
  ingredient: string;
  strength: string;
  unit: string;
  quantityRatio?: string;
  role: IngredientRole;
  sortOrder: number;
}

export interface PackagingRequirement {
  primaryType?: PackagingType;
  secondaryType?: PackagingType;
  tertiaryType?: PackagingType;
  packSize?: string;
  unitsPerPack?: number;
  notes?: string;
}

export interface ArtworkRequirement {
  status: ArtworkStatus;
  notes?: string;
}

export interface SpecificationRequirement {
  status: SpecificationStatus;
  specificationType?: string;
  notes?: string;
}

export interface SampleRequirement {
  required: boolean;
  quantity?: number;
  sampleType?: string;
  deliveryDate?: string;
  status: SampleStatus;
  notes?: string;
}

export interface StabilityRequirement {
  required: boolean;
  stabilityType?: string;
  storageCondition?: string;
  duration?: string;
  notes?: string;
}

export interface DeliveryRequirement {
  requiredDeliveryDate?: string;
  expectedLeadTime?: string;
  deliveryLocation?: string;
  logisticsNotes?: string;
}

export interface ProductRequirement {
  id: EntityId;
  enquiryId: EntityId;
  productMasterId?: EntityId;
  isNewProductRequirement: boolean;
  productName: string;
  genericName?: string;
  brandName?: string;
  dosageForm: PharmaDosageForm;
  strength?: string;
  composition: CompositionLine[];
  packaging: PackagingRequirement;
  packSize?: string;
  requiredQuantity?: number;
  quantityUnit: QuantityUnit;
  annualQuantity?: number;
  batchQuantity?: number;
  moqRequirement?: number;
  targetPriceMinor?: MoneyMinor;
  currency: EnquiryCurrency;
  priceBasis?: PriceBasis;
  market?: string;
  country?: string;
  marketType?: MarketType;
  regulatoryRequirement?: string;
  customerRegulatoryRequirement?: string;
  licenseRequirement?: string;
  regulatoryNotes?: string;
  artwork: ArtworkRequirement;
  specification: SpecificationRequirement;
  sample: SampleRequirement;
  stability: StabilityRequirement;
  delivery: DeliveryRequirement;
  specialRequirements?: string;
  versionNumber: number;
  isCurrent: boolean;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
  createdBy: UserId;
  updatedBy: UserId;
}

export interface RequirementVersion {
  id: EntityId;
  enquiryId: EntityId;
  requirementId: EntityId;
  versionNumber: number;
  changedBy: UserId;
  changedByName: string;
  changedAt: IsoDateString;
  changeReason: string;
  snapshot: ProductRequirement;
  oldValue?: string;
  newValue?: string;
}

export interface CrmEnquiry {
  id: EntityId;
  enquiryNumber: string;
  leadId?: EntityId;
  customerId: EntityId;
  contactId: EntityId;
  customerName: string;
  contactName: string;
  enquirySource: EnquirySource;
  enquiryType: EnquiryType;
  assignedTo: UserId;
  assignedToName: string;
  assignedAt?: IsoDateString;
  priority: EnquiryPriority;
  status: EnquiryStatus;
  previousStatus?: EnquiryStatus;
  receivedDate: string;
  expectedDecisionDate?: string;
  description?: string;
  internalNotes?: string;
  currentRequirementId?: EntityId;
  technicalReviewer?: UserId;
  technicalReviewStartedAt?: IsoDateString;
  technicalReviewNotes?: string;
  technicalReviewStatus: TechnicalReviewStatus;
  lostReason?: string;
  searchIndex: string;
  isDemoData: boolean;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
  createdBy: UserId;
  updatedBy: UserId;
}

export interface EnquiryActivity {
  id: EntityId;
  enquiryId: EntityId;
  customerId?: EntityId;
  contactId?: EntityId;
  type: EnquiryActivityType;
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

export interface EnquiryFollowUp {
  id: EntityId;
  enquiryId: EntityId;
  followUpAt: IsoDateString;
  assignedTo: UserId;
  assignedToName: string;
  purpose: string;
  notes?: string;
  priority: EnquiryPriority;
  status: EnquiryFollowUpStatus;
  createdAt: IsoDateString;
  createdBy: UserId;
  updatedAt: IsoDateString;
  updatedBy: UserId;
}

export interface EnquiryDocument {
  id: EntityId;
  enquiryId: EntityId;
  fileName: string;
  documentType: EnquiryDocumentType;
  storagePath?: string;
  version: string;
  uploadedBy: UserId;
  uploadedByName: string;
  uploadedAt: IsoDateString;
  status: "ACTIVE" | "ARCHIVED";
}

export interface EnquiryKpis {
  total: number;
  newer: number;
  underReview: number;
  technicalReview: number;
  pendingFeasibility: number;
  pendingQuotation: number;
  won: number;
  lost: number;
  onHold: number;
  conversionRate: number;
}
