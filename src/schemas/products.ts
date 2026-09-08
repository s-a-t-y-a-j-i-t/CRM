import { z } from "zod";
import { longText } from "@/schemas/common";
import { INGREDIENT_ROLES, PACKAGING_TYPES, PHARMA_DOSAGE_FORMS, STRENGTH_UNITS } from "@/constants/pharma";
import {
  PHARMACOPOEIA_STANDARDS,
  PRODUCT_CATEGORIES,
  PRODUCT_MARKET_TYPES,
  PRODUCT_STATUSES,
  REGULATORY_STATUSES,
} from "@/constants/products";

const optionalText = z.string().trim().max(240).optional().or(z.literal(""));

export const productCompositionSchema = z.object({
  id: z.string(),
  ingredientName: z.string().trim().min(1, "Ingredient is required.").max(180),
  activeIngredient: z.boolean(),
  strength: z.string().trim().min(1, "Strength is required.").max(40),
  unit: z.string().trim().min(1, "Unit is required.").max(20),
  quantity: optionalText,
  role: z.enum(INGREDIENT_ROLES),
  sortOrder: z.number().int().min(0),
});

export const productSpecificationSchema = z.object({
  id: z.string().optional(),
  specificationType: z.string().trim().min(1, "Specification type is required.").max(80),
  parameter: z.string().trim().min(1, "Parameter is required.").max(120),
  limit: z.string().trim().min(1, "Limit is required.").max(80),
  unit: optionalText,
  testMethod: optionalText,
  remarks: longText,
});

export const productFormSchema = z.object({
  productName: z.string().trim().min(2, "Product name is required.").max(180),
  genericName: z.string().trim().min(2, "Generic name is required.").max(180),
  brandName: optionalText,
  productType: z.enum(PHARMA_DOSAGE_FORMS),
  productCategory: z.enum(PRODUCT_CATEGORIES),
  dosageForm: z.enum(PHARMA_DOSAGE_FORMS),
  strength: optionalText,
  strengthUnit: z.enum(STRENGTH_UNITS).optional().or(z.literal("")),
  composition: z.array(productCompositionSchema).min(1, "Add at least one composition line."),
  specifications: z.array(productSpecificationSchema).optional(),
  therapeuticCategory: optionalText,
  pharmacopoeiaStandard: z.enum(PHARMACOPOEIA_STANDARDS).optional().or(z.literal("")),
  manufacturingSite: optionalText,
  manufacturingUnit: optionalText,
  packagingType: z.enum(PACKAGING_TYPES).optional().or(z.literal("")),
  standardPackSize: optionalText,
  marketType: z.enum(PRODUCT_MARKET_TYPES),
  status: z.enum(PRODUCT_STATUSES),
  regulatoryStatus: z.enum(REGULATORY_STATUSES).optional().or(z.literal("")),
  description: longText,
  notes: longText,
});

export type ProductFormValues = z.infer<typeof productFormSchema>;

export const productStatusSchema = z.object({
  status: z.enum(PRODUCT_STATUSES),
});
