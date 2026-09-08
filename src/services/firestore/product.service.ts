import { COLLECTIONS } from "@/lib/firebase/collections";
import { createDocument, getDocumentById, listDocuments, updateDocument } from "@/services/firestore/base.service";
import type { ListQuery } from "@/types/common";
import type { Product } from "@/types/entities";
import type { AuthenticatedUser } from "@/types/rbac";

export {
  createProduct,
  getProduct,
  getProductById,
  updateProduct,
  changeProductStatus,
  listProducts,
  searchProducts,
} from "@/services/products/product.service";

const PATH = COLLECTIONS.products;

export const productService = {
  create: (payload: Omit<Product, "id" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">, user: AuthenticatedUser) =>
    createDocument(PATH, payload, { user, module: "products" }),
  getById: (id: string, user: AuthenticatedUser) => getDocumentById<Product>(PATH, id, { user, module: "products" }),
  list: (user: AuthenticatedUser, query: ListQuery = {}) =>
    listDocuments<Product>(PATH, { user, module: "products" }, query),
  update: (id: string, payload: Partial<Product>, user: AuthenticatedUser) =>
    updateDocument(PATH, id, payload, { user, module: "products" }),
};
