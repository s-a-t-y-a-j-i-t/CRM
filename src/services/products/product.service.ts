import { isDemoMode } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { authorizeClient } from "@/lib/auth/authorize-client";
import { assertCan, can } from "@/lib/rbac/can";
import { DEFAULT_PAGE_SIZE } from "@/config/app";
import { useProductStore } from "@/stores/product-store";
import type { PaginatedResult } from "@/types/common";
import type { AuthenticatedUser } from "@/types/rbac";
import type { CrmProduct } from "@/types/products";
import type { ProductFormValues } from "@/schemas/products";
import type { ProductStatus } from "@/constants/products";

export interface ProductListQuery {
  search?: string;
  productType?: string;
  productCategory?: string;
  dosageForm?: string;
  status?: string;
  therapeuticCategory?: string;
  manufacturingSite?: string;
  marketType?: string;
  page?: number;
  pageSize?: number;
  cursor?: string;
  sortBy?: "productCode" | "productName" | "createdAt" | "status";
  sortDirection?: "asc" | "desc";
}

export function listProducts(
  query: ProductListQuery = {},
  actor: AuthenticatedUser,
  source?: CrmProduct[],
): PaginatedResult<CrmProduct> & { nextCursor?: string } {
  assertCan(actor, "products.view");
  const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
  const direction = query.sortDirection === "asc" ? 1 : -1;
  const sortBy = query.sortBy ?? "createdAt";
  const rows = (source ?? useProductStore.getState().products)
    .filter((product) => {
      if (query.productType && product.productType !== query.productType) return false;
      if (query.productCategory && product.productCategory !== query.productCategory) return false;
      if (query.dosageForm && product.dosageForm !== query.dosageForm) return false;
      if (query.status && product.status !== query.status) return false;
      if (query.therapeuticCategory && !(product.therapeuticCategory ?? "").toLowerCase().includes(query.therapeuticCategory.toLowerCase())) return false;
      if (query.manufacturingSite && product.manufacturingSite !== query.manufacturingSite) return false;
      if (query.marketType && product.marketType !== query.marketType) return false;
      if (query.search?.trim() && !product.searchIndex.includes(query.search.trim().toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => String(a[sortBy] ?? "").localeCompare(String(b[sortBy] ?? "")) * direction);

  let start = 0;
  if (query.cursor) {
    const index = rows.findIndex((item) => item.id === query.cursor);
    start = index >= 0 ? index + 1 : 0;
  } else if (query.page && query.page > 1) {
    start = (query.page - 1) * pageSize;
  }
  const items = rows.slice(start, start + pageSize);
  return {
    items,
    total: rows.length,
    page: query.page ?? (start === 0 ? 1 : Math.floor(start / pageSize) + 1),
    pageSize,
    hasMore: start + pageSize < rows.length,
    nextCursor: start + pageSize < rows.length ? items[items.length - 1]?.id : undefined,
  };
}

export function searchProducts(search: string, actor: AuthenticatedUser): CrmProduct[] {
  return listProducts({ search, pageSize: 12 }, actor).items;
}

export function getProduct(id: string): CrmProduct | null {
  return useProductStore.getState().getProduct(id) ?? null;
}

export function getProductById(id: string, actor: AuthenticatedUser): CrmProduct {
  assertCan(actor, "products.view");
  const product = getProduct(id);
  if (!product) throw new AppError("NOT_FOUND", "Product not found.", 404);
  return product;
}

function toPatch(values: ProductFormValues) {
  return {
    productName: values.productName,
    genericName: values.genericName,
    brandName: values.brandName || undefined,
    productCategory: values.productCategory,
    productType: values.productType,
    dosageForm: values.dosageForm,
    strength: values.strength || undefined,
    strengthUnit: values.strengthUnit || undefined,
    composition: values.composition,
    therapeuticCategory: values.therapeuticCategory || undefined,
    pharmacopoeiaStandard: values.pharmacopoeiaStandard || undefined,
    manufacturingSite: values.manufacturingSite || undefined,
    manufacturingUnit: values.manufacturingUnit || undefined,
    packagingType: values.packagingType || undefined,
    standardPackSize: values.standardPackSize || undefined,
    marketType: values.marketType,
    status: values.status,
    regulatoryStatus: values.regulatoryStatus || undefined,
    description: values.description,
    notes: values.notes,
    isDemoData: false,
  };
}

export async function createProduct(values: ProductFormValues, actor: AuthenticatedUser): Promise<CrmProduct> {
  assertCan(actor, "products.create");
  await authorizeClient("products.create");
  if (isDemoMode()) {
    const created = useProductStore.getState().createProduct(toPatch(values), actor);
    for (const spec of values.specifications ?? []) {
      if (!spec.parameter.trim()) continue;
      useProductStore.getState().addSpecification({ ...spec, productId: created.id }, actor);
    }
    return created;
  }
  const response = await fetch("/api/crm/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });
  const data = (await response.json().catch(() => ({}))) as { product?: CrmProduct; error?: string };
  if (!response.ok || !data.product) {
    throw new AppError("INTERNAL", data.error ?? "Unable to create product.", response.status || 500);
  }
  return data.product;
}

export async function updateProduct(id: string, values: ProductFormValues, actor: AuthenticatedUser): Promise<CrmProduct> {
  assertCan(actor, "products.update");
  await authorizeClient("products.update");
  getProductById(id, actor);
  if (isDemoMode()) {
    return useProductStore.getState().updateProduct(id, toPatch(values), actor);
  }
  const response = await fetch(`/api/crm/products/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });
  const data = (await response.json().catch(() => ({}))) as { product?: CrmProduct; error?: string };
  if (!response.ok || !data.product) {
    throw new AppError("INTERNAL", data.error ?? "Unable to update product.", response.status || 500);
  }
  return data.product;
}

export async function changeProductStatus(id: string, status: ProductStatus, actor: AuthenticatedUser): Promise<CrmProduct> {
  assertCan(actor, "products.change_status");
  await authorizeClient("products.change_status");
  getProductById(id, actor);
  if (isDemoMode()) {
    return useProductStore.getState().changeStatus(id, status, actor);
  }
  const response = await fetch(`/api/crm/products/${id}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  const data = (await response.json().catch(() => ({}))) as { product?: CrmProduct; error?: string };
  if (!response.ok || !data.product) {
    throw new AppError("INTERNAL", data.error ?? "Unable to change product status.", response.status || 500);
  }
  return data.product;
}

export function exportProductsCsv(rows: CrmProduct[]): string {
  const header = ["Product Code", "Product Name", "Generic Name", "Dosage Form", "Strength", "Category", "Manufacturing Site", "Status", "Created Date"];
  const lines = rows.map((row) =>
    [row.productCode, row.productName, row.genericName, row.dosageForm, `${row.strength ?? ""} ${row.strengthUnit ?? ""}`.trim(), row.productCategory, row.manufacturingSite ?? "", row.status, row.createdAt.slice(0, 10)]
      .map((value) => `"${String(value).replaceAll('"', '""')}"`)
      .join(","),
  );
  return [header.join(","), ...lines].join("\n");
}

export { can };
