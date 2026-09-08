import { z } from "zod";
import { longText } from "@/schemas/common";
import { QUANTITY_UNITS } from "@/constants/pharma";
import {
  CHARGE_TYPES,
  DELIVERY_TERM_OPTIONS_VALUES,
  DISCOUNT_TYPES,
  LEAD_TIME_UNITS,
  PAYMENT_TERM_OPTIONS_VALUES,
  QUOTATION_CURRENCIES,
  QUOTATION_REJECTION_REASONS,
  QUOTATION_STATUSES,
  TAX_TYPES,
} from "@/constants/quotations";

const optionalText = z.string().trim().max(240).optional().or(z.literal(""));
const qty = z.number().positive("Quantity must be greater than zero.");
const nonNeg = z.number().min(0, "Value cannot be negative.");

export const createQuotationSchema = z.object({
  costingId: z.string().min(1, "Select an approved costing."),
  contactId: optionalText,
  salesOwner: z.string().min(1, "Assign a sales owner."),
  currency: z.enum(QUOTATION_CURRENCIES),
  quotationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  validUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Valid until is required."),
  overrideReason: optionalText,
});

export type CreateQuotationValues = z.infer<typeof createQuotationSchema>;

export const quotationHeaderSchema = z.object({
  contactId: optionalText,
  salesOwner: z.string().min(1),
  quotationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  validUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: longText,
  internalNotes: longText,
  customerNotes: longText,
  billingAddress: optionalText,
  shippingAddress: optionalText,
});

export type QuotationHeaderValues = z.infer<typeof quotationHeaderSchema>;

export const quotationItemSchema = z.object({
  productId: optionalText,
  productName: z.string().trim().min(1).max(180),
  description: longText,
  dosageForm: optionalText,
  strength: optionalText,
  packaging: optionalText,
  packSize: optionalText,
  quantity: qty,
  quantityUnit: z.enum(QUANTITY_UNITS),
  unitPrice: nonNeg,
  discountType: z.enum(DISCOUNT_TYPES),
  discountValue: nonNeg,
  taxType: z.enum(TAX_TYPES),
  taxRate: nonNeg,
  costingId: optionalText,
  moq: z.number().min(0).optional(),
  remarks: longText,
});

export type QuotationItemValues = z.infer<typeof quotationItemSchema>;

export const quotationChargeSchema = z.object({
  chargeType: z.enum(CHARGE_TYPES),
  description: z.string().trim().min(1).max(180),
  amount: nonNeg,
});

export type QuotationChargeValues = z.infer<typeof quotationChargeSchema>;

export const quotationTermsSchema = z.object({
  paymentTerms: z.enum(PAYMENT_TERM_OPTIONS_VALUES),
  paymentTermsCustom: optionalText,
  deliveryTerms: z.enum(DELIVERY_TERM_OPTIONS_VALUES),
  deliveryTermsCustom: optionalText,
  shippingTerms: optionalText,
  priceBasis: optionalText,
  estimatedLeadTime: z.number().min(0).optional(),
  leadTimeUnit: z.enum(LEAD_TIME_UNITS).optional(),
  packagingTerms: longText,
  artworkTerms: longText,
  sampleTerms: longText,
  regulatoryTerms: longText,
  cancellationTerms: longText,
  otherTerms: longText,
  taxesNote: longText,
  freightNote: longText,
  moqNote: longText,
  headerDiscountType: z.enum(DISCOUNT_TYPES),
  headerDiscountValue: nonNeg,
  customerNotes: longText,
});

export type QuotationTermsValues = z.infer<typeof quotationTermsSchema>;

export const quotationStatusSchema = z.object({
  status: z.enum(QUOTATION_STATUSES),
});

export const quotationApprovalSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED", "SUBMITTED"]),
  remarks: longText,
  reason: optionalText,
}).superRefine((value, ctx) => {
  if (value.decision === "REJECTED" && (!value.reason || value.reason.trim().length < 4)) {
    ctx.addIssue({ code: "custom", path: ["reason"], message: "A rejection reason is required." });
  }
});

export type QuotationApprovalValues = z.infer<typeof quotationApprovalSchema>;

export const quotationSendSchema = z.object({
  recipient: z.string().email("Enter a valid customer email."),
  cc: optionalText,
  subject: z.string().trim().min(1).max(180),
  message: z.string().trim().min(1).max(4000),
});

export type QuotationSendValues = z.infer<typeof quotationSendSchema>;

export const quotationAcceptSchema = z.object({
  acceptanceRemarks: longText,
});

export const quotationRejectSchema = z.object({
  rejectionReason: z.enum(QUOTATION_REJECTION_REASONS),
  rejectionRemarks: z.string().trim().min(1, "A rejection reason is required.").max(4000),
});

export type QuotationRejectValues = z.infer<typeof quotationRejectSchema>;
