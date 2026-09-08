import type {
  AuditFields,
  CurrencyCode,
  EntityId,
  MoneyMinor,
  RecordStatus,
} from "@/types/common";
import type { RoleId } from "@/types/rbac";

export interface UserProfile extends AuditFields {
  email: string;
  displayName: string;
  role: RoleId;
  department: string;
  employeeId?: string;
  phone?: string;
  isActive: boolean;
  photoURL?: string;
}

export interface Customer extends AuditFields {
  legalName: string;
  tradeName: string;
  customerCode: string;
  type: "marketer" | "brand_owner" | "distributor" | "hospital" | "export";
  lifecycleStatus: "prospect" | "active" | "on_hold" | "inactive";
  gstin?: string;
  drugLicenseNo?: string;
  billingAddress: string;
  shippingAddress: string;
  city: string;
  state: string;
  country: string;
  creditLimitMinor: MoneyMinor;
  currency: CurrencyCode;
  ownerUserId: EntityId;
  notes?: string;
}

export interface Contact extends AuditFields {
  customerId: EntityId;
  firstName: string;
  lastName: string;
  designation: string;
  email: string;
  phone: string;
  isPrimary: boolean;
}

export interface Lead extends AuditFields {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  source: "referral" | "exhibition" | "inbound" | "outbound" | "website";
  stage: "new" | "qualified" | "nurture" | "converted" | "lost";
  customerId?: EntityId;
  ownerUserId: EntityId;
  estimatedValueMinor: MoneyMinor;
  notes?: string;
}

export interface Enquiry extends AuditFields {
  enquiryNumber: string;
  customerId: EntityId;
  contactId?: EntityId;
  leadId?: EntityId;
  subject: string;
  dosageForm: string;
  therapeuticCategory: string;
  targetQuantity: number;
  targetPriceMinor?: MoneyMinor;
  requiredDeliveryDate?: string;
  stage: "open" | "under_review" | "feasibility" | "quoted" | "won" | "lost";
  ownerUserId: EntityId;
}

export interface Opportunity extends AuditFields {
  name: string;
  customerId: EntityId;
  enquiryId?: EntityId;
  stage: "discovery" | "proposal" | "negotiation" | "commitment" | "closed_won" | "closed_lost";
  amountMinor: MoneyMinor;
  currency: CurrencyCode;
  closeDate?: string;
  ownerUserId: EntityId;
  probability: number;
}

export interface Product extends AuditFields {
  productCode: string;
  genericName: string;
  brandName?: string;
  dosageForm: "tablet" | "capsule" | "syrup" | "injection" | "ointment" | "sachet" | "other";
  strength: string;
  packSize: string;
  composition: string;
  category: string;
  lifecycle: "development" | "commercial" | "discontinued";
  customerId?: EntityId;
}

export interface ProductRequirement extends AuditFields {
  enquiryId: EntityId;
  customerId: EntityId;
  productId?: EntityId;
  genericName: string;
  strength: string;
  dosageForm: string;
  packSize: string;
  composition: string;
  artworkRequired: boolean;
  specificationNotes?: string;
  regulatoryNotes?: string;
  targetQuantity: number;
  targetPriceMinor?: MoneyMinor;
  requiredDeliveryDate?: string;
}

export interface Feasibility extends AuditFields {
  requirementId: EntityId;
  enquiryId: EntityId;
  customerId: EntityId;
  outcome: "pending" | "feasible" | "conditional" | "not_feasible";
  technicalNotes: string;
  capacityNotes: string;
  regulatoryNotes: string;
  estimatedLeadTimeDays?: number;
  reviewedBy?: EntityId;
}

export interface Quotation extends AuditFields {
  quotationNumber: string;
  customerId: EntityId;
  enquiryId?: EntityId;
  opportunityId?: EntityId;
  validUntil: string;
  currency: CurrencyCode;
  subtotalMinor: MoneyMinor;
  taxMinor: MoneyMinor;
  totalMinor: MoneyMinor;
  stage: "draft" | "sent" | "negotiation" | "accepted" | "expired" | "rejected";
  notes?: string;
}

export interface QuotationItem extends AuditFields {
  quotationId: EntityId;
  productId?: EntityId;
  description: string;
  quantity: number;
  unitPriceMinor: MoneyMinor;
  taxRateBps: number;
  lineTotalMinor: MoneyMinor;
}

export interface PurchaseOrder extends AuditFields {
  poNumber: string;
  customerId: EntityId;
  quotationId?: EntityId;
  orderDate: string;
  requiredDate?: string;
  currency: CurrencyCode;
  amountMinor: MoneyMinor;
  stage: "received" | "confirmed" | "in_production" | "ready" | "dispatched" | "closed" | "cancelled";
  customerPoRef?: string;
}

export interface ManufacturingOrder extends AuditFields {
  moNumber: string;
  purchaseOrderId: EntityId;
  customerId: EntityId;
  productId?: EntityId;
  plannedQty: number;
  completedQty: number;
  stage: "planned" | "material_in" | "in_process" | "packing" | "qa_hold" | "released" | "closed";
  plannedStart?: string;
  plannedEnd?: string;
}

export interface Batch extends AuditFields {
  batchNumber: string;
  manufacturingOrderId: EntityId;
  productId?: EntityId;
  customerId: EntityId;
  mfgDate?: string;
  expiryDate?: string;
  quantity: number;
  stage: "created" | "in_process" | "packed" | "tested" | "released" | "rejected";
}

export interface Dispatch extends AuditFields {
  dispatchNumber: string;
  manufacturingOrderId: EntityId;
  batchId?: EntityId;
  customerId: EntityId;
  dispatchDate?: string;
  transporter?: string;
  lrNumber?: string;
  stage: "ready" | "scheduled" | "in_transit" | "delivered";
}

export interface Employee extends AuditFields {
  employeeCode: string;
  userId?: EntityId;
  firstName: string;
  lastName: string;
  department: string;
  designation: string;
  email: string;
  phone?: string;
}

export interface Negotiation extends AuditFields {
  quotationId: EntityId;
  customerId: EntityId;
  summary: string;
  requestedPriceMinor?: number;
  offeredPriceMinor?: number;
  stage: "open" | "countered" | "agreed" | "dropped";
}

export interface RoleRecord extends AuditFields {
  roleId: string;
  name: string;
  description: string;
  permissions: string[];
}

export interface PermissionRecord extends AuditFields {
  key: string;
  module: string;
  action: string;
  description: string;
}

export type { RecordStatus };
