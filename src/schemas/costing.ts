import { z } from "zod";
import { longText } from "@/schemas/common";
import { QUANTITY_UNITS } from "@/constants/pharma";
import {
  ADJUSTMENT_TYPES,
  COSTING_CURRENCIES,
  COSTING_STATUSES,
  DOCUMENTATION_ACTIVITIES,
  LABOR_CATEGORIES,
  MARGIN_TYPES,
  MATERIAL_TYPES,
  OVERHEAD_MODES,
  OVERHEAD_TYPES,
  PACKAGING_LEVELS,
  PRICE_ADJUSTMENT_TYPES,
  QUALITY_ACTIVITIES,
  REGULATORY_ACTIVITIES,
  UTILITY_TYPES,
} from "@/constants/costing";

const optionalText = z.string().trim().max(240).optional().or(z.literal(""));
const qty = z.number().positive("Quantity must be greater than zero.");
const nonNeg = z.number().min(0, "Value cannot be negative.");

export const createCostingSchema = z.object({
  feasibilityId: z.string().min(1, "Select a feasibility assessment."),
  assignedTo: z.string().min(1, "Assign a costing owner."),
  currency: z.enum(COSTING_CURRENCIES),
  costingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  validUntil: optionalText,
  baseQuantity: qty,
  quantityUnit: z.enum(QUANTITY_UNITS),
  batchSize: z.number().positive().optional(),
  numberOfBatches: z.number().min(0).optional(),
  annualQuantity: z.number().min(0).optional(),
  overrideReason: optionalText,
});

export type CreateCostingValues = z.infer<typeof createCostingSchema>;

export const costingHeaderSchema = z.object({
  assignedTo: z.string().min(1),
  currency: z.enum(COSTING_CURRENCIES),
  costingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  validUntil: optionalText,
  baseQuantity: qty,
  quantityUnit: z.enum(QUANTITY_UNITS),
  batchSize: z.number().positive().optional(),
  numberOfBatches: z.number().min(0).optional(),
  annualQuantity: z.number().min(0).optional(),
  remarks: longText,
  market: optionalText,
  paymentTermsPlaceholder: optionalText,
  deliveryTermsPlaceholder: optionalText,
  specialRequirement: longText,
  expectedYieldPercent: nonNeg.optional(),
  materialWastagePercent: nonNeg.optional(),
  productionLossPercent: nonNeg.optional(),
  packagingLossPercent: nonNeg.optional(),
});

export type CostingHeaderValues = z.infer<typeof costingHeaderSchema>;

export const costingStatusSchema = z.object({
  status: z.enum(COSTING_STATUSES),
});

export const materialLineSchema = z.object({
  materialType: z.enum(MATERIAL_TYPES),
  materialName: z.string().trim().min(1).max(180),
  quantityRequired: qty,
  unit: z.string().trim().min(1).max(40),
  unitCost: nonNeg,
  wastagePercent: nonNeg,
  supplierId: optionalText,
  remarks: longText,
});

export type MaterialLineValues = z.infer<typeof materialLineSchema>;

export const packagingLineSchema = z.object({
  level: z.enum(PACKAGING_LEVELS),
  materialName: z.string().trim().min(1).max(180),
  packagingType: optionalText,
  packSize: optionalText,
  quantityRequired: qty,
  unit: z.string().trim().min(1).max(40),
  unitCost: nonNeg,
  wastagePercent: nonNeg,
  remarks: longText,
});

export type PackagingLineValues = z.infer<typeof packagingLineSchema>;

export const laborLineSchema = z.object({
  department: z.string().trim().min(1).max(80),
  category: z.enum(LABOR_CATEGORIES),
  hours: nonNeg,
  hourlyCost: nonNeg,
});

export const machineLineSchema = z.object({
  machine: z.string().trim().min(1).max(120),
  machineHours: nonNeg,
  hourlyRate: nonNeg,
});

export const utilityLineSchema = z.object({
  utilityType: z.enum(UTILITY_TYPES),
  consumption: nonNeg,
  unit: z.string().trim().min(1).max(40),
  rate: nonNeg,
});

export const manufacturingSchema = z.object({
  manufacturingSite: optionalText,
  manufacturingUnit: optionalText,
  productionLine: optionalText,
  batchSize: z.number().positive().optional(),
  numberOfBatches: z.number().min(0).optional(),
  setupCost: nonNeg,
  changeoverCost: nonNeg,
  processingCost: nonNeg,
  cleaningCost: nonNeg,
  labor: z.array(laborLineSchema),
  machines: z.array(machineLineSchema),
  utilities: z.array(utilityLineSchema),
});

export type ManufacturingValues = z.infer<typeof manufacturingSchema>;

export const qualityLineSchema = z.object({
  activity: z.enum(QUALITY_ACTIVITIES),
  quantity: qty,
  unitCost: nonNeg,
  remarks: longText,
});

export const activityCostSchema = z.object({
  activity: z.string().trim().min(1).max(180),
  cost: nonNeg,
  remarks: longText,
});

export const regulatoryLineSchema = activityCostSchema.extend({
  activity: z.enum(REGULATORY_ACTIVITIES),
});

export const documentationLineSchema = activityCostSchema.extend({
  activity: z.enum(DOCUMENTATION_ACTIVITIES),
});

export const overheadLineSchema = z.object({
  overheadType: z.enum(OVERHEAD_TYPES),
  mode: z.enum(OVERHEAD_MODES),
  percent: nonNeg.optional(),
  amount: nonNeg.optional(),
  remarks: longText,
}).superRefine((value, ctx) => {
  if (value.mode === "PERCENTAGE" && (value.percent == null || value.percent < 0)) {
    ctx.addIssue({ code: "custom", path: ["percent"], message: "Enter an overhead percentage." });
  }
  if (value.mode === "FIXED" && (value.amount == null || value.amount < 0)) {
    ctx.addIssue({ code: "custom", path: ["amount"], message: "Enter a fixed overhead amount." });
  }
});

export const materialAdjustmentSchema = z.object({
  adjustmentType: z.enum(ADJUSTMENT_TYPES),
  amount: z.number().positive("Adjustment amount must be greater than zero."),
  reason: z.string().trim().min(4, "A reason is required.").max(400),
});

export type MaterialAdjustmentValues = z.infer<typeof materialAdjustmentSchema>;

export const pricingSchema = z.object({
  marginType: z.enum(MARGIN_TYPES),
  marginValue: nonNeg,
}).superRefine((value, ctx) => {
  if (value.marginType === "PERCENTAGE_MARGIN" && value.marginValue >= 100) {
    ctx.addIssue({ code: "custom", path: ["marginValue"], message: "Margin must be less than 100%." });
  }
});

export type PricingValues = z.infer<typeof pricingSchema>;

export const volumeTierSchema = z.object({
  minimumQuantity: z.number().min(0),
  maximumQuantity: z.number().positive().optional(),
  unitPrice: nonNeg,
  marginPercent: nonNeg.optional(),
});

export const volumeTiersSchema = z.object({
  tiers: z.array(volumeTierSchema),
}).superRefine((value, ctx) => {
  const sorted = [...value.tiers].sort((a, b) => a.minimumQuantity - b.minimumQuantity);
  for (let index = 1; index < sorted.length; index += 1) {
    const prev = sorted[index - 1];
    const current = sorted[index];
    if (!prev || !current) continue;
    const prevMax = prev.maximumQuantity ?? Number.POSITIVE_INFINITY;
    if (current.minimumQuantity <= prevMax) {
      ctx.addIssue({ code: "custom", path: ["tiers", index, "minimumQuantity"], message: "Quantity tiers cannot overlap." });
    }
  }
});

export const priceAdjustmentSchema = z.object({
  type: z.enum(PRICE_ADJUSTMENT_TYPES),
  amount: nonNeg.optional(),
  percentage: nonNeg.optional(),
  reason: z.string().trim().min(4).max(400),
}).superRefine((value, ctx) => {
  if ((value.amount == null || value.amount === 0) && (value.percentage == null || value.percentage === 0)) {
    ctx.addIssue({ code: "custom", path: ["amount"], message: "Enter an amount or percentage." });
  }
});

export type PriceAdjustmentValues = z.infer<typeof priceAdjustmentSchema>;

export const costingApprovalSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED", "REVIEWED"]),
  remarks: z.string().trim().min(2).max(2000),
  reason: optionalText,
}).superRefine((value, ctx) => {
  if (value.decision === "REJECTED" && (!value.reason || value.reason.trim().length < 4)) {
    ctx.addIssue({ code: "custom", path: ["reason"], message: "A rejection reason is required." });
  }
});

export type CostingApprovalValues = z.infer<typeof costingApprovalSchema>;

export const costingVersionSchema = z.object({
  changeReason: z.string().trim().min(4).max(400),
});
