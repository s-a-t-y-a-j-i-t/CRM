import { isDemoMode } from "@/lib/env";
import { authorizeClient } from "@/lib/auth/authorize-client";
import { assertCan } from "@/lib/rbac/can";
import { useLeadStore } from "@/stores/lead-store";
import { getLeadById } from "@/services/leads/lead.service";
import { buildDocumentPath, uploadFile } from "@/services/storage/storage.service";
import type { LeadDocument } from "@/types/leads";
import type { AuthenticatedUser } from "@/types/rbac";

export function listLeadDocuments(leadId: string): LeadDocument[] {
  return useLeadStore.getState().documents.filter((item) => item.leadId === leadId);
}

export async function uploadLeadDocument(
  leadId: string,
  file: File,
  actor: AuthenticatedUser,
): Promise<LeadDocument> {
  assertCan(actor, "leads.update");
  await authorizeClient("leads.update");
  getLeadById(leadId, actor);
  let storagePath: string | undefined;
  if (!isDemoMode()) {
    storagePath = buildDocumentPath("leads", leadId, file.name);
    await uploadFile(storagePath, file, actor);
  }
  return useLeadStore.getState().addDocument(
    {
      leadId,
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
