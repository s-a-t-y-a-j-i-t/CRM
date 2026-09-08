import { isDemoMode } from "@/lib/env";
import { authorizeClient } from "@/lib/auth/authorize-client";
import { assertCan } from "@/lib/rbac/can";
import { useQuotationStore } from "@/stores/quotation-store";
import { getQuotationById } from "@/services/quotations/quotation.service";
import { generateQuotationPdf } from "@/services/quotations/quotation-pdf.service";
import { buildDocumentPath, putFile } from "@/services/storage/storage.service";
import type { QuotationDocument } from "@/types/quotations";
import type { AuthenticatedUser } from "@/types/rbac";

export function listQuotationDocuments(quotationId: string): QuotationDocument[] {
  return useQuotationStore.getState().documents.filter((item) => item.quotationId === quotationId && item.status !== "ARCHIVED");
}

export async function storeGeneratedQuotationPdf(quotationId: string, actor: AuthenticatedUser): Promise<QuotationDocument> {
  assertCan(actor, "quotation_documents.upload");
  await authorizeClient("quotation_documents.upload");
  const quotation = getQuotationById(quotationId, actor);
  const generated = generateQuotationPdf(quotationId, actor);
  let storagePath: string | undefined;
  if (!isDemoMode()) {
    storagePath = buildDocumentPath("quotations", quotationId, generated.fileName);
    const file = new File([generated.bytes as BlobPart], generated.fileName, { type: "application/pdf" });
    await putFile(storagePath, file, actor);
  }
  return useQuotationStore.getState().addDocument(
    {
      quotationId,
      quotationVersion: quotation.version,
      documentType: "QUOTATION_PDF",
      fileName: generated.fileName,
      storagePath,
      generatedBy: actor.uid,
      generatedByName: actor.displayName,
      status: "ACTIVE",
    },
    actor,
  );
}
