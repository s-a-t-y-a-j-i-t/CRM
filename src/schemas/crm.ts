import { z } from "zod";
import { currencySchema, longText } from "@/schemas/common";
import {
  CONTACT_STATUSES,
  CONTACT_TYPES,
  CUSTOMER_ACTIVITY_STATUSES,
  CUSTOMER_ACTIVITY_TYPES,
  CUSTOMER_CATEGORIES,
  CUSTOMER_STATUSES,
  CUSTOMER_TYPES,
} from "@/types/crm";

const optionalText = z.string().trim().max(240).optional().or(z.literal(""));
const phoneSchema = z
  .string()
  .trim()
  .max(20)
  .refine((value) => !value || /^[+]?[\d\s()-]{8,20}$/.test(value), "Enter a valid phone number.")
  .optional()
  .or(z.literal(""));

export const customerFormSchema = z.object({
  companyName: z.string().trim().min(2, "Company name is required.").max(180),
  legalName: optionalText,
  shortName: optionalText,
  customerType: z.enum(CUSTOMER_TYPES),
  customerCategory: z.enum(CUSTOMER_CATEGORIES).optional().or(z.literal("")),
  website: z
    .string()
    .trim()
    .max(200)
    .refine((value) => !value || /^https?:\/\/.+/i.test(value), "Enter a valid website URL.")
    .optional()
    .or(z.literal("")),
  primaryEmail: z.string().trim().email("Enter a valid email.").max(180).optional().or(z.literal("")),
  primaryPhone: phoneSchema,
  alternatePhone: phoneSchema,
  billingAddress: z.string().trim().max(400).optional().or(z.literal("")),
  shippingAddress: z.string().trim().max(400).optional().or(z.literal("")),
  sameAsBilling: z.boolean(),
  city: optionalText,
  state: optionalText,
  country: optionalText,
  postalCode: z.string().trim().max(16).optional().or(z.literal("")),
  gstin: z
    .string()
    .trim()
    .max(15)
    .refine((value) => !value || /^[0-9A-Z]{15}$/i.test(value), "GSTIN must be 15 characters.")
    .optional()
    .or(z.literal("")),
  pan: z
    .string()
    .trim()
    .max(10)
    .refine((value) => !value || /^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(value), "Enter a valid PAN.")
    .optional()
    .or(z.literal("")),
  drugLicenseNumber: optionalText,
  licenseExpiryDate: z.string().optional().or(z.literal("")),
  paymentTerms: optionalText,
  creditLimit: z.number().min(0, "Credit limit cannot be negative."),
  currency: currencySchema,
  assignedSalesPersonId: optionalText,
  customerSince: z.string().optional().or(z.literal("")),
  notes: longText,
  status: z.enum(CUSTOMER_STATUSES),
});

export type CustomerFormValues = z.infer<typeof customerFormSchema>;

export const contactFormSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required.").max(80),
  lastName: z.string().trim().max(80).optional().or(z.literal("")),
  designation: optionalText,
  department: optionalText,
  email: z.string().trim().email("Enter a valid email.").max(180).optional().or(z.literal("")),
  phone: phoneSchema,
  alternatePhone: phoneSchema,
  whatsapp: phoneSchema,
  contactType: z.enum(CONTACT_TYPES),
  isPrimary: z.boolean(),
  status: z.enum(CONTACT_STATUSES),
  notes: longText,
});

export type ContactFormValues = z.infer<typeof contactFormSchema>;

export const customerNoteSchema = z.object({
  text: z.string().trim().min(2, "Enter a note.").max(2000),
});

export const customerActivitySchema = z.object({
  type: z.enum(CUSTOMER_ACTIVITY_TYPES),
  subject: z.string().trim().min(2, "Subject is required.").max(180),
  description: longText,
  contactId: optionalText,
  assignedTo: optionalText,
  activityDate: z.string().min(1, "Activity date is required."),
  nextFollowUpDate: z.string().optional().or(z.literal("")),
  status: z.enum(CUSTOMER_ACTIVITY_STATUSES),
});

export type CustomerActivityFormValues = z.infer<typeof customerActivitySchema>;

export const customerStatusSchema = z.object({
  status: z.enum(CUSTOMER_STATUSES),
});
