"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nowIso } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { useAppStore } from "@/services/store";
import { buildCostingSearchIndex, formatCostingDisplay, nextCostingNumber } from "@/services/costing/costing-code";
import { calculateMaterialLine, calculateTotalCost } from "@/services/costing/cost-calculation.service";
import { validateCostingTransition } from "@/services/costing/costing-workflow.service";
import type { CostingStatus } from "@/constants/costing";
import type { AuditLogEntry } from "@/types/audit";
import type { AuthenticatedUser } from "@/types/rbac";
import type {
  CostingActivityCostLine,
  CostingAdjustment,
  CostingApprovalRecord,
  CostingDocument,
  CostingManufacturing,
  CostingMaterialLine,
  CostingOverheadLine,
  CostingPackagingLine,
  CostingQualityLine,
  CostingVersionSnapshot,
  CostingVolumeTier,
  CostSheet,
} from "@/types/costing";

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

function withSearch(item: Omit<CostSheet, "searchIndex"> & { searchIndex?: string }): CostSheet {
  return {
    ...item,
    displayNumber: formatCostingDisplay(item.costingNumber, item.version),
    searchIndex: buildCostingSearchIndex({
      costingNumber: item.costingNumber,
      displayNumber: formatCostingDisplay(item.costingNumber, item.version),
      customerName: item.customerName,
      productName: item.productName,
      enquiryNumber: item.enquiryNumber,
      feasibilityNumber: item.feasibilityNumber,
    }),
  };
}

function emptyTotals() {
  return {
    materialCostMinor: 0,
    apiCostMinor: 0,
    excipientCostMinor: 0,
    processMaterialCostMinor: 0,
    packagingCostMinor: 0,
    primaryPackagingCostMinor: 0,
    secondaryPackagingCostMinor: 0,
    tertiaryPackagingCostMinor: 0,
    manufacturingCostMinor: 0,
    qualityCostMinor: 0,
    regulatoryCostMinor: 0,
    documentationCostMinor: 0,
    overheadCostMinor: 0,
    materialAdjustmentMinor: 0,
    totalCostMinor: 0,
    marginAmountMinor: 0,
    sellingPriceMinor: 0,
    unitCostMinor: 0,
    unitPriceMinor: 0,
    priceAdjustmentMinor: 0,
  };
}

const materialApi: CostingMaterialLine = {
  id: "cmat_api_abc",
  costingId: "cost_abc_v1",
  materialType: "API",
  materialName: "Pantoprazole Sodium",
  quantityRequired: 4.2,
  unit: "kg",
  unitCostMinor: 85_000_00,
  wastagePercent: 3,
  ...calculateMaterialLine({ quantityRequired: 4.2, unitCostMinor: 85_000_00, wastagePercent: 3 }),
  sortOrder: 0,
};

const materialExc: CostingMaterialLine = {
  id: "cmat_exc_abc",
  costingId: "cost_abc_v1",
  materialType: "EXCIPIENT",
  materialName: "Mannitol",
  quantityRequired: 12,
  unit: "kg",
  unitCostMinor: 4_500_00,
  wastagePercent: 2,
  ...calculateMaterialLine({ quantityRequired: 12, unitCostMinor: 4_500_00, wastagePercent: 2 }),
  sortOrder: 1,
};

const packPrimary: CostingPackagingLine = {
  id: "cpack_pri_abc",
  costingId: "cost_abc_v1",
  level: "PRIMARY",
  materialName: "Alu-Alu foil",
  packagingType: "ALU_ALU",
  packSize: "10x10",
  quantityRequired: 1000,
  unit: "packs",
  unitCostMinor: 18_00,
  wastagePercent: 1.5,
  ...(() => {
    const calc = calculateMaterialLine({ quantityRequired: 1000, unitCostMinor: 18_00, wastagePercent: 1.5 });
    return { effectiveQuantity: calc.effectiveQuantity, totalCostMinor: calc.totalCostMinor };
  })(),
  sortOrder: 0,
};

const packSecondary: CostingPackagingLine = {
  id: "cpack_sec_abc",
  costingId: "cost_abc_v1",
  level: "SECONDARY",
  materialName: "Carton",
  packagingType: "CARTON",
  packSize: "10x10",
  quantityRequired: 1000,
  unit: "nos",
  unitCostMinor: 6_50,
  wastagePercent: 1,
  ...(() => {
    const calc = calculateMaterialLine({ quantityRequired: 1000, unitCostMinor: 6_50, wastagePercent: 1 });
    return { effectiveQuantity: calc.effectiveQuantity, totalCostMinor: calc.totalCostMinor };
  })(),
  sortOrder: 1,
};

const manufacturingAbc: CostingManufacturing = {
  costingId: "cost_abc_v1",
  manufacturingSite: "Goa Plant 1",
  manufacturingUnit: "OSD-2",
  productionLine: "Tablet line 3",
  batchSize: 100_000,
  numberOfBatches: 1,
  setupCostMinor: 15_000_00,
  changeoverCostMinor: 8_000_00,
  processingCostMinor: 22_000_00,
  cleaningCostMinor: 5_000_00,
  labor: [
    { id: "clab_1", department: "Production", category: "PRODUCTION_OPERATOR", hours: 24, hourlyCostMinor: 450_00, totalCostMinor: 10_800_00 },
    { id: "clab_2", department: "Production", category: "SUPERVISOR", hours: 8, hourlyCostMinor: 750_00, totalCostMinor: 6_000_00 },
  ],
  machines: [{ id: "cmac_1", machine: "Compression machine", machineHours: 10, hourlyRateMinor: 1_200_00, totalCostMinor: 12_000_00 }],
  utilities: [{ id: "cutl_1", utilityType: "ELECTRICITY", consumption: 180, unit: "kWh", rateMinor: 12_00, totalCostMinor: 2_160_00 }],
};

const qualityAbc: CostingQualityLine[] = [
  { id: "cqc_1", costingId: "cost_abc_v1", activity: "QC_TESTING", quantity: 1, unitCostMinor: 18_000_00, totalCostMinor: 18_000_00 },
];
const regulatoryAbc: CostingActivityCostLine[] = [
  { id: "creg_1", costingId: "cost_abc_v1", activity: "ARTWORK_REVIEW", costMinor: 7_500_00 },
];
const documentationAbc: CostingActivityCostLine[] = [
  { id: "cdoc_1", costingId: "cost_abc_v1", activity: "BATCH_DOCUMENTATION", costMinor: 4_000_00 },
];
const overheadAbc: CostingOverheadLine[] = [
  { id: "covh_1", costingId: "cost_abc_v1", overheadType: "MANUFACTURING", mode: "PERCENTAGE", percent: 8, totalCostMinor: 0 },
];

const seedHeader: CostSheet = withSearch({
  id: "cost_abc_v1",
  costingNumber: "COST-2026-00001",
  displayNumber: "COST-2026-00001-V1",
  enquiryId: "enq_abc",
  enquiryNumber: "ENQ-2026-00002",
  customerId: "cust_abc",
  customerName: "ABC Pharma Pvt Ltd",
  productName: "Pantoprazole 40 mg",
  productRequirementId: "req_abc",
  feasibilityId: "feas_abc",
  feasibilityNumber: "FEAS-2026-00003",
  version: 1,
  familyId: "cost_abc_v1",
  status: "APPROVED",
  approvalStatus: "APPROVED",
  currency: "INR",
  costingDate: "2026-07-21",
  validUntil: "2027-01-21",
  preparedBy: "usr_bd",
  preparedByName: "Meera Iyer",
  assignedTo: "usr_bd",
  assignedToName: "Meera Iyer",
  approvedBy: "usr_sales",
  approvedByName: "Rohit Menon",
  approvedAt: "2026-07-22T11:00:00.000Z",
  baseQuantity: 100_000,
  quantityUnit: "TABLETS",
  batchSize: 100_000,
  numberOfBatches: 1,
  annualQuantity: 1_200_000,
  marginType: "PERCENTAGE_MARGIN",
  marginValue: 22,
  remarks: "Seed approved costing for quotation integration.",
  commercial: { market: "India", paymentTermsPlaceholder: "30 days", deliveryTermsPlaceholder: "Ex-works" },
  yield: { expectedYieldPercent: 98, materialWastagePercent: 3, productionLossPercent: 1, packagingLossPercent: 1.5 },
  totals: emptyTotals(),
  searchIndex: "",
  isDemoData: true,
  createdAt: "2026-07-21T09:00:00.000Z",
  updatedAt: "2026-07-22T11:00:00.000Z",
  createdBy: "usr_bd",
  updatedBy: "usr_sales",
});

function computeFor(costing: CostSheet, ctx: {
  materials: CostingMaterialLine[];
  packaging: CostingPackagingLine[];
  manufacturing?: CostingManufacturing;
  quality: CostingQualityLine[];
  regulatory: CostingActivityCostLine[];
  documentation: CostingActivityCostLine[];
  overhead: CostingOverheadLine[];
  adjustments: CostingAdjustment[];
}) {
  const result = calculateTotalCost({
    materials: ctx.materials.filter((item) => item.costingId === costing.id),
    packaging: ctx.packaging.filter((item) => item.costingId === costing.id),
    manufacturing: ctx.manufacturing,
    quality: ctx.quality.filter((item) => item.costingId === costing.id),
    regulatory: ctx.regulatory.filter((item) => item.costingId === costing.id),
    documentation: ctx.documentation.filter((item) => item.costingId === costing.id),
    overhead: ctx.overhead.filter((item) => item.costingId === costing.id),
    adjustments: ctx.adjustments.filter((item) => item.costingId === costing.id),
    costing,
  });
  return withSearch({ ...costing, totals: result.totals });
}

const abcV1 = computeFor(seedHeader, {
  materials: [materialApi, materialExc],
  packaging: [packPrimary, packSecondary],
  manufacturing: manufacturingAbc,
  quality: qualityAbc,
  regulatory: regulatoryAbc,
  documentation: documentationAbc,
  overhead: overheadAbc,
  adjustments: [],
});

const abcV2Base: CostSheet = withSearch({
  ...abcV1,
  id: "cost_abc_v2",
  displayNumber: "COST-2026-00001-V2",
  version: 2,
  familyId: "cost_abc_v1",
  status: "APPROVAL_PENDING",
  approvalStatus: "APPROVAL_PENDING",
  approvedBy: undefined,
  approvedByName: undefined,
  approvedAt: undefined,
  marginValue: 24,
  validUntil: "2027-04-30",
  isDemoData: true,
  createdAt: "2026-08-15T10:00:00.000Z",
  updatedAt: "2026-08-20T10:00:00.000Z",
});

const materialApiV2 = { ...materialApi, id: "cmat_api_abc2", costingId: "cost_abc_v2", unitCostMinor: 88_000_00, ...calculateMaterialLine({ quantityRequired: 4.2, unitCostMinor: 88_000_00, wastagePercent: 3 }) };
const materialExcV2 = { ...materialExc, id: "cmat_exc_abc2", costingId: "cost_abc_v2" };
const packPriV2 = { ...packPrimary, id: "cpack_pri_abc2", costingId: "cost_abc_v2" };
const packSecV2 = { ...packSecondary, id: "cpack_sec_abc2", costingId: "cost_abc_v2" };
const mfgV2 = { ...manufacturingAbc, costingId: "cost_abc_v2" };
const qualityV2 = qualityAbc.map((item) => ({ ...item, id: `${item.id}_v2`, costingId: "cost_abc_v2" }));
const regulatoryV2 = regulatoryAbc.map((item) => ({ ...item, id: `${item.id}_v2`, costingId: "cost_abc_v2" }));
const documentationV2 = documentationAbc.map((item) => ({ ...item, id: `${item.id}_v2`, costingId: "cost_abc_v2" }));
const overheadV2 = overheadAbc.map((item) => ({ ...item, id: `${item.id}_v2`, costingId: "cost_abc_v2" }));

const abcV2 = computeFor(abcV2Base, {
  materials: [materialApiV2, materialExcV2],
  packaging: [packPriV2, packSecV2],
  manufacturing: mfgV2,
  quality: qualityV2,
  regulatory: regulatoryV2,
  documentation: documentationV2,
  overhead: overheadV2,
  adjustments: [],
});

const draftHeader: CostSheet = withSearch({
  ...abcV1,
  id: "cost_abc_draft",
  costingNumber: "COST-2026-00002",
  displayNumber: "COST-2026-00002-V1",
  version: 1,
  familyId: "cost_abc_draft",
  status: "IN_PROGRESS",
  approvalStatus: "NOT_SUBMITTED",
  approvedBy: undefined,
  approvedByName: undefined,
  approvedAt: undefined,
  remarks: "Alternate pack costing in progress.",
  validUntil: "2026-08-01",
  createdAt: "2026-08-25T09:00:00.000Z",
  updatedAt: "2026-08-26T09:00:00.000Z",
});

const draft = computeFor(draftHeader, {
  materials: [{ ...materialApi, id: "cmat_api_draft", costingId: "cost_abc_draft" }],
  packaging: [{ ...packPrimary, id: "cpack_draft", costingId: "cost_abc_draft" }],
  manufacturing: { ...manufacturingAbc, costingId: "cost_abc_draft", labor: [], machines: [], utilities: [] },
  quality: [],
  regulatory: [],
  documentation: [],
  overhead: [],
  adjustments: [],
});

interface CostingState {
  costings: CostSheet[];
  materials: CostingMaterialLine[];
  packaging: CostingPackagingLine[];
  manufacturing: CostingManufacturing[];
  quality: CostingQualityLine[];
  regulatory: CostingActivityCostLine[];
  documentation: CostingActivityCostLine[];
  overhead: CostingOverheadLine[];
  adjustments: CostingAdjustment[];
  tiers: CostingVolumeTier[];
  versions: CostingVersionSnapshot[];
  approvals: CostingApprovalRecord[];
  documents: CostingDocument[];
  getCosting: (id: string) => CostSheet | undefined;
  upsertCosting: (item: CostSheet) => void;
  createCosting: (input: Omit<CostSheet, "id" | "costingNumber" | "displayNumber" | "searchIndex" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy" | "totals" | "familyId" | "version"> & { costingNumber?: string; familyId?: string; version?: number; totals?: CostSheet["totals"] }, actor: AuthenticatedUser) => CostSheet;
  updateCosting: (id: string, patch: Partial<CostSheet>, actor: AuthenticatedUser) => CostSheet;
  changeStatus: (id: string, status: CostingStatus, actor: AuthenticatedUser) => CostSheet;
  replaceMaterials: (costingId: string, lines: CostingMaterialLine[]) => void;
  replacePackaging: (costingId: string, lines: CostingPackagingLine[]) => void;
  upsertManufacturing: (record: CostingManufacturing) => void;
  replaceQuality: (costingId: string, lines: CostingQualityLine[]) => void;
  replaceRegulatory: (costingId: string, lines: CostingActivityCostLine[]) => void;
  replaceDocumentation: (costingId: string, lines: CostingActivityCostLine[]) => void;
  replaceOverhead: (costingId: string, lines: CostingOverheadLine[]) => void;
  addAdjustment: (input: Omit<CostingAdjustment, "id" | "createdAt" | "createdBy" | "createdByName">, actor: AuthenticatedUser) => CostingAdjustment;
  replaceTiers: (costingId: string, tiers: CostingVolumeTier[]) => void;
  addVersion: (snapshot: CostingVersionSnapshot) => void;
  addApproval: (record: Omit<CostingApprovalRecord, "id" | "createdAt">) => CostingApprovalRecord;
  addDocument: (input: Omit<CostingDocument, "id" | "uploadedAt">, actor: AuthenticatedUser) => CostingDocument;
  recalculate: (costingId: string) => CostSheet;
}

export const useCostingStore = create<CostingState>()(
  persist(
    (set, get) => ({
      costings: [abcV1, abcV2, draft],
      materials: [materialApi, materialExc, materialApiV2, materialExcV2, { ...materialApi, id: "cmat_api_draft", costingId: "cost_abc_draft" }],
      packaging: [packPrimary, packSecondary, packPriV2, packSecV2, { ...packPrimary, id: "cpack_draft", costingId: "cost_abc_draft" }],
      manufacturing: [manufacturingAbc, mfgV2, { ...manufacturingAbc, costingId: "cost_abc_draft", labor: [], machines: [], utilities: [] }],
      quality: [...qualityAbc, ...qualityV2],
      regulatory: [...regulatoryAbc, ...regulatoryV2],
      documentation: [...documentationAbc, ...documentationV2],
      overhead: [...overheadAbc, ...overheadV2],
      adjustments: [],
      tiers: [
        { id: "ctier_1", costingId: "cost_abc_v1", minimumQuantity: 0, maximumQuantity: 10_000, unitPriceMinor: 1_20, marginPercent: 18 },
        { id: "ctier_2", costingId: "cost_abc_v1", minimumQuantity: 10_001, maximumQuantity: 50_000, unitPriceMinor: 1_10, marginPercent: 20 },
        { id: "ctier_3", costingId: "cost_abc_v1", minimumQuantity: 50_001, maximumQuantity: 100_000, unitPriceMinor: 1_00, marginPercent: 22 },
        { id: "ctier_4", costingId: "cost_abc_v1", minimumQuantity: 100_001, unitPriceMinor: 92, marginPercent: 24 },
      ],
      versions: [
        {
          id: "cver_abc_v1",
          costingId: "cost_abc_v1",
          version: 1,
          costingNumber: "COST-2026-00001",
          changeReason: "Initial approved costing",
          totals: abcV1.totals,
          createdAt: abcV1.createdAt,
          createdBy: "usr_bd",
          createdByName: "Meera Iyer",
        },
      ],
      approvals: [
        {
          id: "capr_abc_1",
          costingId: "cost_abc_v1",
          levelId: "SALES_MANAGER",
          levelName: "Sales Manager",
          decision: "APPROVED",
          remarks: "Margin acceptable for domestic Pantoprazole.",
          actorId: "usr_sales",
          actorName: "Rohit Menon",
          actorRole: "sales_manager",
          createdAt: "2026-07-22T11:00:00.000Z",
        },
      ],
      documents: [],
      getCosting: (id) => get().costings.find((item) => item.id === id),
      upsertCosting: (item) => set((state) => ({ costings: [item, ...state.costings.filter((row) => row.id !== item.id)] })),
      createCosting: (input, actor) => {
        const costingNumber = input.costingNumber?.trim() || nextCostingNumber(get().costings.map((item) => item.costingNumber));
        if (get().costings.some((item) => item.costingNumber === costingNumber && item.version === (input.version ?? 1))) {
          throw new AppError("CONFLICT", "Costing number and version already exist.", 409);
        }
        const times = stamp(actor);
        const record = withSearch({
          ...input,
          id: `cost_${crypto.randomUUID().slice(0, 8)}`,
          costingNumber,
          displayNumber: formatCostingDisplay(costingNumber, input.version ?? 1),
          version: input.version ?? 1,
          familyId: input.familyId ?? "",
          totals: input.totals ?? emptyTotals(),
          ...times,
        });
        const created = { ...record, familyId: record.familyId || record.id };
        set((state) => ({ costings: [created, ...state.costings] }));
        writeLocalAudit({
          userId: actor.uid,
          userEmail: actor.email,
          action: "create",
          module: "costing",
          recordId: created.id,
          timestamp: times.createdAt,
          oldValue: null,
          newValue: created.displayNumber,
        });
        return created;
      },
      updateCosting: (id, patch, actor) => {
        const current = get().getCosting(id);
        if (!current) throw new AppError("NOT_FOUND", "Costing not found.", 404);
        const next = withSearch({
          ...current,
          ...patch,
          id: current.id,
          costingNumber: current.costingNumber,
          familyId: current.familyId,
          createdAt: current.createdAt,
          createdBy: current.createdBy,
          updatedAt: nowIso(),
          updatedBy: actor.uid,
        });
        set((state) => ({ costings: state.costings.map((item) => (item.id === id ? next : item)) }));
        writeLocalAudit({
          userId: actor.uid,
          userEmail: actor.email,
          action: "update",
          module: "costing",
          recordId: id,
          timestamp: next.updatedAt,
          oldValue: current.status,
          newValue: next.status,
        });
        return next;
      },
      changeStatus: (id, status, actor) => {
        const current = get().getCosting(id);
        if (!current) throw new AppError("NOT_FOUND", "Costing not found.", 404);
        validateCostingTransition(current.status, status);
        return get().updateCosting(id, { status }, actor);
      },
      replaceMaterials: (costingId, lines) => set((state) => ({ materials: [...state.materials.filter((item) => item.costingId !== costingId), ...lines] })),
      replacePackaging: (costingId, lines) => set((state) => ({ packaging: [...state.packaging.filter((item) => item.costingId !== costingId), ...lines] })),
      upsertManufacturing: (record) => set((state) => ({ manufacturing: [record, ...state.manufacturing.filter((item) => item.costingId !== record.costingId)] })),
      replaceQuality: (costingId, lines) => set((state) => ({ quality: [...state.quality.filter((item) => item.costingId !== costingId), ...lines] })),
      replaceRegulatory: (costingId, lines) => set((state) => ({ regulatory: [...state.regulatory.filter((item) => item.costingId !== costingId), ...lines] })),
      replaceDocumentation: (costingId, lines) => set((state) => ({ documentation: [...state.documentation.filter((item) => item.costingId !== costingId), ...lines] })),
      replaceOverhead: (costingId, lines) => set((state) => ({ overhead: [...state.overhead.filter((item) => item.costingId !== costingId), ...lines] })),
      addAdjustment: (input, actor) => {
        const record: CostingAdjustment = {
          ...input,
          id: `cadj_${crypto.randomUUID().slice(0, 8)}`,
          createdAt: nowIso(),
          createdBy: actor.uid,
          createdByName: actor.displayName,
        };
        set((state) => ({ adjustments: [record, ...state.adjustments] }));
        writeLocalAudit({
          userId: actor.uid,
          userEmail: actor.email,
          action: "update",
          module: "costing",
          recordId: record.costingId,
          timestamp: record.createdAt,
          oldValue: null,
          newValue: record.reason,
        });
        return record;
      },
      replaceTiers: (costingId, tiers) => set((state) => ({
        tiers: [...state.tiers.filter((item) => item.costingId !== costingId), ...tiers],
      })),
      addVersion: (snapshot) => set((state) => ({ versions: [snapshot, ...state.versions] })),
      addApproval: (record) => {
        const next: CostingApprovalRecord = { ...record, id: `capr_${crypto.randomUUID().slice(0, 8)}`, createdAt: nowIso() };
        set((state) => ({ approvals: [next, ...state.approvals] }));
        return next;
      },
      addDocument: (input, actor) => {
        const record: CostingDocument = {
          ...input,
          id: `cdoc_${crypto.randomUUID().slice(0, 8)}`,
          uploadedAt: nowIso(),
          uploadedBy: actor.uid,
          uploadedByName: actor.displayName,
        };
        set((state) => ({ documents: [record, ...state.documents] }));
        writeLocalAudit({
          userId: actor.uid,
          userEmail: actor.email,
          action: "upload",
          module: "costing_documents",
          recordId: record.costingId,
          timestamp: record.uploadedAt,
          oldValue: null,
          newValue: record.fileName,
        });
        return record;
      },
      recalculate: (costingId) => {
        const state = get();
        const current = state.getCosting(costingId);
        if (!current) throw new AppError("NOT_FOUND", "Costing not found.", 404);
        const next = computeFor(current, {
          materials: state.materials,
          packaging: state.packaging,
          manufacturing: state.manufacturing.find((item) => item.costingId === costingId),
          quality: state.quality,
          regulatory: state.regulatory,
          documentation: state.documentation,
          overhead: state.overhead,
          adjustments: state.adjustments,
        });
        set((store) => ({
          costings: store.costings.map((item) => (item.id === costingId ? next : item)),
          overhead: next.totals ? store.overhead : store.overhead,
        }));
        return next;
      },
    }),
    { name: "patri-cmo-crm-costing" },
  ),
);
