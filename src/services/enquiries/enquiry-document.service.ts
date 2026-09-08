import { isDemoMode } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { authorizeClient } from "@/lib/auth/authorize-client";
import { assertCan } from "@/lib/rbac/can";
import { useEnquiryStore } from "@/stores/enquiry-store";
import { getEnquiryById } from "@/services/enquiries/enquiry.service";
import { notifyEnquiryEvent } from "@/services/enquiries/enquiry-notify";
import { buildDocumentPath, deleteFile, putFile } from "@/services/storage/storage.service";
import type { EnquiryDocument, EnquiryDocumentType } from "@/types/enquiries";
import type { AuthenticatedUser } from "@/types/rbac";

export function listEnquiryDocuments(enquiryId: string): EnquiryDocument[] {
  return useEnquiryStore.getState().documents.filter((item) => item.enquiryId === enquiryId && item.status !== "ARCHIVED");
}

export async function uploadEnquiryDocument(
  enquiryId: string,
  file: File,
  actor: AuthenticatedUser,
  documentType: EnquiryDocumentType = "OTHER",
): Promise<EnquiryDocument> {
  assertCan(actor, "enquiry_documents.upload");
  await authorizeClient("enquiry_documents.upload");
  const enquiry = getEnquiryById(enquiryId, actor);
  let storagePath: string | undefined;
  if (!isDemoMode()) {
    storagePath = buildDocumentPath("enquiries", enquiryId, file.name);
    await putFile(storagePath, file, actor);
  }
  const doc = useEnquiryStore.getState().addDocument(
    {
      enquiryId,
      fileName: file.name,
      documentType,
      storagePath,
      version: "1.0",
      uploadedBy: actor.uid,
      uploadedByName: actor.displayName,
      status: "ACTIVE",
    },
    actor,
  );
  await notifyEnquiryEvent({
    kind: "document_uploaded",
    title: "Document uploaded",
    body: `${file.name} added to ${enquiry.enquiryNumber}.`,
    href: `/crm/enquiries/${enquiryId}/documents`,
    recipientId: enquiry.assignedTo,
    enquiryId,
    actor,
  });
  return doc;
}

export async function deleteEnquiryDocument(documentId: string, actor: AuthenticatedUser): Promise<void> {
  assertCan(actor, "enquiry_documents.delete");
  await authorizeClient("enquiry_documents.delete");
  const current = useEnquiryStore.getState().documents.find((item) => item.id === documentId);
  if (!current) throw new AppError("NOT_FOUND", "Document not found.", 404);
  getEnquiryById(current.enquiryId, actor);
  if (current.storagePath && !isDemoMode()) {
    try {
      await deleteFile(current.storagePath, actor);
    } catch {
      // Metadata is archived even if Storage delete is denied by a broader documents.delete grant.
    }
  }
  useEnquiryStore.getState().archiveDocument(documentId, actor);
}
