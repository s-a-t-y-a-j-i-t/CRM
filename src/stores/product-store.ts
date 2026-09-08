"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nowIso } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { useAppStore } from "@/services/store";
import { buildProductSearchIndex, nextProductCode } from "@/services/products/product-code";
import type { AuditLogEntry } from "@/types/audit";
import type { AuthenticatedUser } from "@/types/rbac";
import type { CrmProduct, ProductActivity, ProductDocument, ProductSpecification } from "@/types/products";
import type { ProductStatus } from "@/constants/products";

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

function withSearch(product: CrmProduct): CrmProduct {
  return {
    ...product,
    searchIndex: buildProductSearchIndex(product),
  };
}

const seededProducts: CrmProduct[] = [
  withSearch({
    id: "pms_telmi",
    productCode: "PRD-00001",
    productName: "Telmisartan 40 mg Tablet",
    genericName: "Telmisartan",
    brandName: "Helix-Teli",
    productCategory: "GENERIC",
    productType: "TABLET",
    dosageForm: "TABLET",
    strength: "40",
    strengthUnit: "mg",
    composition: [
      { id: "pc_1", ingredientName: "Telmisartan", activeIngredient: true, strength: "40", unit: "mg", role: "API", sortOrder: 0 },
    ],
    therapeuticCategory: "Cardiovascular",
    pharmacopoeiaStandard: "IP",
    manufacturingSite: "Taloja",
    manufacturingUnit: "OSD-1",
    packagingType: "ALU_ALU",
    standardPackSize: "10s",
    marketType: "DOMESTIC",
    status: "ACTIVE",
    regulatoryStatus: "REGISTERED",
    description: "Company product master for Telmisartan 40 mg uncoated tablets.",
    isDemoData: true,
    createdAt: "2026-03-01T09:00:00.000Z",
    updatedAt: "2026-05-02T09:20:00.000Z",
    createdBy: "usr_bd",
    updatedBy: "usr_qa",
    searchIndex: "",
  }),
  withSearch({
    id: "pms_azith",
    productCode: "PRD-00002",
    productName: "Azithromycin 250 mg Capsule",
    genericName: "Azithromycin",
    brandName: "AziAur",
    productCategory: "BRANDED_GENERIC",
    productType: "CAPSULE",
    dosageForm: "CAPSULE",
    strength: "250",
    strengthUnit: "mg",
    composition: [
      { id: "pc_2", ingredientName: "Azithromycin", activeIngredient: true, strength: "250", unit: "mg", role: "API", sortOrder: 0 },
    ],
    therapeuticCategory: "Anti-infective",
    pharmacopoeiaStandard: "USP",
    manufacturingSite: "Taloja",
    manufacturingUnit: "OSD-2",
    packagingType: "BLISTER",
    standardPackSize: "6s",
    marketType: "BOTH",
    status: "UNDER_REVIEW",
    regulatoryStatus: "DOSSIER_PENDING",
    isDemoData: true,
    createdAt: "2026-06-12T10:00:00.000Z",
    updatedAt: "2026-08-01T10:00:00.000Z",
    createdBy: "usr_bd",
    updatedBy: "usr_bd",
    searchIndex: "",
  }),
  withSearch({
    id: "pms_amox",
    productCode: "PRD-00003",
    productName: "Amoxicillin 500 mg Capsule",
    genericName: "Amoxicillin",
    productCategory: "EXPORT",
    productType: "CAPSULE",
    dosageForm: "CAPSULE",
    strength: "500",
    strengthUnit: "mg",
    composition: [
      { id: "pc_3", ingredientName: "Amoxicillin trihydrate", activeIngredient: true, strength: "500", unit: "mg", role: "API", sortOrder: 0 },
    ],
    therapeuticCategory: "Anti-infective",
    pharmacopoeiaStandard: "BP",
    manufacturingSite: "Hyderabad",
    packagingType: "HDPE_BOTTLE",
    standardPackSize: "100s",
    marketType: "EXPORT",
    status: "DRAFT",
    regulatoryStatus: "NOT_ASSESSED",
    isDemoData: true,
    createdAt: "2026-07-20T08:00:00.000Z",
    updatedAt: "2026-07-20T08:00:00.000Z",
    createdBy: "usr_bd",
    updatedBy: "usr_bd",
    searchIndex: "",
  }),
];

interface ProductState {
  products: CrmProduct[];
  specifications: ProductSpecification[];
  documents: ProductDocument[];
  activities: ProductActivity[];
  getProduct: (id: string) => CrmProduct | undefined;
  createProduct: (input: Omit<CrmProduct, "id" | "productCode" | "searchIndex" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy"> & { productCode?: string }, actor: AuthenticatedUser) => CrmProduct;
  updateProduct: (id: string, patch: Partial<CrmProduct>, actor: AuthenticatedUser) => CrmProduct;
  changeStatus: (id: string, status: ProductStatus, actor: AuthenticatedUser) => CrmProduct;
  addSpecification: (input: Omit<ProductSpecification, "id" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy" | "version">, actor: AuthenticatedUser) => ProductSpecification;
  addActivity: (input: Omit<ProductActivity, "id" | "createdAt" | "createdBy" | "createdByName">, actor: AuthenticatedUser) => ProductActivity;
  addDocument: (input: Omit<ProductDocument, "id" | "uploadedAt">, actor: AuthenticatedUser) => ProductDocument;
}

export const useProductStore = create<ProductState>()(
  persist(
    (set, get) => ({
      products: seededProducts,
      specifications: [
        {
          id: "pspec_telmi_assay",
          productId: "pms_telmi",
          specificationType: "Finished product",
          parameter: "Assay",
          limit: "95%-105%",
          unit: "%",
          testMethod: "Pharmacopoeial",
          remarks: "IP method.",
          version: 1,
          createdAt: "2026-03-01T09:00:00.000Z",
          updatedAt: "2026-03-01T09:00:00.000Z",
          createdBy: "usr_qa",
          updatedBy: "usr_qa",
        },
      ],
      documents: [],
      activities: [],
      getProduct: (id) => get().products.find((item) => item.id === id),
      createProduct: (input, actor) => {
        const productCode = input.productCode?.trim() || nextProductCode(get().products.map((item) => item.productCode));
        if (get().products.some((item) => item.productCode === productCode)) {
          throw new AppError("CONFLICT", "Product code is already in use.", 409);
        }
        const times = stamp(actor);
        const record = withSearch({
          ...input,
          id: `pms_${crypto.randomUUID().slice(0, 8)}`,
          productCode,
          searchIndex: "",
          ...times,
        });
        set((state) => ({ products: [record, ...state.products] }));
        writeLocalAudit({
          userId: actor.uid,
          userEmail: actor.email,
          action: "create",
          module: "products",
          recordId: record.id,
          timestamp: times.createdAt,
          oldValue: null,
          newValue: record.productCode,
        });
        return record;
      },
      updateProduct: (id, patch, actor) => {
        const current = get().getProduct(id);
        if (!current) throw new AppError("NOT_FOUND", "Product not found.", 404);
        const next = withSearch({
          ...current,
          ...patch,
          id: current.id,
          productCode: current.productCode,
          createdAt: current.createdAt,
          createdBy: current.createdBy,
          updatedAt: nowIso(),
          updatedBy: actor.uid,
        });
        set((state) => ({ products: state.products.map((item) => (item.id === id ? next : item)) }));
        writeLocalAudit({
          userId: actor.uid,
          userEmail: actor.email,
          action: "update",
          module: "products",
          recordId: id,
          timestamp: next.updatedAt,
          oldValue: current.productName,
          newValue: next.productName,
        });
        return next;
      },
      changeStatus: (id, status, actor) => {
        const current = get().getProduct(id);
        if (!current) throw new AppError("NOT_FOUND", "Product not found.", 404);
        const next = get().updateProduct(id, { status }, actor);
        writeLocalAudit({
          userId: actor.uid,
          userEmail: actor.email,
          action: "status_change",
          module: "products",
          recordId: id,
          timestamp: next.updatedAt,
          oldValue: current.status,
          newValue: status,
        });
        return next;
      },
      addSpecification: (input, actor) => {
        const times = stamp(actor);
        const record: ProductSpecification = { ...input, id: `pspec_${crypto.randomUUID().slice(0, 8)}`, version: 1, ...times };
        set((state) => ({ specifications: [record, ...state.specifications] }));
        return record;
      },
      addActivity: (input, actor) => {
        const record: ProductActivity = {
          ...input,
          id: `pact_${crypto.randomUUID().slice(0, 8)}`,
          createdAt: nowIso(),
          createdBy: actor.uid,
          createdByName: actor.displayName,
        };
        set((state) => ({ activities: [record, ...state.activities] }));
        return record;
      },
      addDocument: (input, actor) => {
        const record: ProductDocument = {
          ...input,
          id: `pdoc_${crypto.randomUUID().slice(0, 8)}`,
          uploadedAt: nowIso(),
          uploadedBy: actor.uid,
          uploadedByName: actor.displayName,
        };
        set((state) => ({ documents: [record, ...state.documents] }));
        return record;
      },
    }),
    { name: "patri-cmo-crm-products" },
  ),
);
