import { isDemoMode } from "@/lib/env";
import { authorizeClient } from "@/lib/auth/authorize-client";
import { assertCan } from "@/lib/rbac/can";
import { useCostingStore } from "@/stores/costing-store";
import { getCostingById } from "@/services/costing/costing.service";
import { notifyCostingEvent } from "@/services/costing/costing-notify";
import { buildDocumentPath, putFile } from "@/services/storage/storage.service";
import type { CostingDocument } from "@/types/costing";
import type { AuthenticatedUser } from "@/types/rbac";

export function listCostingDocuments(costingId: string): CostingDocument[] {
  return useCostingStore.getState().documents.filter((item) => item.costingId === costingId && item.status !== "ARCHIVED");
}

export async function uploadCostingDocument(
  costingId: string,
  file: File,
  actor: AuthenticatedUser,
  documentType: CostingDocument["documentType"] = "SUPPORTING",
): Promise<CostingDocument> {
  assertCan(actor, "costing_documents.upload");
  await authorizeClient("costing_documents.upload");
  const costing = getCostingById(costingId, actor);
  const versions = listCostingDocuments(costingId).filter((item) => item.documentType === documentType);
  const version = String(versions.length + 1);
  let storagePath: string | undefined;
  if (!isDemoMode()) {
    storagePath = buildDocumentPath("costings", costingId, file.name);
    await putFile(storagePath, file, actor);
  }
  const doc = useCostingStore.getState().addDocument(
    {
      costingId,
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
  await notifyCostingEvent({
    kind: "document_uploaded",
    title: "Costing document uploaded",
    body: `v${version} · ${file.name} added to ${costing.displayNumber}.`,
    href: `/crm/costing/${costingId}`,
    recipientId: costing.assignedTo,
    costingId,
    actor,
  });
  return doc;
}
