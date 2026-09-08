import { z } from "zod";
import { longText } from "@/schemas/common";
import { ENQUIRY_PRIORITIES } from "@/types/enquiries";
import {
  CLARIFICATION_STATUSES,
  DEPARTMENT_REVIEW_STATUSES,
  EVALUATION_FACTOR_STATUSES,
  FEASIBILITY_DECISIONS,
  FEASIBILITY_DEPARTMENTS,
  FEASIBILITY_STATUSES,
  NOT_FEASIBLE_REASONS,
  SUPPLY_AVAILABILITY,
} from "@/constants/feasibility";

const optionalText = z.string().trim().max(240).optional().or(z.literal(""));
const departmentId = z.enum(FEASIBILITY_DEPARTMENTS.map((item) => item.id) as [string, ...string[]]);

export const startFeasibilitySchema = z.object({
  enquiryId: z.string().min(1),
  assignedTo: z.string().min(1, "Assign a feasibility owner."),
  technicalReviewer: optionalText,
  priority: z.enum(ENQUIRY_PRIORITIES),
  targetCompletionDate: optionalText,
});

export type StartFeasibilityValues = z.infer<typeof startFeasibilitySchema>;

export const feasibilityUpdateSchema = z.object({
  assignedTo: z.string().min(1, "Assign a feasibility owner."),
  technicalReviewer: optionalText,
  priority: z.enum(ENQUIRY_PRIORITIES),
  targetCompletionDate: optionalText,
});

export type FeasibilityUpdateValues = z.infer<typeof feasibilityUpdateSchema>;

export const feasibilityAssignSchema = z.object({
  assignedTo: z.string().min(1),
  technicalReviewer: optionalText,
  departmentId: optionalText,
  reviewerId: optionalText,
});

export const feasibilityStatusSchema = z.object({
  status: z.enum(FEASIBILITY_STATUSES),
});

export const departmentReviewSchema = z.object({
  status: z.enum(DEPARTMENT_REVIEW_STATUSES),
  decision: z.enum(FEASIBILITY_DECISIONS).optional(),
  remarks: longText,
  manufacturingLine: optionalText,
  availableCapacity: optionalText,
  requiredCapacity: optionalText,
  batchSize: optionalText,
  estimatedBatches: z.number().min(0).optional(),
  processAvailable: z.boolean().optional(),
  equipmentAvailable: z.boolean().optional(),
  technologyAvailable: z.boolean().optional(),
  qualityRequirements: longText,
  specificationAvailability: optionalText,
  qualitySystemRequirements: longText,
  documentationRequirements: longText,
  specialRequirements: longText,
  testingRequirement: longText,
  methodAvailable: z.boolean().optional(),
  instrumentAvailability: optionalText,
  referenceStandardAvailability: optionalText,
  sampleRequirement: optionalText,
  targetMarket: optionalText,
  regulatoryPath: optionalText,
  registrationRequirement: longText,
  customerRegistrationRequirement: longText,
  documentationRequirement: longText,
  licenseRequirement: longText,
  packagingType: optionalText,
  packSize: optionalText,
  materialAvailability: optionalText,
  artworkRequirement: optionalText,
  specialRequirement: longText,
  apiAvailability: z.enum(SUPPLY_AVAILABILITY).optional(),
  excipientAvailability: z.enum(SUPPLY_AVAILABILITY).optional(),
  packagingMaterialAvailability: z.enum(SUPPLY_AVAILABILITY).optional(),
  supplierAvailability: z.enum(SUPPLY_AVAILABILITY).optional(),
  leadTime: optionalText,
});

export type DepartmentReviewValues = z.infer<typeof departmentReviewSchema>;

export const clarificationSchema = z.object({
  departmentId: z.union([departmentId, z.literal("SALES")]),
  question: z.string().trim().min(4, "Enter the clarification question.").max(500),
  audience: z.enum(["INTERNAL", "SALES"]),
});

export const clarificationResponseSchema = z.object({
  response: z.string().trim().min(2, "Enter a response.").max(2000),
  status: z.enum(CLARIFICATION_STATUSES).optional(),
});

export const evaluationFactorSchema = z.object({
  id: z.string(),
  status: z.enum(EVALUATION_FACTOR_STATUSES),
  remarks: longText,
  score: z.number().min(0).max(10).optional(),
  weight: z.number().min(0).max(100),
});

export const evaluationSchema = z.object({
  factors: z.array(evaluationFactorSchema).min(1),
});

export type EvaluationFormValues = z.infer<typeof evaluationSchema>;

export const feasibilityDecisionSchema = z.object({
  decision: z.enum(FEASIBILITY_DECISIONS),
  remarks: z.string().trim().min(4, "Remarks are required.").max(2000),
  notFeasibleReason: z.enum(NOT_FEASIBLE_REASONS).optional(),
  conditions: z
    .array(
      z.object({
        condition: z.string().trim().min(4).max(400),
        department: departmentId,
        owner: z.string().min(1),
        dueDate: optionalText,
      }),
    )
    .optional(),
}).superRefine((value, ctx) => {
  if (value.decision === "NOT_FEASIBLE" && !value.notFeasibleReason) {
    ctx.addIssue({ code: "custom", path: ["notFeasibleReason"], message: "A reason is required when the product is not feasible." });
  }
  if (value.decision === "PARTIALLY_FEASIBLE" && (!value.conditions || value.conditions.length === 0)) {
    ctx.addIssue({ code: "custom", path: ["conditions"], message: "Add at least one condition for partial feasibility." });
  }
});

export type FeasibilityDecisionValues = z.infer<typeof feasibilityDecisionSchema>;
