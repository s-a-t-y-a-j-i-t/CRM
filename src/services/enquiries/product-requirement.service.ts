import { authorizeClient } from "@/lib/auth/authorize-client";
import { assertCan } from "@/lib/rbac/can";
import { isDemoMode } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { useEnquiryStore } from "@/stores/enquiry-store";
import { getEnquiryById } from "@/services/enquiries/enquiry.service";
import { notifyEnquiryEvent } from "@/services/enquiries/enquiry-notify";
import { formToRequirementPatch } from "@/services/enquiries/requirement-map";
import type { ProductRequirementFormValues } from "@/schemas/enquiries";
import type { ProductRequirement, RequirementVersion } from "@/types/enquiries";
import type { AuthenticatedUser } from "@/types/rbac";

async function persistRequirement(enquiryId: string, values: ProductRequirementFormValues): Promise<ProductRequirement> {
  const response = await fetch(`/api/crm/enquiries/${enquiryId}/requirements`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });
  const data = (await response.json().catch(() => ({}))) as { requirement?: ProductRequirement; error?: string };
  if (!response.ok || !data.requirement) {
    throw new AppError("INTERNAL", data.error ?? "Unable to save requirement.", response.status || 500);
  }
  return data.requirement;
}

export function getRequirement(enquiryId: string): ProductRequirement | null {
  return useEnquiryStore.getState().getRequirement(enquiryId) ?? null;
}

export function getRequirementVersions(enquiryId: string): RequirementVersion[] {
  return useEnquiryStore
    .getState()
    .versions.filter((item) => item.enquiryId === enquiryId)
    .sort((a, b) => b.versionNumber - a.versionNumber);
}

export async function createRequirement(
  enquiryId: string,
  values: ProductRequirementFormValues,
  actor: AuthenticatedUser,
): Promise<ProductRequirement> {
  assertCan(actor, "product_requirements.create");
  await authorizeClient("product_requirements.create");
  getEnquiryById(enquiryId, actor);
  if (!isDemoMode()) {
    return persistRequirement(enquiryId, values);
  }
  return useEnquiryStore.getState().createRequirement(formToRequirementPatch(values, enquiryId, actor), actor);
}

export async function updateRequirement(
  enquiryId: string,
  values: ProductRequirementFormValues,
  actor: AuthenticatedUser,
): Promise<ProductRequirement> {
  assertCan(actor, "product_requirements.update");
  await authorizeClient("product_requirements.update");
  getEnquiryById(enquiryId, actor);
  const current = getRequirement(enquiryId);
  if (!current) {
    return createRequirement(enquiryId, values, actor);
  }
  assertCan(actor, "product_requirements.version");
  if (!isDemoMode()) {
    return persistRequirement(enquiryId, values);
  }
  const next = useEnquiryStore.getState().updateRequirement(
    current.id,
    { ...current, ...formToRequirementPatch(values, enquiryId, actor) },
    values.changeReason || "Requirement updated",
    actor,
  );
  await notifyEnquiryEvent({
    kind: "requirement_updated",
    title: "Requirement updated",
    body: `${next.productName} is now version ${next.versionNumber}.`,
    href: `/crm/enquiries/${enquiryId}/requirements`,
    recipientId: getEnquiryById(enquiryId, actor).assignedTo,
    enquiryId,
    actor,
  });
  return next;
}

export async function createRequirementVersion(
  enquiryId: string,
  values: ProductRequirementFormValues,
  actor: AuthenticatedUser,
): Promise<ProductRequirement> {
  return updateRequirement(enquiryId, values, actor);
}
