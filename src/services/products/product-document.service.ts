import { isDemoMode } from "@/lib/env";
import { authorizeClient } from "@/lib/auth/authorize-client";
import { assertCan } from "@/lib/rbac/can";
import { useProductStore } from "@/stores/product-store";
import { getProductById } from "@/services/products/product.service";
import { buildDocumentPath, putFile } from "@/services/storage/storage.service";
import type { ProductDocument } from "@/types/products";
import type { AuthenticatedUser } from "@/types/rbac";

export function listProductDocuments(productId: string): ProductDocument[] {
  return useProductStore.getState().documents.filter((item) => item.productId === productId && item.status !== "ARCHIVED");
}

export async function uploadProductDocument(
  productId: string,
  file: File,
  actor: AuthenticatedUser,
  documentType: ProductDocument["documentType"] = "OTHER",
): Promise<ProductDocument> {
  assertCan(actor, "products.update");
  await authorizeClient("products.update");
  getProductById(productId, actor);
  const versions = listProductDocuments(productId).filter((item) => item.documentType === documentType);
  const version = String(versions.length + 1);
  let storagePath: string | undefined;
  if (!isDemoMode()) {
    storagePath = buildDocumentPath("products", productId, file.name);
    await putFile(storagePath, file, actor);
  }
  return useProductStore.getState().addDocument(
    {
      productId,
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
}
