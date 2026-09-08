import { z } from "zod";
import { currencySchema, isoDateSchema, longText, moneyMinorSchema, nonEmpty } from "@/schemas/common";
import { ACTIVITY_PRIORITIES, ACTIVITY_TYPES } from "@/types/activity";
import { COMPLAINT_SEVERITIES, COMPLAINT_STATUSES, COMPLAINT_TYPES, DOCUMENT_TYPES } from "@/types/quality";
import { PAYMENT_METHODS } from "@/types/finance";

export const customerSchema = z.object({
  legalName: nonEmpty,
  tradeName: nonEmpty,
  customerCode: z.string().trim().min(2).max(40),
  type: z.enum(["marketer", "brand_owner", "distributor", "hospital", "export"]),
  lifecycleStatus: z.enum(["prospect", "active", "on_hold", "inactive"]),
  gstin: z.string().max(20).optional(),
  drugLicenseNo: z.string().max(40).optional(),
  billingAddress: z.string().trim().min(4).max(400),
  shippingAddress: z.string().trim().min(4).max(400),
  city: nonEmpty,
  state: nonEmpty,
  country: nonEmpty,
  creditLimitMinor: moneyMinorSchema.nonnegative(),
  currency: currencySchema,
  ownerUserId: z.string().min(1),
  notes: longText,
});

export const contactSchema = z.object({
  customerId: z.string().min(1),
  firstName: nonEmpty,
  lastName: nonEmpty,
  designation: nonEmpty,
  email: z.string().email(),
  phone: z.string().trim().min(8).max(20),
  isPrimary: z.boolean(),
});

export const leadSchema = z.object({
  companyName: nonEmpty,
  contactName: nonEmpty,
  email: z.string().email(),
  phone: z.string().trim().min(8).max(20),
  source: z.enum(["referral", "exhibition", "inbound", "outbound", "website"]),
  stage: z.enum(["new", "qualified", "nurture", "converted", "lost"]),
  customerId: z.string().optional(),
  ownerUserId: z.string().min(1),
  estimatedValueMinor: moneyMinorSchema.nonnegative(),
  notes: longText,
});

export const enquirySchema = z.object({
  enquiryNumber: z.string().min(3).max(40),
  customerId: z.string().min(1),
  contactId: z.string().optional(),
  leadId: z.string().optional(),
  subject: nonEmpty,
  dosageForm: nonEmpty,
  therapeuticCategory: nonEmpty,
  targetQuantity: z.number().int().positive(),
  targetPriceMinor: moneyMinorSchema.nonnegative().optional(),
  requiredDeliveryDate: isoDateSchema.optional(),
  stage: z.enum(["open", "under_review", "feasibility", "quoted", "won", "lost"]),
  ownerUserId: z.string().min(1),
});

export const productSchema = z.object({
  productCode: z.string().min(2).max(40),
  genericName: nonEmpty,
  brandName: z.string().max(120).optional(),
  dosageForm: z.enum(["tablet", "capsule", "syrup", "injection", "ointment", "sachet", "other"]),
  strength: nonEmpty,
  packSize: nonEmpty,
  composition: z.string().trim().min(4).max(800),
  category: nonEmpty,
  lifecycle: z.enum(["development", "commercial", "discontinued"]),
  customerId: z.string().optional(),
});

export const requirementSchema = z.object({
  enquiryId: z.string().min(1),
  customerId: z.string().min(1),
  productId: z.string().optional(),
  genericName: nonEmpty,
  strength: nonEmpty,
  dosageForm: nonEmpty,
  packSize: nonEmpty,
  composition: z.string().trim().min(4).max(800),
  artworkRequired: z.boolean(),
  specificationNotes: longText,
  regulatoryNotes: longText,
  targetQuantity: z.number().int().positive(),
  targetPriceMinor: moneyMinorSchema.nonnegative().optional(),
  requiredDeliveryDate: isoDateSchema.optional(),
});

export const feasibilitySchema = z.object({
  requirementId: z.string().min(1),
  enquiryId: z.string().min(1),
  customerId: z.string().min(1),
  outcome: z.enum(["pending", "feasible", "conditional", "not_feasible"]),
  technicalNotes: z.string().trim().min(4).max(2000),
  capacityNotes: z.string().trim().min(4).max(2000),
  regulatoryNotes: z.string().trim().min(4).max(2000),
  estimatedLeadTimeDays: z.number().int().positive().optional(),
  reviewedBy: z.string().optional(),
});

export const quotationSchema = z.object({
  quotationNumber: z.string().min(3).max(40),
  customerId: z.string().min(1),
  enquiryId: z.string().optional(),
  opportunityId: z.string().optional(),
  validUntil: isoDateSchema,
  currency: currencySchema,
  subtotalMinor: moneyMinorSchema.nonnegative(),
  taxMinor: moneyMinorSchema.nonnegative(),
  totalMinor: moneyMinorSchema.nonnegative(),
  stage: z.enum(["draft", "sent", "negotiation", "accepted", "expired", "rejected"]),
  notes: longText,
});

export const purchaseOrderSchema = z.object({
  poNumber: z.string().min(3).max(40),
  customerId: z.string().min(1),
  quotationId: z.string().optional(),
  orderDate: isoDateSchema,
  requiredDate: isoDateSchema.optional(),
  currency: currencySchema,
  amountMinor: moneyMinorSchema.nonnegative(),
  stage: z.enum(["received", "confirmed", "in_production", "ready", "dispatched", "closed", "cancelled"]),
  customerPoRef: z.string().max(60).optional(),
});

export const manufacturingOrderSchema = z.object({
  moNumber: z.string().min(3).max(40),
  purchaseOrderId: z.string().min(1),
  customerId: z.string().min(1),
  productId: z.string().optional(),
  plannedQty: z.number().int().positive(),
  completedQty: z.number().int().nonnegative(),
  stage: z.enum(["planned", "material_in", "in_process", "packing", "qa_hold", "released", "closed"]),
  plannedStart: isoDateSchema.optional(),
  plannedEnd: isoDateSchema.optional(),
});

export const batchSchema = z.object({
  batchNumber: z.string().min(2).max(40),
  manufacturingOrderId: z.string().min(1),
  productId: z.string().optional(),
  customerId: z.string().min(1),
  mfgDate: isoDateSchema.optional(),
  expiryDate: isoDateSchema.optional(),
  quantity: z.number().int().positive(),
  stage: z.enum(["created", "in_process", "packed", "tested", "released", "rejected"]),
});

export const invoiceSchema = z.object({
  invoiceNumber: z.string().min(3).max(40),
  customerId: z.string().min(1),
  purchaseOrderId: z.string().optional(),
  invoiceDate: isoDateSchema,
  dueDate: isoDateSchema,
  currency: currencySchema,
  amountMinor: moneyMinorSchema.nonnegative(),
  taxMinor: moneyMinorSchema.nonnegative(),
  totalMinor: moneyMinorSchema.nonnegative(),
  remarks: longText,
});

export const paymentSchema = z.object({
  paymentNumber: z.string().min(3).max(40),
  customerId: z.string().min(1),
  invoiceId: z.string().min(1),
  amountMinor: moneyMinorSchema.positive(),
  paymentDate: isoDateSchema,
  method: z.enum(PAYMENT_METHODS),
  referenceNumber: z.string().trim().min(2).max(60),
  remarks: longText,
});

export const complaintSchema = z.object({
  complaintNumber: z.string().min(3).max(40),
  customerId: z.string().min(1),
  productId: z.string().optional(),
  batchNumber: z.string().max(40).optional(),
  complaintDate: isoDateSchema,
  complaintType: z.enum(COMPLAINT_TYPES),
  description: z.string().trim().min(8).max(4000),
  severity: z.enum(COMPLAINT_SEVERITIES),
  receivedBy: z.string().min(1),
  assignedDepartment: nonEmpty,
  investigationStatus: z.enum(COMPLAINT_STATUSES),
  resolution: longText,
  capaReference: z.string().max(60).optional(),
  closureDate: isoDateSchema.optional(),
});

export const documentMetaSchema = z.object({
  name: nonEmpty,
  documentType: z.enum(DOCUMENT_TYPES),
  relatedType: z.enum([
    "customer",
    "product",
    "enquiry",
    "quotation",
    "purchase_order",
    "batch",
    "complaint",
  ]),
  relatedId: z.string().min(1),
  expiryDate: isoDateSchema.optional(),
});

export const documentSchema = documentMetaSchema.extend({
  documentNumber: z.string().min(3).max(40),
  version: z.number().int().positive(),
  storagePath: z.string().min(3).max(400),
  contentType: z.string().min(3).max(120),
  sizeBytes: z.number().int().nonnegative(),
  uploadedBy: z.string().min(1),
  uploadedAt: z.string().min(10),
  documentStatus: z.enum(["current", "superseded", "expired", "archived"]),
});

export const opportunitySchema = z.object({
  name: nonEmpty,
  customerId: z.string().min(1),
  enquiryId: z.string().optional(),
  stage: z.enum(["discovery", "proposal", "negotiation", "commitment", "closed_won", "closed_lost"]),
  amountMinor: moneyMinorSchema.nonnegative(),
  currency: currencySchema,
  closeDate: isoDateSchema.optional(),
  ownerUserId: z.string().min(1),
  probability: z.number().int().min(0).max(100),
});

export const dispatchSchema = z.object({
  dispatchNumber: z.string().min(3).max(40),
  manufacturingOrderId: z.string().min(1),
  batchId: z.string().optional(),
  customerId: z.string().min(1),
  dispatchDate: isoDateSchema.optional(),
  transporter: z.string().max(120).optional(),
  lrNumber: z.string().max(60).optional(),
  stage: z.enum(["ready", "scheduled", "in_transit", "delivered"]),
});

export const activitySchema = z.object({
  type: z.enum(ACTIVITY_TYPES),
  subject: nonEmpty,
  description: longText,
  customerId: z.string().optional(),
  contactId: z.string().optional(),
  leadId: z.string().optional(),
  enquiryId: z.string().optional(),
  opportunityId: z.string().optional(),
  orderId: z.string().optional(),
  assignedUserId: z.string().min(1),
  dueAt: z.string().optional(),
  reminderAt: z.string().optional(),
  priority: z.enum(ACTIVITY_PRIORITIES),
  activityStatus: z.enum(["pending", "in_progress", "completed", "cancelled", "overdue"]),
});

export const ALLOWED_UPLOAD_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
] as const;

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
