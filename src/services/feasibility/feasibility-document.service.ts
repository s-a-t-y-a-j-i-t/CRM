import { isDemoMode } from "@/lib/env";
import { authorizeClient } from "@/lib/auth/authorize-client";
import { assertCan } from "@/lib/rbac/can";
import { useFeasibilityStore } from "@/stores/feasibility-store";
import { getFeasibilityById } from "@/services/feasibility/feasibility.service";
import { notifyFeasibilityEvent } from "@/services/feasibility/feasibility-notify";
import { buildDocumentPath, putFile } from "@/services/storage/storage.service";
import type { FeasibilityDocument } from "@/types/feasibility";
import type { AuthenticatedUser } from "@/types/rbac";

export function listFeasibilityDocuments(feasibilityId: string): FeasibilityDocument[] {
  return useFeasibilityStore.getState().documents.filter((item) => item.feasibilityId === feasibilityId && item.status !== "ARCHIVED");
}

export async function uploadFeasibilityDocument(
  feasibilityId: string,
  file: File,
  actor: AuthenticatedUser,
  documentType: FeasibilityDocument["documentType"] = "OTHER",
): Promise<FeasibilityDocument> {
  assertCan(actor, "feasibility_documents.upload");
  await authorizeClient("feasibility_documents.upload");
  const feasibility = getFeasibilityById(feasibilityId, actor);
  const versions = listFeasibilityDocuments(feasibilityId).filter((item) => item.documentType === documentType);
  const version = String(versions.length + 1);
  let storagePath: string | undefined;
  if (!isDemoMode()) {
    storagePath = buildDocumentPath("feasibilities", feasibilityId, file.name);
    await putFile(storagePath, file, actor);
  }
  const doc = useFeasibilityStore.getState().addDocument(
    {
      feasibilityId,
      documentType,
      fileName: file.name,
      storagePath,
      version,
      uploadedBy: actor.uid,
      uploadedByName: actor.displayName,
      status: "ACTIVE",
    },
    actor,
  );
  await notifyFeasibilityEvent({
    kind: "document_uploaded",
    title: "Feasibility document uploaded",
    body: `v${version} · ${file.name} added to ${feasibility.feasibilityNumber}.`,
    href: `/crm/feasibility/${feasibilityId}`,
    recipientId: feasibility.assignedTo,
    feasibilityId,
    actor,
  });
  return doc;
}
