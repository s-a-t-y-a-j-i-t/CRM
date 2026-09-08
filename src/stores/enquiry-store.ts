"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nowIso } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { useAppStore } from "@/services/store";
import { buildEnquirySearchIndex, nextEnquiryNumber } from "@/services/enquiries/enquiry-code";
import { validateTransition } from "@/services/enquiries/enquiry-workflow.service";
import type { AuditLogEntry } from "@/types/audit";
import type {
  CrmEnquiry,
  EnquiryActivity,
  EnquiryDocument,
  EnquiryFollowUp,
  EnquiryStatus,
  ProductRequirement,
  RequirementVersion,
} from "@/types/enquiries";
import type { AuthenticatedUser } from "@/types/rbac";

function writeLocalAudit(entry: Omit<AuditLogEntry, "id">) {
  const db = useAppStore.getState().db;
  useAppStore.setState({
    db: {
      ...db,
      auditLogs: [{ ...entry, id: `aud_${crypto.randomUUID()}` }, ...db.auditLogs],
    },
  });
}

function stamp(user: AuthenticatedUser) {
  const now = nowIso();
  return { createdAt: now, updatedAt: now, createdBy: user.uid, updatedBy: user.uid };
}

function withSearch(enquiry: CrmEnquiry, requirement?: ProductRequirement): CrmEnquiry {
  return {
    ...enquiry,
    searchIndex: buildEnquirySearchIndex({
      enquiryNumber: enquiry.enquiryNumber,
      customerName: enquiry.customerName,
      contactName: enquiry.contactName,
      productName: requirement?.productName,
      genericName: requirement?.genericName,
      brandName: requirement?.brandName,
    }),
  };
}

function seedRequirement(partial: ProductRequirement): ProductRequirement {
  return partial;
}

function seedData() {
  const reqHelix = seedRequirement({
    id: "req_helix",
    enquiryId: "enq_helix",
    isNewProductRequirement: false,
    productMasterId: "pms_telmi",
    productName: "Telmisartan 40 mg",
    genericName: "Telmisartan",
    brandName: "Helix-Teli",
    dosageForm: "TABLET",
    strength: "40 mg",
    composition: [
      { id: "cmp_1", ingredient: "Telmisartan", strength: "40", unit: "mg", role: "API", sortOrder: 0 },
    ],
    packaging: { primaryType: "ALU_ALU", secondaryType: "CARTON", packSize: "10s", unitsPerPack: 10, notes: "Alu-Alu 10s blister" },
    packSize: "10s",
    requiredQuantity: 2_500_000,
    quantityUnit: "TABLETS",
    annualQuantity: 10_000_000,
    targetPriceMinor: 185_00,
    currency: "INR",
    priceBasis: "PER_TABLET",
    market: "India",
    country: "India",
    marketType: "DOMESTIC",
    artwork: { status: "ARTWORK_PROVIDED" },
    specification: { status: "CUSTOMER_SPECIFICATION_AVAILABLE", specificationType: "FP specification" },
    sample: { required: false, status: "NOT_REQUIRED" },
    stability: { required: true, stabilityType: "Accelerated", storageCondition: "40°C / 75% RH", duration: "6 months" },
    delivery: { requiredDeliveryDate: "2026-10-31", expectedLeadTime: "90 days", deliveryLocation: "Bhiwandi" },
    versionNumber: 1,
    isCurrent: true,
    createdAt: "2026-05-18T11:00:00.000Z",
    updatedAt: "2026-05-18T11:00:00.000Z",
    createdBy: "usr_sales",
    updatedBy: "usr_sales",
  });

  const reqAbc = seedRequirement({
    id: "req_abc",
    enquiryId: "enq_abc",
    isNewProductRequirement: true,
    productName: "Pantoprazole 40 mg",
    genericName: "Pantoprazole",
    dosageForm: "TABLET",
    strength: "40 mg",
    composition: [
      { id: "cmp_a1", ingredient: "Pantoprazole Sodium", strength: "40", unit: "mg", role: "API", sortOrder: 0 },
      { id: "cmp_a2", ingredient: "Mannitol", strength: "q.s.", unit: "mg", role: "EXCIPIENT", sortOrder: 1 },
    ],
    packaging: { primaryType: "ALU_ALU", secondaryType: "CARTON", packSize: "10x10", unitsPerPack: 100 },
    requiredQuantity: 100_000,
    quantityUnit: "TABLETS",
    annualQuantity: 1_200_000,
    moqRequirement: 50_000,
    targetPriceMinor: 95_00,
    currency: "INR",
    priceBasis: "PER_TABLET",
    market: "India",
    country: "India",
    marketType: "DOMESTIC",
    artwork: { status: "ARTWORK_PENDING" },
    specification: { status: "SPECIFICATION_REQUIRED" },
    sample: { required: true, quantity: 200, sampleType: "Commercial pack", status: "REQUESTED" },
    stability: { required: false },
    delivery: { expectedLeadTime: "75 days", deliveryLocation: "Taloja" },
    specialRequirements: "Customer requested 100,000 tablets per month after first commercial batch.",
    versionNumber: 1,
    isCurrent: true,
    createdAt: "2026-08-28T16:00:00.000Z",
    updatedAt: "2026-08-28T16:00:00.000Z",
    createdBy: "usr_sales",
    updatedBy: "usr_sales",
  });

  const reqNimbus = seedRequirement({
    id: "req_nimbus",
    enquiryId: "enq_nimbus",
    isNewProductRequirement: true,
    productName: "Azithromycin 500 mg",
    genericName: "Azithromycin",
    dosageForm: "TABLET",
    strength: "500 mg",
    composition: [{ id: "cmp_n1", ingredient: "Azithromycin", strength: "500", unit: "mg", role: "API", sortOrder: 0 }],
    packaging: { primaryType: "BLISTER", secondaryType: "CARTON", packSize: "3s", unitsPerPack: 3 },
    requiredQuantity: 1_000_000,
    quantityUnit: "TABLETS",
    targetPriceMinor: 220_00,
    currency: "USD",
    priceBasis: "PER_BOX",
    market: "GCC",
    country: "UAE",
    marketType: "EXPORT",
    regulatoryRequirement: "CTD dossier and COPP",
    artwork: { status: "ARTWORK_REQUIRED" },
    specification: { status: "SPECIFICATION_PENDING" },
    sample: { required: true, status: "PREPARING", quantity: 50, sampleType: "Export pack" },
    stability: { required: true, duration: "24 months", storageCondition: "30°C / 75% RH" },
    delivery: { deliveryLocation: "Jebel Ali" },
    versionNumber: 1,
    isCurrent: true,
    createdAt: "2026-08-20T11:30:00.000Z",
    updatedAt: "2026-08-20T11:30:00.000Z",
    createdBy: "usr_sales",
    updatedBy: "usr_sales",
  });

  const requirements: ProductRequirement[] = [
    reqHelix,
    reqAbc,
    reqNimbus,
    seedRequirement({
      id: "req_aurora",
      enquiryId: "enq_aurora",
      isNewProductRequirement: true,
      productName: "Azithromycin 250 mg",
      genericName: "Azithromycin",
      dosageForm: "TABLET",
      strength: "250 mg",
      composition: [{ id: "cmp_au1", ingredient: "Azithromycin", strength: "250", unit: "mg", role: "API", sortOrder: 0 }],
      packaging: { primaryType: "PVC_ALU", packSize: "6s", unitsPerPack: 6 },
      requiredQuantity: 300_000,
      quantityUnit: "TABLETS",
      currency: "INR",
      priceBasis: "PER_TABLET",
      country: "India",
      marketType: "DOMESTIC",
      artwork: { status: "ARTWORK_REQUIRED" },
      specification: { status: "SPECIFICATION_REQUIRED" },
      sample: { required: false, status: "NOT_REQUIRED" },
      stability: { required: false },
      delivery: {},
      versionNumber: 1,
      isCurrent: true,
      createdAt: "2026-09-01T08:00:00.000Z",
      updatedAt: "2026-09-01T08:00:00.000Z",
      createdBy: "usr_bd",
      updatedBy: "usr_bd",
    }),
    seedRequirement({
      id: "req_vertex",
      enquiryId: "enq_vertex",
      isNewProductRequirement: true,
      productName: "Vitamin D3 60,000 IU",
      genericName: "Cholecalciferol",
      dosageForm: "CAPSULE",
      strength: "60,000 IU",
      composition: [{ id: "cmp_v1", ingredient: "Cholecalciferol", strength: "60000", unit: "IU", role: "API", sortOrder: 0 }],
      packaging: { primaryType: "BOTTLE", secondaryType: "CARTON", packSize: "4s", unitsPerPack: 4 },
      requiredQuantity: 500_000,
      quantityUnit: "CAPSULES",
      currency: "INR",
      country: "India",
      marketType: "DOMESTIC",
      artwork: { status: "ARTWORK_PENDING" },
      specification: { status: "SPECIFICATION_PENDING" },
      sample: { required: false, status: "NOT_REQUIRED" },
      stability: { required: false },
      delivery: {},
      versionNumber: 1,
      isCurrent: true,
      createdAt: "2026-08-22T09:15:00.000Z",
      updatedAt: "2026-08-22T09:15:00.000Z",
      createdBy: "usr_bd",
      updatedBy: "usr_bd",
    }),
    seedRequirement({
      id: "req_blue",
      enquiryId: "enq_blue",
      isNewProductRequirement: true,
      productName: "Levocetirizine 5 mg",
      genericName: "Levocetirizine",
      dosageForm: "TABLET",
      strength: "5 mg",
      composition: [{ id: "cmp_b1", ingredient: "Levocetirizine dihydrochloride", strength: "5", unit: "mg", role: "API", sortOrder: 0 }],
      packaging: { primaryType: "STRIP", packSize: "10s", unitsPerPack: 10 },
      requiredQuantity: 800_000,
      quantityUnit: "TABLETS",
      currency: "INR",
      country: "India",
      marketType: "DOMESTIC",
      artwork: { status: "ARTWORK_PROVIDED" },
      specification: { status: "SPECIFICATION_PROVIDED" },
      sample: { required: false, status: "NOT_REQUIRED" },
      stability: { required: false },
      delivery: {},
      versionNumber: 1,
      isCurrent: true,
      createdAt: "2026-08-18T13:10:00.000Z",
      updatedAt: "2026-08-18T13:10:00.000Z",
      createdBy: "usr_sales",
      updatedBy: "usr_sales",
    }),
    seedRequirement({
      id: "req_lost",
      enquiryId: "enq_lost",
      isNewProductRequirement: true,
      productName: "Atorvastatin 20 mg",
      genericName: "Atorvastatin",
      dosageForm: "TABLET",
      strength: "20 mg",
      composition: [{ id: "cmp_l1", ingredient: "Atorvastatin calcium", strength: "20", unit: "mg", role: "API", sortOrder: 0 }],
      packaging: { primaryType: "ALU_ALU" },
      requiredQuantity: 200_000,
      quantityUnit: "TABLETS",
      currency: "INR",
      country: "India",
      marketType: "DOMESTIC",
      artwork: { status: "ARTWORK_REQUIRED" },
      specification: { status: "SPECIFICATION_REQUIRED" },
      sample: { required: false, status: "NOT_REQUIRED" },
      stability: { required: false },
      delivery: {},
      versionNumber: 1,
      isCurrent: true,
      createdAt: "2026-07-01T10:00:00.000Z",
      updatedAt: "2026-07-01T10:00:00.000Z",
      createdBy: "usr_bd",
      updatedBy: "usr_bd",
    }),
    seedRequirement({
      id: "req_hold",
      enquiryId: "enq_hold",
      isNewProductRequirement: true,
      productName: "Paracetamol 650 mg",
      genericName: "Paracetamol",
      dosageForm: "TABLET",
      strength: "650 mg",
      composition: [{ id: "cmp_h1", ingredient: "Paracetamol", strength: "650", unit: "mg", role: "API", sortOrder: 0 }],
      packaging: { primaryType: "STRIP" },
      requiredQuantity: 400_000,
      quantityUnit: "TABLETS",
      currency: "INR",
      country: "India",
      marketType: "DOMESTIC",
      artwork: { status: "ARTWORK_PENDING" },
      specification: { status: "SPECIFICATION_PENDING" },
      sample: { required: false, status: "NOT_REQUIRED" },
      stability: { required: false },
      delivery: {},
      versionNumber: 1,
      isCurrent: true,
      createdAt: "2026-08-05T09:00:00.000Z",
      updatedAt: "2026-08-05T09:00:00.000Z",
      createdBy: "usr_bd",
      updatedBy: "usr_bd",
    }),
  ];

  const byId = Object.fromEntries(requirements.map((item) => [item.enquiryId, item]));

  const base = (row: Omit<CrmEnquiry, "searchIndex">): CrmEnquiry =>
    withSearch({ ...row, searchIndex: "" }, byId[row.id]);

  const enquiries: CrmEnquiry[] = [
    base({
      id: "enq_helix",
      enquiryNumber: "ENQ-2026-00001",
      leadId: "lead_helix",
      customerId: "cust_helix",
      contactId: "con_helix_priya",
      customerName: "Helix Therapeutics Private Limited",
      contactName: "Priya Nair",
      enquirySource: "LEAD",
      enquiryType: "REPEAT_ORDER",
      assignedTo: "usr_sales",
      assignedToName: "Rohit Menon",
      assignedAt: "2026-05-18T11:00:00.000Z",
      priority: "HIGH",
      status: "FEASIBILITY_PENDING",
      receivedDate: "2026-05-18",
      expectedDecisionDate: "2026-06-30",
      currentRequirementId: "req_helix",
      technicalReviewStatus: "COMPLETED",
      technicalReviewStartedAt: "2026-05-20T09:00:00.000Z",
      isDemoData: true,
      createdAt: "2026-05-18T11:00:00.000Z",
      updatedAt: "2026-08-01T10:00:00.000Z",
      createdBy: "usr_sales",
      updatedBy: "usr_sales",
    }),
    base({
      id: "enq_abc",
      enquiryNumber: "ENQ-2026-00002",
      customerId: "cust_abc",
      contactId: "con_abc_rahul",
      customerName: "ABC Pharma Pvt Ltd",
      contactName: "Rahul Sharma",
      enquirySource: "EXISTING_CUSTOMER",
      enquiryType: "NEW_PRODUCT",
      assignedTo: "usr_sales",
      assignedToName: "Rohit Menon",
      assignedAt: "2026-08-28T16:00:00.000Z",
      priority: "HIGH",
      status: "UNDER_REVIEW",
      receivedDate: "2026-08-28",
      expectedDecisionDate: "2026-12-15",
      currentRequirementId: "req_abc",
      technicalReviewStatus: "NOT_STARTED",
      isDemoData: true,
      createdAt: "2026-08-28T16:00:00.000Z",
      updatedAt: "2026-08-28T16:00:00.000Z",
      createdBy: "usr_sales",
      updatedBy: "usr_sales",
    }),
    base({
      id: "enq_nimbus",
      enquiryNumber: "ENQ-2026-00003",
      leadId: "lead_nimbus",
      customerId: "cust_nimbus",
      contactId: "",
      customerName: "Nimbus Pharma Export FZ-LLC",
      contactName: "Omar Haddad",
      enquirySource: "LEAD",
      enquiryType: "EXPORT",
      assignedTo: "usr_sales",
      assignedToName: "Rohit Menon",
      assignedAt: "2026-08-20T11:30:00.000Z",
      priority: "HIGH",
      status: "TECHNICAL_REVIEW",
      receivedDate: "2026-08-20",
      expectedDecisionDate: "2026-10-15",
      currentRequirementId: "req_nimbus",
      technicalReviewStatus: "IN_PROGRESS",
      technicalReviewStartedAt: "2026-08-25T08:00:00.000Z",
      technicalReviewer: "usr_bd",
      isDemoData: true,
      createdAt: "2026-08-20T11:30:00.000Z",
      updatedAt: "2026-08-25T08:00:00.000Z",
      createdBy: "usr_sales",
      updatedBy: "usr_bd",
    }),
    base({
      id: "enq_aurora",
      enquiryNumber: "ENQ-2026-00004",
      customerId: "cust_aurora",
      contactId: "con_aurora_leena",
      customerName: "Aurora Lifesciences LLP",
      contactName: "Leena Reddy",
      enquirySource: "EMAIL",
      enquiryType: "DOMESTIC",
      assignedTo: "usr_bd",
      assignedToName: "Meera Iyer",
      assignedAt: "2026-09-01T08:00:00.000Z",
      priority: "MEDIUM",
      status: "NEW",
      receivedDate: "2026-09-01",
      currentRequirementId: "req_aurora",
      technicalReviewStatus: "NOT_STARTED",
      isDemoData: true,
      createdAt: "2026-09-01T08:00:00.000Z",
      updatedAt: "2026-09-01T08:00:00.000Z",
      createdBy: "usr_bd",
      updatedBy: "usr_bd",
    }),
    base({
      id: "enq_vertex",
      enquiryNumber: "ENQ-2026-00005",
      customerId: "cust_abc",
      contactId: "con_abc_priya",
      customerName: "Vertex Nutraceuticals",
      contactName: "Anita Kulkarni",
      enquirySource: "WEBSITE",
      enquiryType: "NEW_PRODUCT",
      assignedTo: "usr_bd",
      assignedToName: "Meera Iyer",
      assignedAt: "2026-08-22T09:15:00.000Z",
      priority: "MEDIUM",
      status: "REQUIREMENT_PENDING",
      receivedDate: "2026-08-22",
      currentRequirementId: "req_vertex",
      technicalReviewStatus: "NOT_STARTED",
      isDemoData: true,
      createdAt: "2026-08-22T09:15:00.000Z",
      updatedAt: "2026-08-22T09:15:00.000Z",
      createdBy: "usr_bd",
      updatedBy: "usr_bd",
    }),
    base({
      id: "enq_blue",
      enquiryNumber: "ENQ-2026-00006",
      leadId: "lead_enquiry",
      customerId: "cust_abc",
      contactId: "con_abc_rahul",
      customerName: "Blue Harbor Pharma",
      contactName: "Farah Khan",
      enquirySource: "LEAD",
      enquiryType: "NEW_PRODUCT",
      assignedTo: "usr_sales",
      assignedToName: "Rohit Menon",
      assignedAt: "2026-08-18T13:10:00.000Z",
      priority: "MEDIUM",
      status: "QUOTATION_PENDING",
      receivedDate: "2026-08-18",
      expectedDecisionDate: "2026-11-15",
      currentRequirementId: "req_blue",
      technicalReviewStatus: "COMPLETED",
      isDemoData: true,
      createdAt: "2026-08-18T13:10:00.000Z",
      updatedAt: "2026-08-18T13:10:00.000Z",
      createdBy: "usr_sales",
      updatedBy: "usr_sales",
    }),
    base({
      id: "enq_lost",
      enquiryNumber: "ENQ-2026-00007",
      customerId: "cust_aurora",
      contactId: "con_aurora_leena",
      customerName: "Pinnacle Generics",
      contactName: "Harish Rao",
      enquirySource: "PHONE",
      enquiryType: "OTHER",
      assignedTo: "usr_bd",
      assignedToName: "Meera Iyer",
      assignedAt: "2026-07-01T10:00:00.000Z",
      priority: "LOW",
      status: "LOST",
      previousStatus: "UNDER_REVIEW",
      receivedDate: "2026-07-01",
      lostReason: "Customer selected competitor",
      currentRequirementId: "req_lost",
      technicalReviewStatus: "NOT_STARTED",
      isDemoData: true,
      createdAt: "2026-07-01T10:00:00.000Z",
      updatedAt: "2026-07-12T14:00:00.000Z",
      createdBy: "usr_bd",
      updatedBy: "usr_bd",
    }),
    base({
      id: "enq_hold",
      enquiryNumber: "ENQ-2026-00008",
      customerId: "cust_aurora",
      contactId: "con_aurora_leena",
      customerName: "Orion Wellness Ltd",
      contactName: "Kiran Shetty",
      enquirySource: "REFERRAL",
      enquiryType: "CUSTOMER_SPECIFIC",
      assignedTo: "usr_bd",
      assignedToName: "Meera Iyer",
      assignedAt: "2026-08-05T09:00:00.000Z",
      priority: "MEDIUM",
      status: "ON_HOLD",
      previousStatus: "TECHNICAL_REVIEW",
      receivedDate: "2026-08-05",
      currentRequirementId: "req_hold",
      technicalReviewStatus: "IN_PROGRESS",
      isDemoData: true,
      createdAt: "2026-08-05T09:00:00.000Z",
      updatedAt: "2026-08-05T09:00:00.000Z",
      createdBy: "usr_bd",
      updatedBy: "usr_bd",
    }),
  ];

  return { enquiries, requirements };
}

const seeded = seedData();

interface EnquiryState {
  enquiries: CrmEnquiry[];
  requirements: ProductRequirement[];
  versions: RequirementVersion[];
  activities: EnquiryActivity[];
  followUps: EnquiryFollowUp[];
  documents: EnquiryDocument[];
  getEnquiry: (id: string) => CrmEnquiry | undefined;
  getRequirement: (enquiryId: string) => ProductRequirement | undefined;
  createEnquiry: (input: Omit<CrmEnquiry, "id" | "enquiryNumber" | "searchIndex" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy"> & { enquiryNumber?: string }, actor: AuthenticatedUser) => CrmEnquiry;
  updateEnquiry: (id: string, patch: Partial<CrmEnquiry>, actor: AuthenticatedUser) => CrmEnquiry;
  assignEnquiry: (id: string, assignedTo: string, assignedToName: string, actor: AuthenticatedUser) => CrmEnquiry;
  changeStatus: (id: string, status: EnquiryStatus, actor: AuthenticatedUser) => CrmEnquiry;
  createRequirement: (input: Omit<ProductRequirement, "id" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy" | "versionNumber" | "isCurrent">, actor: AuthenticatedUser) => ProductRequirement;
  updateRequirement: (id: string, next: ProductRequirement, reason: string, actor: AuthenticatedUser) => ProductRequirement;
  addActivity: (input: Omit<EnquiryActivity, "id" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy" | "createdByName">, actor: AuthenticatedUser) => EnquiryActivity;
  addFollowUp: (input: Omit<EnquiryFollowUp, "id" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">, actor: AuthenticatedUser) => EnquiryFollowUp;
  updateFollowUp: (id: string, patch: Partial<EnquiryFollowUp>, actor: AuthenticatedUser) => EnquiryFollowUp;
  addDocument: (input: Omit<EnquiryDocument, "id" | "uploadedAt">, actor: AuthenticatedUser) => EnquiryDocument;
  archiveDocument: (id: string, actor: AuthenticatedUser) => EnquiryDocument;
}

export const useEnquiryStore = create<EnquiryState>()(
  persist(
    (set, get) => ({
      enquiries: seeded.enquiries,
      requirements: seeded.requirements,
      versions: [],
      activities: [
        {
          id: "eact_helix",
          enquiryId: "enq_helix",
          customerId: "cust_helix",
          type: "NOTE",
          subject: "Enquiry converted from lead",
          description: "LEAD-00001 transferred Telmisartan 40 mg requirement.",
          activityDate: "2026-05-18T11:00:00.000Z",
          status: "COMPLETED",
          createdAt: "2026-05-18T11:00:00.000Z",
          createdBy: "usr_sales",
          createdByName: "Rohit Menon",
          updatedAt: "2026-05-18T11:00:00.000Z",
          updatedBy: "usr_sales",
        },
      ],
      followUps: [
        {
          id: "efu_abc",
          enquiryId: "enq_abc",
          followUpAt: "2026-09-05T14:00:00.000Z",
          assignedTo: "usr_sales",
          assignedToName: "Rohit Menon",
          purpose: "Collect complete composition and pack style",
          priority: "HIGH",
          status: "PENDING",
          createdAt: "2026-08-28T16:10:00.000Z",
          createdBy: "usr_sales",
          updatedAt: "2026-08-28T16:10:00.000Z",
          updatedBy: "usr_sales",
        },
        {
          id: "efu_overdue",
          enquiryId: "enq_nimbus",
          followUpAt: "2026-09-03T10:00:00.000Z",
          assignedTo: "usr_sales",
          assignedToName: "Rohit Menon",
          purpose: "Share CTD checklist",
          priority: "HIGH",
          status: "PENDING",
          createdAt: "2026-08-25T08:10:00.000Z",
          createdBy: "usr_bd",
          updatedAt: "2026-08-25T08:10:00.000Z",
          updatedBy: "usr_bd",
        },
      ],
      documents: [],
      getEnquiry: (id) => get().enquiries.find((item) => item.id === id),
      getRequirement: (enquiryId) => get().requirements.find((item) => item.enquiryId === enquiryId && item.isCurrent),
      createEnquiry: (input, actor) => {
        const enquiryNumber = input.enquiryNumber?.trim() || nextEnquiryNumber(get().enquiries.map((item) => item.enquiryNumber));
        if (get().enquiries.some((item) => item.enquiryNumber === enquiryNumber)) {
          throw new AppError("CONFLICT", "Enquiry number is already in use.", 409);
        }
        const times = stamp(actor);
        const record = withSearch({
          ...input,
          id: `enq_${crypto.randomUUID().slice(0, 8)}`,
          enquiryNumber,
          assignedAt: input.assignedAt ?? times.createdAt,
          ...times,
          searchIndex: "",
        });
        set((state) => ({ enquiries: [record, ...state.enquiries] }));
        writeLocalAudit({
          userId: actor.uid,
          userEmail: actor.email,
          action: "create",
          module: "enquiries",
          recordId: record.id,
          timestamp: times.createdAt,
          oldValue: null,
          newValue: record.enquiryNumber,
        });
        get().addActivity(
          {
            enquiryId: record.id,
            customerId: record.customerId,
            contactId: record.contactId,
            type: "NOTE",
            subject: record.leadId ? "Enquiry converted from lead" : "Enquiry created",
            description: record.enquiryNumber,
            activityDate: times.createdAt,
            status: "COMPLETED",
          },
          actor,
        );
        return record;
      },
      updateEnquiry: (id, patch, actor) => {
        const current = get().getEnquiry(id);
        if (!current) throw new AppError("NOT_FOUND", "Enquiry not found.", 404);
        const requirement = get().getRequirement(id);
        const next = withSearch({
          ...current,
          ...patch,
          id: current.id,
          enquiryNumber: current.enquiryNumber,
          createdAt: current.createdAt,
          createdBy: current.createdBy,
          updatedAt: nowIso(),
          updatedBy: actor.uid,
        }, requirement);
        set((state) => ({ enquiries: state.enquiries.map((item) => (item.id === id ? next : item)) }));
        writeLocalAudit({
          userId: actor.uid,
          userEmail: actor.email,
          action: "update",
          module: "enquiries",
          recordId: id,
          timestamp: next.updatedAt,
          oldValue: current.customerName,
          newValue: next.customerName,
        });
        return next;
      },
      assignEnquiry: (id, assignedTo, assignedToName, actor) => {
        const current = get().getEnquiry(id);
        if (!current) throw new AppError("NOT_FOUND", "Enquiry not found.", 404);
        const next = get().updateEnquiry(id, { assignedTo, assignedToName, assignedAt: nowIso() }, actor);
        writeLocalAudit({
          userId: actor.uid,
          userEmail: actor.email,
          action: "update",
          module: "enquiries",
          recordId: id,
          timestamp: nowIso(),
          oldValue: current.assignedToName,
          newValue: assignedToName,
        });
        get().addActivity(
          {
            enquiryId: id,
            type: "NOTE",
            subject: current.assignedTo === assignedTo ? "Enquiry assigned" : "Enquiry reassigned",
            description: `${current.assignedToName} → ${assignedToName}`,
            activityDate: nowIso(),
            status: "COMPLETED",
          },
          actor,
        );
        return next;
      },
      changeStatus: (id, status, actor) => {
        const current = get().getEnquiry(id);
        if (!current) throw new AppError("NOT_FOUND", "Enquiry not found.", 404);
        validateTransition(current.status, status);
        const next = get().updateEnquiry(
          id,
          { status, previousStatus: status === "ON_HOLD" || status === "LOST" || status === "CANCELLED" ? current.status : current.previousStatus },
          actor,
        );
        writeLocalAudit({
          userId: actor.uid,
          userEmail: actor.email,
          action: "status_change",
          module: "enquiries",
          recordId: id,
          timestamp: nowIso(),
          oldValue: current.status,
          newValue: status,
        });
        get().addActivity(
          {
            enquiryId: id,
            type: "NOTE",
            subject: "Status changed",
            description: `${current.status} → ${status}`,
            activityDate: nowIso(),
            status: "COMPLETED",
          },
          actor,
        );
        return next;
      },
      createRequirement: (input, actor) => {
        const enquiry = get().getEnquiry(input.enquiryId);
        if (!enquiry) throw new AppError("NOT_FOUND", "Enquiry not found.", 404);
        const times = stamp(actor);
        const record: ProductRequirement = {
          ...input,
          id: `req_${crypto.randomUUID().slice(0, 8)}`,
          versionNumber: 1,
          isCurrent: true,
          ...times,
        };
        set((state) => ({
          requirements: [record, ...state.requirements.map((item) => (item.enquiryId === input.enquiryId ? { ...item, isCurrent: false } : item))],
        }));
        get().updateEnquiry(input.enquiryId, { currentRequirementId: record.id }, actor);
        writeLocalAudit({
          userId: actor.uid,
          userEmail: actor.email,
          action: "create",
          module: "product_requirements",
          recordId: record.id,
          timestamp: times.createdAt,
          oldValue: null,
          newValue: record.productName,
        });
        get().addActivity(
          {
            enquiryId: input.enquiryId,
            type: "NOTE",
            subject: "Requirement added",
            description: record.productName,
            activityDate: times.createdAt,
            status: "COMPLETED",
          },
          actor,
        );
        return record;
      },
      updateRequirement: (id, nextReq, reason, actor) => {
        const current = get().requirements.find((item) => item.id === id);
        if (!current) throw new AppError("NOT_FOUND", "Requirement not found.", 404);
        const version: RequirementVersion = {
          id: `rver_${crypto.randomUUID().slice(0, 8)}`,
          enquiryId: current.enquiryId,
          requirementId: current.id,
          versionNumber: current.versionNumber,
          changedBy: actor.uid,
          changedByName: actor.displayName,
          changedAt: nowIso(),
          changeReason: reason || "Requirement updated",
          snapshot: current,
          oldValue: `${current.productName} · ${current.requiredQuantity ?? "—"}`,
          newValue: `${nextReq.productName} · ${nextReq.requiredQuantity ?? "—"}`,
        };
        const updated: ProductRequirement = {
          ...nextReq,
          id: current.id,
          enquiryId: current.enquiryId,
          versionNumber: current.versionNumber + 1,
          isCurrent: true,
          createdAt: current.createdAt,
          createdBy: current.createdBy,
          updatedAt: nowIso(),
          updatedBy: actor.uid,
        };
        set((state) => ({
          requirements: state.requirements.map((item) => (item.id === id ? updated : item)),
          versions: [version, ...state.versions],
        }));
        const enquiry = get().getEnquiry(current.enquiryId);
        if (enquiry) {
          set((state) => ({
            enquiries: state.enquiries.map((item) =>
              item.id === enquiry.id ? withSearch(item, updated) : item,
            ),
          }));
        }
        writeLocalAudit({
          userId: actor.uid,
          userEmail: actor.email,
          action: "update",
          module: "product_requirements",
          recordId: id,
          timestamp: updated.updatedAt,
          oldValue: version.oldValue ?? null,
          newValue: `${version.newValue ?? ""} · ${version.changeReason}`,
        });
        get().addActivity(
          {
            enquiryId: current.enquiryId,
            type: "NOTE",
            subject: "Requirement version created",
            description: `v${current.versionNumber} → v${updated.versionNumber}. ${version.changeReason}`,
            activityDate: nowIso(),
            status: "COMPLETED",
          },
          actor,
        );
        return updated;
      },
      addActivity: (input, actor) => {
        const times = stamp(actor);
        const record: EnquiryActivity = {
          ...input,
          id: `eact_${crypto.randomUUID().slice(0, 8)}`,
          createdByName: actor.displayName,
          ...times,
        };
        set((state) => ({ activities: [record, ...state.activities] }));
        return record;
      },
      addFollowUp: (input, actor) => {
        const times = stamp(actor);
        const record: EnquiryFollowUp = { ...input, id: `efu_${crypto.randomUUID().slice(0, 8)}`, ...times };
        set((state) => ({ followUps: [record, ...state.followUps] }));
        get().addActivity(
          {
            enquiryId: record.enquiryId,
            type: "FOLLOW_UP",
            subject: "Follow-up scheduled",
            description: record.purpose,
            activityDate: record.followUpAt,
            status: "OPEN",
          },
          actor,
        );
        return record;
      },
      updateFollowUp: (id, patch, actor) => {
        const current = get().followUps.find((item) => item.id === id);
        if (!current) throw new AppError("NOT_FOUND", "Follow-up not found.", 404);
        const next: EnquiryFollowUp = { ...current, ...patch, updatedAt: nowIso(), updatedBy: actor.uid };
        set((state) => ({ followUps: state.followUps.map((item) => (item.id === id ? next : item)) }));
        return next;
      },
      addDocument: (input, actor) => {
        const record: EnquiryDocument = {
          ...input,
          id: `edoc_${crypto.randomUUID().slice(0, 8)}`,
          uploadedAt: nowIso(),
          uploadedBy: actor.uid,
          uploadedByName: actor.displayName,
        };
        set((state) => ({ documents: [record, ...state.documents] }));
        writeLocalAudit({
          userId: actor.uid,
          userEmail: actor.email,
          action: "upload",
          module: "documents",
          recordId: record.id,
          timestamp: record.uploadedAt,
          oldValue: null,
          newValue: record.fileName,
        });
        get().addActivity(
          {
            enquiryId: record.enquiryId,
            type: "NOTE",
            subject: "Document uploaded",
            description: record.fileName,
            activityDate: record.uploadedAt,
            status: "COMPLETED",
          },
          actor,
        );
        return record;
      },
      archiveDocument: (id, actor) => {
        const current = get().documents.find((item) => item.id === id);
        if (!current) throw new AppError("NOT_FOUND", "Document not found.", 404);
        const next: EnquiryDocument = { ...current, status: "ARCHIVED" };
        set((state) => ({ documents: state.documents.map((item) => (item.id === id ? next : item)) }));
        writeLocalAudit({
          userId: actor.uid,
          userEmail: actor.email,
          action: "delete",
          module: "documents",
          recordId: current.id,
          timestamp: nowIso(),
          oldValue: current.fileName,
          newValue: "ARCHIVED",
        });
        return next;
      },
    }),
    { name: "patri-cmo-crm-enquiries" },
  ),
);
