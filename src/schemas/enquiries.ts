import { z } from "zod";
import { longText } from "@/schemas/common";
import {
  ENQUIRY_CURRENCIES,
  INGREDIENT_ROLES,
  PACKAGING_TYPES,
  PHARMA_DOSAGE_FORMS,
  PRICE_BASES,
  QUANTITY_UNITS,
} from "@/constants/pharma";
import {
  ARTWORK_STATUSES,
  ENQUIRY_ACTIVITY_TYPES,
  ENQUIRY_FOLLOW_UP_STATUSES,
  ENQUIRY_PRIORITIES,
  ENQUIRY_SOURCES,
  ENQUIRY_STATUSES,
  ENQUIRY_TYPES,
  MARKET_TYPES,
  SAMPLE_STATUSES,
  SPECIFICATION_STATUSES,
} from "@/types/enquiries";

const optionalText = z.string().trim().max(240).optional().or(z.literal(""));

export const compositionLineSchema = z.object({
  id: z.string(),
  ingredient: z.string().trim().min(1, "Ingredient is required.").max(180),
  strength: z.string().trim().min(1, "Strength is required.").max(40),
  unit: z.string().trim().min(1, "Unit is required.").max(20),
  quantityRatio: optionalText,
  role: z.enum(INGREDIENT_ROLES),
  sortOrder: z.number().int().min(0),
});

export const productRequirementSchema = z.object({
  productMasterId: optionalText,
  isNewProductRequirement: z.boolean(),
  productName: z.string().trim().min(2, "Product name is required.").max(180),
  genericName: optionalText,
  brandName: optionalText,
  dosageForm: z.enum(PHARMA_DOSAGE_FORMS),
  strength: optionalText,
  composition: z.array(compositionLineSchema).min(1, "Add at least one composition line."),
  primaryType: z.enum(PACKAGING_TYPES).optional().or(z.literal("")),
  secondaryType: z.enum(PACKAGING_TYPES).optional().or(z.literal("")),
  tertiaryType: z.enum(PACKAGING_TYPES).optional().or(z.literal("")),
  packSize: optionalText,
  unitsPerPack: z.number().min(0).optional(),
  packagingNotes: longText,
  requiredQuantity: z.number().min(0, "Quantity cannot be negative.").optional(),
  quantityUnit: z.enum(QUANTITY_UNITS),
  annualQuantity: z.number().min(0, "Quantity cannot be negative.").optional(),
  batchQuantity: z.number().min(0, "Quantity cannot be negative.").optional(),
  moqRequirement: z.number().min(0, "Quantity cannot be negative.").optional(),
  targetPrice: z.number().min(0, "Price cannot be negative.").optional(),
  currency: z.enum(ENQUIRY_CURRENCIES),
  priceBasis: z.enum(PRICE_BASES).optional().or(z.literal("")),
  market: optionalText,
  country: optionalText,
  marketType: z.enum(MARKET_TYPES).optional().or(z.literal("")),
  regulatoryRequirement: longText,
  customerRegulatoryRequirement: longText,
  licenseRequirement: longText,
  regulatoryNotes: longText,
  artworkStatus: z.enum(ARTWORK_STATUSES),
  artworkNotes: longText,
  specificationStatus: z.enum(SPECIFICATION_STATUSES),
  specificationType: optionalText,
  specificationNotes: longText,
  sampleRequired: z.boolean(),
  sampleQuantity: z.number().min(0).optional(),
  sampleType: optionalText,
  sampleDeliveryDate: z.string().optional().or(z.literal("")),
  sampleStatus: z.enum(SAMPLE_STATUSES),
  sampleNotes: longText,
  stabilityRequired: z.boolean(),
  stabilityType: optionalText,
  storageCondition: optionalText,
  stabilityDuration: optionalText,
  stabilityNotes: longText,
  requiredDeliveryDate: z.string().optional().or(z.literal("")),
  expectedLeadTime: optionalText,
  deliveryLocation: optionalText,
  logisticsNotes: longText,
  specialRequirements: longText,
  changeReason: z.string().trim().max(400).optional().or(z.literal("")),
});

export type ProductRequirementFormValues = z.infer<typeof productRequirementSchema>;

export const enquiryFormSchema = z.object({
  customerId: z.string().min(1, "Select a customer."),
  contactId: z.string().min(1, "Select a contact."),
  leadId: optionalText,
  enquirySource: z.enum(ENQUIRY_SOURCES),
  enquiryType: z.enum(ENQUIRY_TYPES),
  priority: z.enum(ENQUIRY_PRIORITIES),
  assignedTo: z.string().min(1, "Assign an owner."),
  receivedDate: z.string().min(1, "Received date is required."),
  expectedDecisionDate: z.string().optional().or(z.literal("")),
  description: longText,
  internalNotes: longText,
  status: z.enum(ENQUIRY_STATUSES),
  requirement: productRequirementSchema,
}).superRefine((value, ctx) => {
  if (value.expectedDecisionDate && Number.isNaN(Date.parse(value.expectedDecisionDate))) {
    ctx.addIssue({ code: "custom", path: ["expectedDecisionDate"], message: "Enter a valid decision date." });
  }
});

export type EnquiryFormValues = z.infer<typeof enquiryFormSchema>;

export const enquiryStatusSchema = z.object({
  status: z.enum(ENQUIRY_STATUSES),
  lostReason: longText,
});

export const enquiryAssignSchema = z.object({
  assignedTo: z.string().min(1),
});

export const enquiryActivitySchema = z.object({
  type: z.enum(ENQUIRY_ACTIVITY_TYPES),
  subject: z.string().trim().min(2).max(180),
  description: longText,
  activityDate: z.string().min(1),
  nextFollowUpDate: z.string().optional().or(z.literal("")),
});

export type EnquiryActivityFormValues = z.infer<typeof enquiryActivitySchema>;

export const enquiryFollowUpSchema = z.object({
  followUpAt: z.string().min(1, "Follow-up date is required."),
  assignedTo: z.string().min(1),
  purpose: z.string().trim().min(2).max(180),
  notes: longText,
  priority: z.enum(ENQUIRY_PRIORITIES),
  status: z.enum(ENQUIRY_FOLLOW_UP_STATUSES),
});

export type EnquiryFollowUpFormValues = z.infer<typeof enquiryFollowUpSchema>;

export const enquiryNoteSchema = z.object({
  text: z.string().trim().min(2).max(2000),
});
