import { COLLECTIONS } from "@/lib/firebase/collections";
import { createDocument, deleteDocument, getDocumentById, listDocuments, updateDocument } from "@/services/firestore/base.service";
import type { ListQuery } from "@/types/common";
import type { Customer } from "@/types/entities";
import type { AuthenticatedUser } from "@/types/rbac";

const PATH = COLLECTIONS.customers;
const MODULE = "customers" as const;

export const customerService = {
  create: (payload: Omit<Customer, "id" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">, user: AuthenticatedUser) =>
    createDocument(PATH, payload, { user, module: MODULE }),
  getById: (id: string, user: AuthenticatedUser) => getDocumentById<Customer>(PATH, id, { user, module: MODULE }),
  list: (user: AuthenticatedUser, query: ListQuery = {}) => listDocuments<Customer>(PATH, { user, module: MODULE }, query),
  update: (id: string, payload: Partial<Customer>, user: AuthenticatedUser) =>
    updateDocument(PATH, id, payload, { user, module: MODULE }),
  remove: (id: string, user: AuthenticatedUser) => deleteDocument(PATH, id, { user, module: MODULE }),
};
