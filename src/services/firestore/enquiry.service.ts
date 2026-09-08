import { COLLECTIONS } from "@/lib/firebase/collections";
import { createDocument, deleteDocument, getDocumentById, listDocuments, updateDocument } from "@/services/firestore/base.service";
import type { ListQuery } from "@/types/common";
import type { Enquiry } from "@/types/entities";
import type { AuthenticatedUser } from "@/types/rbac";

const PATH = COLLECTIONS.enquiries;
const MODULE = "enquiries" as const;

export const enquiryService = {
  create: (payload: Omit<Enquiry, "id" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">, user: AuthenticatedUser) =>
    createDocument(PATH, payload, { user, module: MODULE }),
  getById: (id: string, user: AuthenticatedUser) => getDocumentById<Enquiry>(PATH, id, { user, module: MODULE }),
  list: (user: AuthenticatedUser, query: ListQuery = {}) => listDocuments<Enquiry>(PATH, { user, module: MODULE }, query),
  update: (id: string, payload: Partial<Enquiry>, user: AuthenticatedUser) =>
    updateDocument(PATH, id, payload, { user, module: MODULE }),
  remove: (id: string, user: AuthenticatedUser) => deleteDocument(PATH, id, { user, module: MODULE }),
};

export {
  createEnquiry,
  getEnquiry,
  getEnquiryById,
  updateEnquiry,
  assignEnquiry,
  changeEnquiryStatus,
  listEnquiries,
  searchEnquiries,
  getCustomerEnquiries,
} from "@/services/enquiries/enquiry.service";
