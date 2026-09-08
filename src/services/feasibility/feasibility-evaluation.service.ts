import { authorizeClient } from "@/lib/auth/authorize-client";
import { assertCan } from "@/lib/rbac/can";
import { nowIso } from "@/lib/dates";
import { useFeasibilityStore } from "@/stores/feasibility-store";
import { getFeasibilityById, changeFeasibilityStatus } from "@/services/feasibility/feasibility.service";
import { EVALUATION_FACTORS } from "@/constants/feasibility";
import type { EvaluationFormValues } from "@/schemas/feasibility";
import type { AuthenticatedUser } from "@/types/rbac";
import type { EvaluationFactor, FeasibilityEvaluation } from "@/types/feasibility";

export function defaultFactors(): EvaluationFactor[] {
  return EVALUATION_FACTORS.map((factor) => ({
    id: factor.id,
    name: factor.name,
    status: "PENDING",
    weight: factor.weight,
  }));
}

export function computeOverallScore(factors: EvaluationFactor[]): number | undefined {
  const scored = factors.filter((factor) => typeof factor.score === "number");
  const weight = scored.reduce((sum, factor) => sum + factor.weight, 0);
  if (!weight) return undefined;
  const total = scored.reduce((sum, factor) => sum + (factor.score ?? 0) * factor.weight, 0);
  return Math.round((total / weight) * 10);
}

export function getEvaluation(feasibilityId: string): FeasibilityEvaluation | null {
  return useFeasibilityStore.getState().evaluations.find((item) => item.feasibilityId === feasibilityId) ?? null;
}

export async function createEvaluation(feasibilityId: string, actor: AuthenticatedUser): Promise<FeasibilityEvaluation> {
  assertCan(actor, "feasibility.update");
  await authorizeClient("feasibility.update");
  getFeasibilityById(feasibilityId, actor);
  const existing = getEvaluation(feasibilityId);
  if (existing) return existing;
  const now = nowIso();
  const record: FeasibilityEvaluation = {
    id: `feval_${crypto.randomUUID().slice(0, 8)}`,
    feasibilityId,
    factors: defaultFactors(),
    submitted: false,
    createdAt: now,
    updatedAt: now,
    createdBy: actor.uid,
    updatedBy: actor.uid,
  };
  useFeasibilityStore.getState().upsertEvaluation(feasibilityId, record);
  return record;
}

export async function updateEvaluation(
  feasibilityId: string,
  values: EvaluationFormValues,
  actor: AuthenticatedUser,
): Promise<FeasibilityEvaluation> {
  assertCan(actor, "feasibility.update");
  await authorizeClient("feasibility.update");
  getFeasibilityById(feasibilityId, actor);
  const current = getEvaluation(feasibilityId) ?? await createEvaluation(feasibilityId, actor);
  const factors = current.factors.map((factor) => {
    const next = values.factors.find((item) => item.id === factor.id);
    return next ? { ...factor, ...next } : factor;
  });
  const record: FeasibilityEvaluation = {
    ...current,
    factors,
    overallScore: computeOverallScore(factors),
    updatedAt: nowIso(),
    updatedBy: actor.uid,
  };
  useFeasibilityStore.getState().upsertEvaluation(feasibilityId, record);
  useFeasibilityStore.getState().updateAssessment(feasibilityId, { overallScore: record.overallScore }, actor);
  return record;
}

export async function submitEvaluation(
  feasibilityId: string,
  values: EvaluationFormValues,
  actor: AuthenticatedUser,
): Promise<FeasibilityEvaluation> {
  const record = await updateEvaluation(feasibilityId, values, actor);
  const submitted: FeasibilityEvaluation = {
    ...record,
    submitted: true,
    submittedAt: nowIso(),
    submittedBy: actor.uid,
  };
  useFeasibilityStore.getState().upsertEvaluation(feasibilityId, submitted);
  const current = getFeasibilityById(feasibilityId, actor);
  if (current.status === "UNDER_EVALUATION" || current.status === "DEPARTMENT_REVIEW") {
    await changeFeasibilityStatus(feasibilityId, "APPROVAL_PENDING", actor);
  }
  return submitted;
}
