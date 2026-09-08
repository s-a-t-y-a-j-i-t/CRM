import { isDemoMode } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { authorizeClient } from "@/lib/auth/authorize-client";
import { assertCan } from "@/lib/rbac/can";
import { useFeasibilityStore } from "@/stores/feasibility-store";
import { useIdentityStore } from "@/stores/identity-store";
import { getFeasibilityById, changeFeasibilityStatus } from "@/services/feasibility/feasibility.service";
import { notifyFeasibilityEvent } from "@/services/feasibility/feasibility-notify";
import type { DepartmentReviewValues } from "@/schemas/feasibility";
import type { AuthenticatedUser } from "@/types/rbac";
import type { DepartmentReview, FeasibilityClarification } from "@/types/feasibility";
import type { FeasibilityDepartmentId } from "@/constants/feasibility";

export function listReviews(feasibilityId: string): DepartmentReview[] {
  return useFeasibilityStore.getState().reviews.filter((item) => item.feasibilityId === feasibilityId);
}

export function listClarifications(feasibilityId: string): FeasibilityClarification[] {
  return useFeasibilityStore.getState().clarifications.filter((item) => item.feasibilityId === feasibilityId);
}

export async function createDepartmentReview(
  feasibilityId: string,
  departmentId: FeasibilityDepartmentId,
  actor: AuthenticatedUser,
): Promise<DepartmentReview> {
  assertCan(actor, "feasibility.review");
  await authorizeClient("feasibility.review");
  getFeasibilityById(feasibilityId, actor);
  const existing = listReviews(feasibilityId).find((item) => item.departmentId === departmentId);
  if (existing) return existing;
  throw new AppError("VALIDATION", "Department reviews are created with the assessment. Enable the department in configuration instead of adding ad-hoc reviews.", 400);
}

export async function assignDepartmentReviewer(
  reviewId: string,
  reviewerId: string,
  actor: AuthenticatedUser,
): Promise<DepartmentReview> {
  assertCan(actor, "feasibility.assign");
  await authorizeClient("feasibility.assign");
  const review = useFeasibilityStore.getState().reviews.find((item) => item.id === reviewId);
  if (!review) throw new AppError("NOT_FOUND", "Department review not found.", 404);
  getFeasibilityById(review.feasibilityId, actor);
  const reviewer = useIdentityStore.getState().users.find((item) => item.id === reviewerId);
  if (!reviewer) throw new AppError("VALIDATION", "Reviewer was not found.", 400);
  const next = useFeasibilityStore.getState().updateReview(reviewId, { reviewerId, reviewerName: reviewer.displayName }, actor);
  await notifyFeasibilityEvent({
    kind: "department_review_assigned",
    title: "Department review assigned",
    body: `${review.departmentName} review assigned to ${reviewer.displayName}.`,
    href: `/crm/feasibility/${review.feasibilityId}/review`,
    recipientId: reviewerId,
    feasibilityId: review.feasibilityId,
    actor,
  });
  return next;
}

export async function startDepartmentReview(reviewId: string, actor: AuthenticatedUser): Promise<DepartmentReview> {
  assertCan(actor, "feasibility.review");
  await authorizeClient("feasibility.review");
  const review = useFeasibilityStore.getState().reviews.find((item) => item.id === reviewId);
  if (!review) throw new AppError("NOT_FOUND", "Department review not found.", 404);
  getFeasibilityById(review.feasibilityId, actor);
  return useFeasibilityStore.getState().updateReview(
    reviewId,
    { status: "IN_REVIEW", startedAt: new Date().toISOString(), reviewerId: review.reviewerId ?? actor.uid, reviewerName: review.reviewerName ?? actor.displayName },
    actor,
  );
}

export async function submitDepartmentReview(
  reviewId: string,
  values: DepartmentReviewValues,
  actor: AuthenticatedUser,
): Promise<DepartmentReview> {
  assertCan(actor, "feasibility.review");
  await authorizeClient("feasibility.review");
  const review = useFeasibilityStore.getState().reviews.find((item) => item.id === reviewId);
  if (!review) throw new AppError("NOT_FOUND", "Department review not found.", 404);
  const feasibility = getFeasibilityById(review.feasibilityId, actor);
  const next = useFeasibilityStore.getState().updateReview(
    reviewId,
    {
      status: values.status,
      decision: values.decision,
      remarks: values.remarks,
      completedAt: ["APPROVED", "CONDITIONALLY_APPROVED", "REJECTED", "NOT_APPLICABLE"].includes(values.status)
        ? new Date().toISOString()
        : review.completedAt,
      production: review.departmentId === "PRODUCTION" ? {
        manufacturingLine: values.manufacturingLine,
        availableCapacity: values.availableCapacity,
        requiredCapacity: values.requiredCapacity,
        batchSize: values.batchSize,
        estimatedBatches: values.estimatedBatches,
        processAvailable: values.processAvailable,
        equipmentAvailable: values.equipmentAvailable,
        technologyAvailable: values.technologyAvailable,
      } : review.production,
      qa: review.departmentId === "QA" ? {
        qualityRequirements: values.qualityRequirements,
        specificationAvailability: values.specificationAvailability,
        qualitySystemRequirements: values.qualitySystemRequirements,
        documentationRequirements: values.documentationRequirements,
        specialRequirements: values.specialRequirements,
      } : review.qa,
      qc: review.departmentId === "QC" ? {
        testingRequirement: values.testingRequirement,
        methodAvailable: values.methodAvailable,
        instrumentAvailability: values.instrumentAvailability,
        referenceStandardAvailability: values.referenceStandardAvailability,
        sampleRequirement: values.sampleRequirement,
      } : review.qc,
      regulatory: review.departmentId === "REGULATORY" ? {
        targetMarket: values.targetMarket,
        regulatoryPath: values.regulatoryPath,
        registrationRequirement: values.registrationRequirement,
        customerRegistrationRequirement: values.customerRegistrationRequirement,
        documentationRequirement: values.documentationRequirement,
        licenseRequirement: values.licenseRequirement,
      } : review.regulatory,
      packaging: review.departmentId === "PACKAGING" ? {
        packagingType: values.packagingType,
        packSize: values.packSize,
        materialAvailability: values.materialAvailability,
        artworkRequirement: values.artworkRequirement,
        specialRequirement: values.specialRequirement,
      } : review.packaging,
      supply: review.departmentId === "SUPPLY_CHAIN" ? {
        apiAvailability: values.apiAvailability,
        excipientAvailability: values.excipientAvailability,
        packagingMaterialAvailability: values.packagingMaterialAvailability,
        supplierAvailability: values.supplierAvailability,
        leadTime: values.leadTime,
      } : review.supply,
    },
    actor,
  );
  if (values.status === "CLARIFICATION_REQUIRED" && feasibility.status !== "CLARIFICATION_REQUIRED") {
    await changeFeasibilityStatus(feasibility.id, "CLARIFICATION_REQUIRED", actor);
  }
  await notifyFeasibilityEvent({
    kind: "review_completed",
    title: "Department review updated",
    body: `${review.departmentName} · ${values.status}`,
    href: `/crm/feasibility/${feasibility.id}`,
    recipientId: feasibility.assignedTo,
    feasibilityId: feasibility.id,
    actor,
  });
  return next;
}

export async function requestClarification(
  feasibilityId: string,
  departmentId: FeasibilityDepartmentId | "SALES",
  question: string,
  audience: "INTERNAL" | "SALES",
  actor: AuthenticatedUser,
): Promise<FeasibilityClarification> {
  assertCan(actor, "feasibility.review");
  await authorizeClient("feasibility.review");
  const feasibility = getFeasibilityById(feasibilityId, actor);
  if (!isDemoMode()) {
    throw new AppError("FIREBASE_UNCONFIGURED", "Clarification API is available after Firebase Admin setup.", 501);
  }
  const record = useFeasibilityStore.getState().addClarification({ feasibilityId, departmentId, question, audience }, actor);
  if (feasibility.status !== "CLARIFICATION_REQUIRED") {
    await changeFeasibilityStatus(feasibilityId, "CLARIFICATION_REQUIRED", actor);
  }
  await notifyFeasibilityEvent({
    kind: "clarification_requested",
    title: audience === "SALES" ? "Sales clarification requested" : "Clarification requested",
    body: question,
    href: `/crm/feasibility/${feasibilityId}`,
    recipientId: feasibility.assignedTo,
    feasibilityId,
    actor,
  });
  return record;
}

export async function respondClarification(id: string, response: string, actor: AuthenticatedUser): Promise<FeasibilityClarification> {
  assertCan(actor, "feasibility.update");
  await authorizeClient("feasibility.update");
  const current = useFeasibilityStore.getState().clarifications.find((item) => item.id === id);
  if (!current) throw new AppError("NOT_FOUND", "Clarification not found.", 404);
  getFeasibilityById(current.feasibilityId, actor);
  const next = useFeasibilityStore.getState().updateClarification(
    id,
    { response, respondedBy: actor.uid, respondedByName: actor.displayName, respondedAt: new Date().toISOString(), status: "RESPONDED" },
    actor,
  );
  await notifyFeasibilityEvent({
    kind: "clarification_responded",
    title: "Clarification responded",
    body: current.question,
    href: `/crm/feasibility/${current.feasibilityId}`,
    recipientId: current.requestedBy,
    feasibilityId: current.feasibilityId,
    actor,
  });
  return next;
}

export async function resolveClarification(id: string, actor: AuthenticatedUser): Promise<FeasibilityClarification> {
  assertCan(actor, "feasibility.review");
  await authorizeClient("feasibility.review");
  const current = useFeasibilityStore.getState().clarifications.find((item) => item.id === id);
  if (!current) throw new AppError("NOT_FOUND", "Clarification not found.", 404);
  return useFeasibilityStore.getState().updateClarification(id, { status: "RESOLVED" }, actor);
}
