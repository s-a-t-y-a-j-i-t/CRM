import type { CurrencyCode, EntityId, IsoDateString, MoneyMinor, UserId } from "@/types/common";

export const CUSTOMER_TYPES = [
  "PHARMACEUTICAL_COMPANY",
  "MARKETING_COMPANY",
  "DISTRIBUTOR",
  "EXPORT_CUSTOMER",
  "INSTITUTIONAL_CUSTOMER",
  "OTHER",
] as const;
export type CustomerType = (typeof CUSTOMER_TYPES)[number];

export const CUSTOMER_CATEGORIES = [
  "DOMESTIC",
  "EXPORT",
  "STRATEGIC",
  "REGULAR",
  "INSTITUTIONAL",
  "DISTRIBUTOR",
] as const;
export type CustomerCategory = (typeof CUSTOMER_CATEGORIES)[number];

export const CUSTOMER_STATUSES = ["PROSPECT", "ACTIVE", "ON_HOLD", "INACTIVE", "BLOCKED"] as const;
export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];

export const CONTACT_TYPES = [
  "PURCHASE",
  "QA",
  "QC",
  "REGULATORY",
  "FINANCE",
  "MANAGEMENT",
  "PRODUCTION",
  "LOGISTICS",
  "GENERAL",
  "OTHER",
] as const;
export type CustomerContactType = (typeof CONTACT_TYPES)[number];

export const CONTACT_STATUSES = ["ACTIVE", "INACTIVE"] as const;
export type CustomerContactStatus = (typeof CONTACT_STATUSES)[number];

export const CUSTOMER_ACTIVITY_TYPES = ["CALL", "EMAIL", "MEETING", "NOTE", "FOLLOW_UP", "VISIT"] as const;
export type CustomerActivityType = (typeof CUSTOMER_ACTIVITY_TYPES)[number];

export const CUSTOMER_ACTIVITY_STATUSES = ["OPEN", "COMPLETED", "CANCELLED"] as const;
export type CustomerActivityStatus = (typeof CUSTOMER_ACTIVITY_STATUSES)[number];

export interface CrmCustomer {
  id: EntityId;
  customerCode: string;
  companyName: string;
  legalName?: string;
  shortName?: string;
  customerType: CustomerType;
  customerCategory?: CustomerCategory;
  website?: string;
  primaryEmail?: string;
  primaryPhone?: string;
  alternatePhone?: string;
  billingAddress?: string;
  shippingAddress?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  gstin?: string;
  pan?: string;
  drugLicenseNumber?: string;
  licenseExpiryDate?: string;
  paymentTerms?: string;
  creditLimitMinor: MoneyMinor;
  currency: CurrencyCode;
  assignedSalesPersonId?: UserId;
  assignedSalesPersonName?: string;
  status: CustomerStatus;
  customerSince?: string;
  notes?: string;
  isArchived: boolean;
  isDemoData: boolean;
  searchIndex: string;
  primaryContactName?: string;
  primaryContactPhone?: string;
  primaryContactEmail?: string;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
  createdBy: UserId;
  updatedBy: UserId;
}

export interface CrmContact {
  id: EntityId;
  customerId: EntityId;
  firstName: string;
  lastName: string;
  fullName: string;
  designation?: string;
  department?: string;
  email?: string;
  phone?: string;
  alternatePhone?: string;
  whatsapp?: string;
  contactType: CustomerContactType;
  isPrimary: boolean;
  status: CustomerContactStatus;
  notes?: string;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
  createdBy: UserId;
  updatedBy: UserId;
}

export interface CrmNote {
  id: EntityId;
  customerId: EntityId;
  text: string;
  createdAt: IsoDateString;
  createdBy: UserId;
  createdByName: string;
}

export interface CrmCustomerActivity {
  id: EntityId;
  customerId: EntityId;
  contactId?: EntityId;
  type: CustomerActivityType;
  subject: string;
  description?: string;
  assignedTo?: UserId;
  assignedToName?: string;
  activityDate: IsoDateString;
  nextFollowUpDate?: string;
  status: CustomerActivityStatus;
  createdAt: IsoDateString;
  createdBy: UserId;
  createdByName: string;
  updatedAt: IsoDateString;
  updatedBy: UserId;
}

export interface CrmCustomerDocument {
  id: EntityId;
  customerId: EntityId;
  name: string;
  type: string;
  version: string;
  storagePath?: string;
  uploadedBy: UserId;
  uploadedByName: string;
  uploadedAt: IsoDateString;
  status: "ACTIVE" | "ARCHIVED";
}

export interface CustomerKpis {
  totalEnquiries: number;
  totalQuotations: number;
  totalOrders: number;
  totalRevenueMinor: MoneyMinor;
  outstandingMinor: MoneyMinor;
  openComplaints: number;
  activeProducts: number;
}

export interface DuplicateMatch {
  customer: CrmCustomer;
  matchedOn: string[];
}
