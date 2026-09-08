import { COLLECTIONS } from "@/lib/firebase/collections";
import { createDocument, deleteDocument, getDocumentById, listDocuments, updateDocument } from "@/services/firestore/base.service";
import type { ListQuery } from "@/types/common";
import type { Lead } from "@/types/entities";
import type { AuthenticatedUser } from "@/types/rbac";

const PATH = COLLECTIONS.leads;
const MODULE = "leads" as const;

export const leadService = {
  create: (payload: Omit<Lead, "id" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">, user: AuthenticatedUser) =>
    createDocument(PATH, payload, { user, module: MODULE }),
  getById: (id: string, user: AuthenticatedUser) => getDocumentById<Lead>(PATH, id, { user, module: MODULE }),
  list: (user: AuthenticatedUser, query: ListQuery = {}) => listDocuments<Lead>(PATH, { user, module: MODULE }, query),
  update: (id: string, payload: Partial<Lead>, user: AuthenticatedUser) =>
    updateDocument(PATH, id, payload, { user, module: MODULE }),
  remove: (id: string, user: AuthenticatedUser) => deleteDocument(PATH, id, { user, module: MODULE }),
};

export {
  createLead,
  getLead,
  getLeadById,
  updateLead,
  assignLead,
  changeLeadStatus,
  convertLead,
  markLeadLost,
  reactivateLead,
  listLeads,
  searchLeads,
  checkDuplicateLead,
} from "@/services/leads/lead.service";
