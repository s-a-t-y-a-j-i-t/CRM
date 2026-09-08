import type { EntityId, IsoDateString, MoneyMinor, UserId } from "@/types/common";
import type { QuantityUnit } from "@/constants/pharma";
import type {
  ChargeType,
  DeliveryTermCode,
  DiscountType,
  LeadTimeUnit,
  PaymentTermCode,
  QuotationApprovalLevelId,
  QuotationApprovalStatus,
  QuotationCurrency,
  QuotationDocumentType,
  QuotationRejectionReason,
  QuotationStatus,
  TaxType,
} from "@/constants/quotations";

export interface QuotationCustomerSnapshot {
  customerName: string;
  legalName?: string;
  billingAddress?: string;
  shippingAddress?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  gstin?: string;
  pan?: string;
  email?: string;
  phone?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export interface QuotationProductSnapshot {
  productName: string;
  description?: string;
  dosageForm?: string;
  strength?: string;
  packaging?: string;
  packSize?: string;
  moq?: number;
}

export interface QuotationCostingSnapshot {
  costingId: EntityId;
  costingNumber: string;
  quantity: number;
  quantityUnit: QuantityUnit;
  unitPriceMinor: MoneyMinor;
  sellingPriceMinor: MoneyMinor;
  currency: QuotationCurrency;
}

export interface QuotationLine {
  id: EntityId;
  quotationId: EntityId;
  productId?: EntityId;
  productName: string;
  description?: string;
  dosageForm?: string;
  strength?: string;
  packaging?: string;
  packSize?: string;
  quantity: number;
  quantityUnit: QuantityUnit;
  unitPriceMinor: MoneyMinor;
  discountType: DiscountType;
  discountValue: number;
  discountAmountMinor: MoneyMinor;
  taxType: TaxType;
  taxRate: number;
  taxAmountMinor: MoneyMinor;
  lineSubtotalMinor: MoneyMinor;
  lineTotalMinor: MoneyMinor;
  costingId?: EntityId;
  moq?: number;
  remarks?: string;
  sortOrder: number;
}

export interface QuotationCharge {
  id: EntityId;
  quotationId: EntityId;
  chargeType: ChargeType;
  description: string;
  amountMinor: MoneyMinor;
}

export interface QuotationTerms {
  paymentTerms: PaymentTermCode;
  paymentTermsCustom?: string;
  deliveryTerms: DeliveryTermCode;
  deliveryTermsCustom?: string;
  shippingTerms?: string;
  priceBasis?: string;
  estimatedLeadTime?: number;
  leadTimeUnit?: LeadTimeUnit;
  packagingTerms?: string;
  artworkTerms?: string;
  sampleTerms?: string;
  regulatoryTerms?: string;
  cancellationTerms?: string;
  otherTerms?: string;
  taxesNote?: string;
  freightNote?: string;
  moqNote?: string;
}

export interface QuotationTotals {
  subtotalMinor: MoneyMinor;
  discountAmountMinor: MoneyMinor;
  additionalChargesMinor: MoneyMinor;
  taxableAmountMinor: MoneyMinor;
  taxAmountMinor: MoneyMinor;
  cgstMinor: MoneyMinor;
  sgstMinor: MoneyMinor;
  igstMinor: MoneyMinor;
  otherTaxMinor: MoneyMinor;
  grandTotalMinor: MoneyMinor;
  amountInWords: string;
}

export interface CrmQuotation {
  id: EntityId;
  quotationNumber: string;
  displayNumber: string;
  version: number;
  familyId: EntityId;
  customerId: EntityId;
  customerName: string;
  contactId?: EntityId;
  enquiryId: EntityId;
  enquiryNumber: string;
  feasibilityId?: EntityId;
  feasibilityNumber?: string;
  costingId?: EntityId;
  costingNumber?: string;
  productId?: EntityId;
  productName: string;
  quotationDate: string;
  validUntil: string;
  status: QuotationStatus;
  approvalStatus: QuotationApprovalStatus;
  currency: QuotationCurrency;
  preparedBy: UserId;
  preparedByName: string;
  salesOwner: UserId;
  salesOwnerName: string;
  approvedBy?: UserId;
  approvedByName?: string;
  approvedAt?: IsoDateString;
  sentAt?: IsoDateString;
  sentBy?: UserId;
  sentTo?: string;
  sentSubject?: string;
  viewedAt?: IsoDateString;
  acceptedAt?: IsoDateString;
  acceptedBy?: UserId;
  acceptanceRemarks?: string;
  rejectedAt?: IsoDateString;
  rejectionReason?: QuotationRejectionReason;
  rejectionRemarks?: string;
  notes?: string;
  internalNotes?: string;
  customerNotes?: string;
  headerDiscountType: DiscountType;
  headerDiscountValue: number;
  customer: QuotationCustomerSnapshot;
  costingSnapshot?: QuotationCostingSnapshot;
  terms: QuotationTerms;
  totals: QuotationTotals;
  searchIndex: string;
  isDemoData: boolean;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
  createdBy: UserId;
  updatedBy: UserId;
}

export interface QuotationVersionSnapshot {
  id: EntityId;
  quotationId: EntityId;
  quotationNumber: string;
  version: number;
  changeReason: string;
  totals: QuotationTotals;
  paymentTerms: string;
  deliveryTerms: string;
  validUntil: string;
  createdAt: IsoDateString;
  createdBy: UserId;
  createdByName: string;
}

export interface QuotationApprovalRecord {
  id: EntityId;
  quotationId: EntityId;
  levelId: QuotationApprovalLevelId;
  levelName: string;
  decision: "SUBMITTED" | "APPROVED" | "REJECTED" | "REASSIGNED";
  remarks?: string;
  actorId: UserId;
  actorName: string;
  actorRole: string;
  createdAt: IsoDateString;
}

export interface QuotationDocument {
  id: EntityId;
  quotationId: EntityId;
  quotationVersion: number;
  documentType: QuotationDocumentType;
  fileName: string;
  storagePath?: string;
  generatedBy: UserId;
  generatedByName: string;
  generatedAt: IsoDateString;
  status: "ACTIVE" | "ARCHIVED";
}

export interface QuotationKpis {
  total: number;
  draft: number;
  approvalPending: number;
  approved: number;
  sent: number;
  negotiation: number;
  accepted: number;
  rejected: number;
  expired: number;
  quotedValueMinor: MoneyMinor;
  acceptedValueMinor: MoneyMinor;
  rejectedValueMinor: MoneyMinor;
  pendingValueMinor: MoneyMinor;
}

export interface SalesOrderReadyQuotation {
  quotationId: EntityId;
  customerId: EntityId;
  enquiryId: EntityId;
  currency: QuotationCurrency;
  acceptedQuantities: Array<{
    itemId: EntityId;
    productId?: EntityId;
    productName: string;
    quantity: number;
    quantityUnit: QuantityUnit;
    unitPriceMinor: MoneyMinor;
    lineTotalMinor: MoneyMinor;
  }>;
  acceptedPrices: { grandTotalMinor: MoneyMinor };
  commercialTerms: QuotationTerms;
}
