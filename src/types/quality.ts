import type { AuditFields, EntityId, RelatedRecordType } from "@/types/common";

export const DOCUMENT_TYPES = [
  "coa",
  "specification",
  "msds",
  "product_dossier",
  "regulatory_document",
  "artwork",
  "customer_po",
  "quotation",
  "agreement",
  "certificate",
  "other",
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_STATUSES = ["current", "superseded", "expired", "archived"] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export interface ControlledDocument extends AuditFields {
  documentNumber: string;
  name: string;
  documentType: DocumentType;
  version: number;
  storagePath: string;
  contentType: string;
  sizeBytes: number;
  checksumSha256?: string;
  uploadedBy: EntityId;
  uploadedAt: string;
  expiryDate?: string;
  documentStatus: DocumentStatus;
  relatedType: RelatedRecordType;
  relatedId: EntityId;
  replacesDocumentId?: EntityId;
}

export const COMPLAINT_TYPES = [
  "quality",
  "packaging",
  "labeling",
  "shortage",
  "delay",
  "documentation",
  "other",
] as const;

export type ComplaintType = (typeof COMPLAINT_TYPES)[number];

export const COMPLAINT_SEVERITIES = ["critical", "major", "minor"] as const;
export type ComplaintSeverity = (typeof COMPLAINT_SEVERITIES)[number];

export const COMPLAINT_STATUSES = [
  "new",
  "acknowledged",
  "investigation",
  "capa",
  "customer_response",
  "resolved",
  "closed",
] as const;

export type ComplaintStatus = (typeof COMPLAINT_STATUSES)[number];

export interface Complaint extends AuditFields {
  complaintNumber: string;
  customerId: EntityId;
  productId?: EntityId;
  batchNumber?: string;
  complaintDate: string;
  complaintType: ComplaintType;
  description: string;
  severity: ComplaintSeverity;
  receivedBy: EntityId;
  assignedDepartment: string;
  investigationStatus: ComplaintStatus;
  resolution?: string;
  capaReference?: string;
  closureDate?: string;
}

export interface ComplaintEvent extends AuditFields {
  complaintId: EntityId;
  fromStatus?: ComplaintStatus;
  toStatus: ComplaintStatus;
  note: string;
  actorUserId: EntityId;
}
