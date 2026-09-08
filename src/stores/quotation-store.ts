"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nowIso } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { useAppStore } from "@/services/store";
import { buildQuotationSearchIndex, formatQuotationDisplay, nextQuotationNumber } from "@/services/quotations/quotation-code";
import { calculateGrandTotal, calculateLine, emptyQuotationTotals } from "@/services/quotations/quotation-calculation.service";
import { validateQuotationTransition } from "@/services/quotations/quotation-workflow.service";
import type { QuotationStatus } from "@/constants/quotations";
import type { AuditLogEntry } from "@/types/audit";
import type { AuthenticatedUser } from "@/types/rbac";
import type {
  CrmQuotation,
  QuotationApprovalRecord,
  QuotationCharge,
  QuotationDocument,
  QuotationLine,
  QuotationVersionSnapshot,
} from "@/types/quotations";

function writeLocalAudit(entry: Omit<AuditLogEntry, "id">) {
  const db = useAppStore.getState().db;
  useAppStore.setState({
    db: { ...db, auditLogs: [{ ...entry, id: `aud_${crypto.randomUUID()}` }, ...db.auditLogs] },
  });
}

function stamp(user: AuthenticatedUser) {
  const now = nowIso();
  return { createdAt: now, updatedAt: now, createdBy: user.uid, updatedBy: user.uid };
}

function withSearch(item: Omit<CrmQuotation, "searchIndex"> & { searchIndex?: string }): CrmQuotation {
  return {
    ...item,
    displayNumber: formatQuotationDisplay(item.quotationNumber, item.version),
    searchIndex: buildQuotationSearchIndex({
      quotationNumber: item.quotationNumber,
      displayNumber: formatQuotationDisplay(item.quotationNumber, item.version),
      customerName: item.customerName,
      productName: item.productName,
      enquiryNumber: item.enquiryNumber,
      costingNumber: item.costingNumber,
    }),
  };
}

const customerSnap = {
  customerName: "ABC Pharma Pvt Ltd",
  legalName: "ABC Pharma Private Limited",
  billingAddress: "Plot 18, MIDC Industrial Area, Taloja, Navi Mumbai 410208",
  shippingAddress: "Plot 18, MIDC Industrial Area, Taloja, Navi Mumbai 410208",
  city: "Navi Mumbai",
  state: "Maharashtra",
  country: "India",
  postalCode: "410208",
  gstin: "27AABCA4400P1Z6",
  pan: "AABCA4400P",
  email: "nathan.k@example.net",
  phone: "+91 98765 44001",
  contactName: "Rahul Sharma",
  contactEmail: "hannah.h@example.com",
  contactPhone: "+91 98765 44011",
};

const defaultTerms = {
  paymentTerms: "NET_30" as const,
  deliveryTerms: "EX_WORKS" as const,
  shippingTerms: "Customer arranged",
  priceBasis: "Ex-works",
  estimatedLeadTime: 45,
  leadTimeUnit: "DAYS" as const,
  taxesNote: "GST as applicable and configured on this quotation.",
};

function seedLine(id: string, quotationId: string, unitPriceMinor: number, taxType: "IGST" | "CGST", taxRate: number): QuotationLine {
  const calc = calculateLine({
    quantity: 100_000,
    unitPriceMinor,
    discountType: "PERCENTAGE",
    discountValue: 0,
    taxRate,
  });
  return {
    id,
    quotationId,
    productId: undefined,
    productName: "Pantoprazole 40 mg",
    description: "Pantoprazole Sodium 40 mg tablets, Alu-Alu, customer artwork.",
    dosageForm: "TABLET",
    strength: "40 mg",
    packaging: "ALU_ALU",
    packSize: "10x10",
    quantity: 100_000,
    quantityUnit: "TABLETS",
    unitPriceMinor,
    discountType: "PERCENTAGE",
    discountValue: 0,
    taxType,
    taxRate,
    costingId: "cost_abc_v1",
    moq: 50_000,
    sortOrder: 0,
    ...calc,
  };
}

const lineV1 = seedLine("qitem_v1", "quo_abc_v1", 15_00, "IGST", 12);
const chargeV1: QuotationCharge = { id: "qch_v1", quotationId: "quo_abc_v1", chargeType: "FREIGHT", description: "Domestic freight", amountMinor: 15_000_00 };
const totalsV1 = calculateGrandTotal({
  lines: [lineV1],
  charges: [chargeV1],
  headerDiscountType: "PERCENTAGE",
  headerDiscountValue: 0,
  currency: "INR",
});

const lineV2 = seedLine("qitem_v2", "quo_abc_v2", 14_50, "IGST", 12);
const chargeV2: QuotationCharge = { ...chargeV1, id: "qch_v2", quotationId: "quo_abc_v2" };
const totalsV2 = calculateGrandTotal({
  lines: [lineV2],
  charges: [chargeV2],
  headerDiscountType: "PERCENTAGE",
  headerDiscountValue: 0,
  currency: "INR",
});

const lineDraft = seedLine("qitem_draft", "quo_abc_draft", 16_00, "CGST", 6);
const totalsDraft = calculateGrandTotal({
  lines: [lineDraft],
  charges: [],
  headerDiscountType: "PERCENTAGE",
  headerDiscountValue: 0,
  currency: "INR",
});

function seedHeader(partial: Omit<CrmQuotation, "searchIndex" | "displayNumber">): CrmQuotation {
  return withSearch({ ...partial, displayNumber: formatQuotationDisplay(partial.quotationNumber, partial.version), searchIndex: "" });
}

const quoV1 = seedHeader({
  id: "quo_abc_v1",
  quotationNumber: "QUO-2026-00001",
  version: 1,
  familyId: "quo_abc_v1",
  customerId: "cust_abc",
  customerName: "ABC Pharma Pvt Ltd",
  contactId: "con_abc_rahul",
  enquiryId: "enq_abc",
  enquiryNumber: "ENQ-2026-00002",
  feasibilityId: "feas_abc",
  feasibilityNumber: "FEAS-2026-00003",
  costingId: "cost_abc_v1",
  costingNumber: "COST-2026-00001",
  productName: "Pantoprazole 40 mg",
  quotationDate: "2026-07-23",
  validUntil: "2026-10-23",
  status: "SENT",
  approvalStatus: "APPROVED",
  currency: "INR",
  preparedBy: "usr_bd",
  preparedByName: "Meera Iyer",
  salesOwner: "usr_sales",
  salesOwnerName: "Rohit Menon",
  approvedBy: "usr_sales",
  approvedByName: "Rohit Menon",
  approvedAt: "2026-07-24T10:00:00.000Z",
  sentAt: "2026-07-24T12:00:00.000Z",
  sentBy: "usr_bd",
  sentTo: "hannah.h@example.com",
  sentSubject: "Quotation QUO-2026-00001-V1 — Pantoprazole 40 mg",
  notes: "",
  internalNotes: "Internal target margin held from approved costing. Do not share.",
  customerNotes: "Price is valid for the stated quantity and Alu-Alu pack.",
  headerDiscountType: "PERCENTAGE",
  headerDiscountValue: 0,
  customer: customerSnap,
  costingSnapshot: {
    costingId: "cost_abc_v1",
    costingNumber: "COST-2026-00001",
    quantity: 100_000,
    quantityUnit: "TABLETS",
    unitPriceMinor: 15_00,
    sellingPriceMinor: 15_00,
    currency: "INR",
  },
  terms: defaultTerms,
  totals: totalsV1,
  isDemoData: true,
  createdAt: "2026-07-23T09:00:00.000Z",
  updatedAt: "2026-07-24T12:00:00.000Z",
  createdBy: "usr_bd",
  updatedBy: "usr_bd",
});

const quoV2 = seedHeader({
  ...quoV1,
  id: "quo_abc_v2",
  version: 2,
  status: "NEGOTIATION",
  approvalStatus: "APPROVED",
  quotationDate: "2026-08-10",
  validUntil: "2026-11-10",
  sentAt: "2026-08-11T09:30:00.000Z",
  customerNotes: "Revised unit price after commercial discussion. Previous sent version is unchanged.",
  internalNotes: "Negotiation revision. Do not overwrite V1.",
  costingSnapshot: { ...quoV1.costingSnapshot!, unitPriceMinor: 14_50, sellingPriceMinor: 14_50 },
  totals: totalsV2,
  createdAt: "2026-08-10T08:00:00.000Z",
  updatedAt: "2026-08-11T09:30:00.000Z",
});

const quoDraft = seedHeader({
  ...quoV1,
  id: "quo_abc_draft",
  quotationNumber: "QUO-2026-00002",
  version: 1,
  familyId: "quo_abc_draft",
  status: "DRAFT",
  approvalStatus: "NOT_SUBMITTED",
  quotationDate: "2026-07-01",
  validUntil: "2026-08-01",
  approvedBy: undefined,
  approvedByName: undefined,
  approvedAt: undefined,
  sentAt: undefined,
  sentBy: undefined,
  sentTo: undefined,
  sentSubject: undefined,
  customerNotes: "Draft for an alternate tax split.",
  internalNotes: "Expired validity badge test.",
  costingSnapshot: { ...quoV1.costingSnapshot!, unitPriceMinor: 16_00, sellingPriceMinor: 16_00 },
  totals: totalsDraft,
  isDemoData: true,
  createdAt: "2026-07-01T09:00:00.000Z",
  updatedAt: "2026-07-01T09:00:00.000Z",
});

interface QuotationState {
  quotations: CrmQuotation[];
  items: QuotationLine[];
  charges: QuotationCharge[];
  versions: QuotationVersionSnapshot[];
  approvals: QuotationApprovalRecord[];
  documents: QuotationDocument[];
  getQuotation: (id: string) => CrmQuotation | undefined;
  createQuotation: (input: Omit<CrmQuotation, "id" | "quotationNumber" | "displayNumber" | "searchIndex" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy" | "totals" | "familyId" | "version"> & { quotationNumber?: string; familyId?: string; version?: number; totals?: CrmQuotation["totals"] }, actor: AuthenticatedUser) => CrmQuotation;
  updateQuotation: (id: string, patch: Partial<CrmQuotation>, actor: AuthenticatedUser) => CrmQuotation;
  changeStatus: (id: string, status: QuotationStatus, actor: AuthenticatedUser) => CrmQuotation;
  replaceItems: (quotationId: string, lines: QuotationLine[]) => void;
  replaceCharges: (quotationId: string, charges: QuotationCharge[]) => void;
  addVersion: (snapshot: QuotationVersionSnapshot) => void;
  addApproval: (record: Omit<QuotationApprovalRecord, "id" | "createdAt">) => QuotationApprovalRecord;
  addDocument: (input: Omit<QuotationDocument, "id" | "generatedAt">, actor: AuthenticatedUser) => QuotationDocument;
  recalculate: (quotationId: string) => CrmQuotation;
}

export const useQuotationStore = create<QuotationState>()(
  persist(
    (set, get) => ({
      quotations: [quoV1, quoV2, quoDraft],
      items: [lineV1, lineV2, lineDraft],
      charges: [chargeV1, chargeV2],
      versions: [
        {
          id: "qver_1",
          quotationId: "quo_abc_v1",
          quotationNumber: "QUO-2026-00001",
          version: 1,
          changeReason: "Initial customer quotation from approved costing.",
          totals: totalsV1,
          paymentTerms: "NET_30",
          deliveryTerms: "EX_WORKS",
          validUntil: "2026-10-23",
          createdAt: "2026-07-23T09:00:00.000Z",
          createdBy: "usr_bd",
          createdByName: "Meera Iyer",
        },
        {
          id: "qver_2",
          quotationId: "quo_abc_v2",
          quotationNumber: "QUO-2026-00001",
          version: 2,
          changeReason: "Customer requested a lower unit price.",
          totals: totalsV2,
          paymentTerms: "NET_30",
          deliveryTerms: "EX_WORKS",
          validUntil: "2026-11-10",
          createdAt: "2026-08-10T08:00:00.000Z",
          createdBy: "usr_bd",
          createdByName: "Meera Iyer",
        },
      ],
      approvals: [
        {
          id: "qapr_1",
          quotationId: "quo_abc_v1",
          levelId: "SALES_MANAGER",
          levelName: "Sales Manager",
          decision: "APPROVED",
          remarks: "Approved for send.",
          actorId: "usr_sales",
          actorName: "Rohit Menon",
          actorRole: "sales_manager",
          createdAt: "2026-07-24T10:00:00.000Z",
        },
      ],
      documents: [],
      getQuotation: (id) => get().quotations.find((item) => item.id === id),
      createQuotation: (input, actor) => {
        const quotationNumber = input.quotationNumber?.trim() || nextQuotationNumber(get().quotations.map((item) => item.quotationNumber));
        if (get().quotations.some((item) => item.quotationNumber === quotationNumber && item.version === (input.version ?? 1))) {
          throw new AppError("CONFLICT", "Quotation number and version already exist.", 409);
        }
        const times = stamp(actor);
        const record = withSearch({
          ...input,
          id: `quo_${crypto.randomUUID().slice(0, 8)}`,
          quotationNumber,
          displayNumber: formatQuotationDisplay(quotationNumber, input.version ?? 1),
          version: input.version ?? 1,
          familyId: input.familyId ?? "",
          totals: input.totals ?? emptyQuotationTotals(input.currency),
          ...times,
        });
        const created = { ...record, familyId: record.familyId || record.id };
        set((state) => ({ quotations: [created, ...state.quotations] }));
        writeLocalAudit({
          userId: actor.uid,
          userEmail: actor.email,
          action: "create",
          module: "quotations",
          recordId: created.id,
          timestamp: times.createdAt,
          oldValue: null,
          newValue: created.displayNumber,
        });
        return created;
      },
      updateQuotation: (id, patch, actor) => {
        const current = get().getQuotation(id);
        if (!current) throw new AppError("NOT_FOUND", "Quotation not found.", 404);
        const next = withSearch({
          ...current,
          ...patch,
          updatedAt: nowIso(),
          updatedBy: actor.uid,
        });
        set((state) => ({ quotations: state.quotations.map((item) => (item.id === id ? next : item)) }));
        writeLocalAudit({
          userId: actor.uid,
          userEmail: actor.email,
          action: "update",
          module: "quotations",
          recordId: id,
          timestamp: next.updatedAt,
          oldValue: current.status,
          newValue: next.status,
        });
        return next;
      },
      changeStatus: (id, status, actor) => {
        const current = get().getQuotation(id);
        if (!current) throw new AppError("NOT_FOUND", "Quotation not found.", 404);
        validateQuotationTransition(current.status, status);
        return get().updateQuotation(id, { status }, actor);
      },
      replaceItems: (quotationId, lines) => {
        set((state) => ({
          items: [...state.items.filter((item) => item.quotationId !== quotationId), ...lines],
        }));
      },
      replaceCharges: (quotationId, charges) => {
        set((state) => ({
          charges: [...state.charges.filter((item) => item.quotationId !== quotationId), ...charges],
        }));
      },
      addVersion: (snapshot) => set((state) => ({ versions: [snapshot, ...state.versions] })),
      addApproval: (record) => {
        const next: QuotationApprovalRecord = { ...record, id: `qapr_${crypto.randomUUID().slice(0, 8)}`, createdAt: nowIso() };
        set((state) => ({ approvals: [next, ...state.approvals] }));
        return next;
      },
      addDocument: (input, actor) => {
        const record: QuotationDocument = {
          ...input,
          id: `qdoc_${crypto.randomUUID().slice(0, 8)}`,
          generatedAt: nowIso(),
          generatedBy: input.generatedBy || actor.uid,
          generatedByName: input.generatedByName || actor.displayName,
        };
        set((state) => ({ documents: [record, ...state.documents] }));
        writeLocalAudit({
          userId: actor.uid,
          userEmail: actor.email,
          action: "update",
          module: "quotations",
          recordId: record.quotationId,
          timestamp: record.generatedAt,
          oldValue: null,
          newValue: record.fileName,
        });
        return record;
      },
      recalculate: (quotationId) => {
        const current = get().getQuotation(quotationId);
        if (!current) throw new AppError("NOT_FOUND", "Quotation not found.", 404);
        const items = get().items.filter((item) => item.quotationId === quotationId);
        const charges = get().charges.filter((item) => item.quotationId === quotationId);
        const computedItems = items.map((line, index) => ({
          ...line,
          sortOrder: index,
          ...calculateLine({
            quantity: line.quantity,
            unitPriceMinor: line.unitPriceMinor,
            discountType: line.discountType,
            discountValue: line.discountValue,
            taxRate: line.taxRate,
          }),
        }));
        set((state) => ({
          items: [...state.items.filter((item) => item.quotationId !== quotationId), ...computedItems],
        }));
        const totals = calculateGrandTotal({
          lines: computedItems,
          charges,
          headerDiscountType: current.headerDiscountType,
          headerDiscountValue: current.headerDiscountValue,
          currency: current.currency,
        });
        const next = withSearch({ ...current, totals, updatedAt: nowIso() });
        set((state) => ({
          quotations: state.quotations.map((item) => (item.id === quotationId ? next : item)),
        }));
        return next;
      },
    }),
    { name: "patri-cmo-crm-quotation" },
  ),
);
