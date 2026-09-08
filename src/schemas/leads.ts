import { z } from "zod";
import { longText } from "@/schemas/common";
import {
  DOSAGE_FORMS,
  FOLLOW_UP_STATUSES,
  LEAD_ACTIVITY_TYPES,
  LEAD_PRIORITIES,
  LEAD_SOURCES,
  LEAD_STATUSES,
  LEAD_TYPES,
  LOST_REASONS,
} from "@/types/leads";

const optionalText = z.string().trim().max(240).optional().or(z.literal(""));
const phoneSchema = z
  .string()
  .trim()
  .max(20)
  .refine((value) => !value || /^[+]?[\d\s()-]{8,20}$/.test(value), "Enter a valid phone number.")
  .optional()
  .or(z.literal(""));

export const leadFormSchema = z.object({
  companyName: z.string().trim().min(2, "Company name is required.").max(180),
  website: z
    .string()
    .trim()
    .max(200)
    .refine((value) => !value || /^https?:\/\/.+/i.test(value), "Enter a valid website URL.")
    .optional()
    .or(z.literal("")),
  country: optionalText,
  state: optionalText,
  contactName: z.string().trim().min(2, "Contact name is required.").max(120),
  contactDesignation: optionalText,
  email: z.string().trim().email("Enter a valid email.").max(180).optional().or(z.literal("")),
  phone: phoneSchema,
  alternatePhone: phoneSchema,
  whatsapp: phoneSchema,
  leadSource: z.enum(LEAD_SOURCES),
  leadType: z.enum(LEAD_TYPES).optional().or(z.literal("")),
  assignedTo: z.string().min(1, "Assign a sales person."),
  priority: z.enum(LEAD_PRIORITIES),
  customerId: optionalText,
  contactId: optionalText,
  productInterest: optionalText,
  dosageForm: z.enum(DOSAGE_FORMS).optional().or(z.literal("")),
  strength: optionalText,
  composition: z.string().trim().max(800).optional().or(z.literal("")),
  requiredQuantity: z.number().min(0, "Quantity cannot be negative.").optional(),
  annualQuantity: z.number().min(0, "Quantity cannot be negative.").optional(),
  targetPrice: z.number().min(0, "Price cannot be negative.").optional(),
  expectedBusinessValue: z.number().min(0, "Business value cannot be negative."),
  expectedClosingDate: z.string().optional().or(z.literal("")),
  nextFollowUpDate: z.string().optional().or(z.literal("")),
  description: longText,
  notes: longText,
  status: z.enum(LEAD_STATUSES),
}).superRefine((value, ctx) => {
  if (value.expectedClosingDate && Number.isNaN(Date.parse(value.expectedClosingDate))) {
    ctx.addIssue({ code: "custom", path: ["expectedClosingDate"], message: "Enter a valid expected closing date." });
  }
  if (value.nextFollowUpDate && Number.isNaN(Date.parse(value.nextFollowUpDate))) {
    ctx.addIssue({ code: "custom", path: ["nextFollowUpDate"], message: "Enter a valid follow-up date." });
  }
});

export type LeadFormValues = z.infer<typeof leadFormSchema>;

export const leadStatusSchema = z.object({
  status: z.enum(LEAD_STATUSES),
  lostReason: z.enum(LOST_REASONS).optional(),
  lostNotes: longText,
});

export const leadAssignSchema = z.object({
  assignedTo: z.string().min(1),
});

export const leadActivitySchema = z.object({
  type: z.enum(LEAD_ACTIVITY_TYPES),
  subject: z.string().trim().min(2).max(180),
  description: longText,
  activityDate: z.string().min(1),
  nextFollowUpDate: z.string().optional().or(z.literal("")),
});

export type LeadActivityFormValues = z.infer<typeof leadActivitySchema>;

export const leadFollowUpSchema = z.object({
  followUpAt: z.string().min(1, "Follow-up date is required."),
  assignedTo: z.string().min(1),
  purpose: z.string().trim().min(2).max(180),
  notes: longText,
  priority: z.enum(LEAD_PRIORITIES),
  status: z.enum(FOLLOW_UP_STATUSES),
});

export type LeadFollowUpFormValues = z.infer<typeof leadFollowUpSchema>;

export const leadNoteSchema = z.object({
  text: z.string().trim().min(2).max(2000),
});

export const leadLostSchema = z.object({
  lostReason: z.enum(LOST_REASONS),
  lostNotes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const leadConvertSchema = z.object({
  customerMode: z.enum(["existing", "new"]),
  customerId: z.string().optional().or(z.literal("")),
  contactMode: z.enum(["existing", "new"]),
  contactId: z.string().optional().or(z.literal("")),
  createEnquiry: z.boolean(),
});

export type LeadConvertValues = z.infer<typeof leadConvertSchema>;
