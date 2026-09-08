import { isDemoMode } from "@/lib/env";
import { authorizeClient } from "@/lib/auth/authorize-client";
import { assertCan } from "@/lib/rbac/can";
import { useCrmStore } from "@/stores/crm-store";
import { buildDocumentPath, uploadFile } from "@/services/storage/storage.service";
import type { CrmCustomerDocument } from "@/types/crm";
import type { AuthenticatedUser } from "@/types/rbac";

export function listCustomerDocuments(customerId: string): CrmCustomerDocument[] {
  return useCrmStore.getState().documents.filter((item) => item.customerId === customerId);
}

export async function uploadCustomerDocument(
  customerId: string,
  file: File,
  actor: AuthenticatedUser,
): Promise<CrmCustomerDocument> {
  assertCan(actor, "customer_documents.upload");
  await authorizeClient("customer_documents.upload");
  let storagePath: string | undefined;
  if (!isDemoMode()) {
    storagePath = buildDocumentPath("customers", customerId, file.name);
    await uploadFile(storagePath, file, actor);
  }
  return useCrmStore.getState().addDocument(
    {
      customerId,
      name: file.name,
      type: file.type || "application/octet-stream",
      version: "1.0",
      storagePath,
      uploadedBy: actor.uid,
      uploadedByName: actor.displayName,
      status: "ACTIVE",
    },
    actor,
  );
}
