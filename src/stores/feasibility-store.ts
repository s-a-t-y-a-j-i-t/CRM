"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nowIso } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { useAppStore } from "@/services/store";
import { buildFeasibilitySearchIndex, nextFeasibilityNumber } from "@/services/feasibility/feasibility-code";
import { validateTransition } from "@/services/feasibility/feasibility-workflow.service";
import { FEASIBILITY_DEPARTMENTS } from "@/constants/feasibility";
import type { FeasibilityStatus } from "@/constants/feasibility";
import type { AuditLogEntry } from "@/types/audit";
import type { AuthenticatedUser } from "@/types/rbac";
import type {
  DepartmentReview,
  FeasibilityAssessment,
  FeasibilityClarification,
  FeasibilityDocument,
  FeasibilityEvaluation,
} from "@/types/feasibility";

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

function withSearch(item: FeasibilityAssessment): FeasibilityAssessment {
  return { ...item, searchIndex: buildFeasibilitySearchIndex(item) };
}

function defaultReviews(feasibilityId: string, createdAt: string): DepartmentReview[] {
  return FEASIBILITY_DEPARTMENTS.filter((item) => item.enabled).map((department) => ({
    id: `frev_${feasibilityId}_${department.id.toLowerCase()}`,
    feasibilityId,
    departmentId: department.id,
    departmentName: department.name,
    status: "PENDING",
    createdAt,
    updatedAt: createdAt,
  }));
}

const helix: FeasibilityAssessment = withSearch({
  id: "feas_helix",
  feasibilityNumber: "FEAS-2026-00001",
  enquiryId: "enq_helix",
  enquiryNumber: "ENQ-2026-00001",
  customerId: "cust_helix",
  customerName: "Helix Therapeutics",
  productId: "pms_telmi",
  productName: "Telmisartan 40 mg Tablet",
  genericName: "Telmisartan",
  productRequirementId: "req_helix",
  dosageForm: "TABLET",
  strength: "40 mg",
  quantity: 2_500_000,
  annualQuantity: 10_000_000,
  packaging: "Alu-Alu 10s",
  market: "India",
  assignedTo: "usr_bd",
  assignedToName: "Meera Iyer",
  assignedDepartment: "Business Development",
  technicalReviewer: "usr_bd",
  technicalReviewerName: "Meera Iyer",
  priority: "HIGH",
  status: "DEPARTMENT_REVIEW",
  initiatedAt: "2026-08-20T10:00:00.000Z",
  targetCompletionDate: "2026-09-20",
  conditions: [],
  isDemoData: true,
  createdAt: "2026-08-20T10:00:00.000Z",
  updatedAt: "2026-08-28T10:00:00.000Z",
  createdBy: "usr_sales",
  updatedBy: "usr_bd",
  searchIndex: "",
});

const nimbus: FeasibilityAssessment = withSearch({
  id: "feas_nimbus",
  feasibilityNumber: "FEAS-2026-00002",
  enquiryId: "enq_nimbus",
  enquiryNumber: "ENQ-2026-00003",
  customerId: "cust_nimbus",
  customerName: "Nimbus Pharma Export FZ-LLC",
  productId: "pms_amox",
  productName: "Amoxicillin 500 mg Capsule",
  genericName: "Amoxicillin",
  productRequirementId: "req_nimbus",
  dosageForm: "CAPSULE",
  strength: "500 mg",
  assignedTo: "usr_bd",
  assignedToName: "Meera Iyer",
  priority: "MEDIUM",
  status: "CLARIFICATION_REQUIRED",
  initiatedAt: "2026-08-25T09:00:00.000Z",
  targetCompletionDate: "2026-09-03",
  conditions: [],
  isDemoData: true,
  createdAt: "2026-08-25T09:00:00.000Z",
  updatedAt: "2026-08-30T09:00:00.000Z",
  createdBy: "usr_bd",
  updatedBy: "usr_bd",
  searchIndex: "",
});

const abc: FeasibilityAssessment = withSearch({
  id: "feas_abc",
  feasibilityNumber: "FEAS-2026-00003",
  enquiryId: "enq_abc",
  enquiryNumber: "ENQ-2026-00002",
  customerId: "cust_abc",
  customerName: "ABC Pharma",
  productName: "Pantoprazole 40 mg",
  genericName: "Pantoprazole",
  productRequirementId: "req_abc",
  dosageForm: "TABLET",
  strength: "40 mg",
  quantity: 100_000,
  annualQuantity: 1_200_000,
  assignedTo: "usr_bd",
  assignedToName: "Meera Iyer",
  priority: "HIGH",
  status: "FEASIBLE",
  overallDecision: "FEASIBLE",
  overallRemarks: "Existing Pantoprazole line can absorb the volume after campaign planning.",
  overallScore: 82,
  initiatedAt: "2026-07-01T10:00:00.000Z",
  targetCompletionDate: "2026-07-20",
  conditions: [],
  isDemoData: true,
  createdAt: "2026-07-01T10:00:00.000Z",
  updatedAt: "2026-07-18T10:00:00.000Z",
  createdBy: "usr_sales",
  updatedBy: "usr_bd",
  searchIndex: "",
});

interface FeasibilityState {
  assessments: FeasibilityAssessment[];
  reviews: DepartmentReview[];
  clarifications: FeasibilityClarification[];
  evaluations: FeasibilityEvaluation[];
  documents: FeasibilityDocument[];
  getAssessment: (id: string) => FeasibilityAssessment | undefined;
  getActiveForEnquiry: (enquiryId: string) => FeasibilityAssessment | undefined;
  createAssessment: (input: Omit<FeasibilityAssessment, "id" | "feasibilityNumber" | "searchIndex" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy" | "conditions"> & { feasibilityNumber?: string; conditions?: FeasibilityAssessment["conditions"] }, actor: AuthenticatedUser) => FeasibilityAssessment;
  updateAssessment: (id: string, patch: Partial<FeasibilityAssessment>, actor: AuthenticatedUser) => FeasibilityAssessment;
  changeStatus: (id: string, status: FeasibilityStatus, actor: AuthenticatedUser) => FeasibilityAssessment;
  updateReview: (id: string, patch: Partial<DepartmentReview>, actor: AuthenticatedUser) => DepartmentReview;
  addClarification: (input: Omit<FeasibilityClarification, "id" | "requestedAt" | "requestedBy" | "requestedByName" | "status">, actor: AuthenticatedUser) => FeasibilityClarification;
  updateClarification: (id: string, patch: Partial<FeasibilityClarification>, actor: AuthenticatedUser) => FeasibilityClarification;
  upsertEvaluation: (feasibilityId: string, evaluation: FeasibilityEvaluation) => void;
  addDocument: (input: Omit<FeasibilityDocument, "id" | "uploadedAt">, actor: AuthenticatedUser) => FeasibilityDocument;
}

export const useFeasibilityStore = create<FeasibilityState>()(
  persist(
    (set, get) => ({
      assessments: [helix, nimbus, abc],
      reviews: [
        ...defaultReviews("feas_helix", helix.createdAt).map((review) =>
          review.departmentId === "PRODUCTION"
            ? { ...review, status: "IN_REVIEW" as const, reviewerId: "usr_prod", reviewerName: "Sanjay Kulkarni", startedAt: "2026-08-22T10:00:00.000Z" }
            : review,
        ),
        ...defaultReviews("feas_nimbus", nimbus.createdAt),
        ...defaultReviews("feas_abc", abc.createdAt).map((review) => ({ ...review, status: "APPROVED" as const, decision: "FEASIBLE" as const, completedAt: abc.updatedAt })),
      ],
      clarifications: [
        {
          id: "fclar_nimbus",
          feasibilityId: "feas_nimbus",
          departmentId: "SALES",
          question: "Please confirm annual quantity and whether customer specification is available.",
          requestedBy: "usr_bd",
          requestedByName: "Meera Iyer",
          requestedAt: "2026-08-30T09:00:00.000Z",
          status: "OPEN",
          audience: "SALES",
        },
      ],
      evaluations: [],
      documents: [],
      getAssessment: (id) => get().assessments.find((item) => item.id === id),
      getActiveForEnquiry: (enquiryId) =>
        get().assessments.find((item) => item.enquiryId === enquiryId && !["FEASIBLE", "PARTIALLY_FEASIBLE", "NOT_FEASIBLE", "CANCELLED"].includes(item.status)),
      createAssessment: (input, actor) => {
        if (get().getActiveForEnquiry(input.enquiryId)) {
          throw new AppError("CONFLICT", "An active feasibility already exists for this enquiry.", 409);
        }
        const feasibilityNumber = input.feasibilityNumber?.trim() || nextFeasibilityNumber(get().assessments.map((item) => item.feasibilityNumber));
        if (get().assessments.some((item) => item.feasibilityNumber === feasibilityNumber)) {
          throw new AppError("CONFLICT", "Feasibility number is already in use.", 409);
        }
        const times = stamp(actor);
        const record = withSearch({
          ...input,
          id: `feas_${crypto.randomUUID().slice(0, 8)}`,
          feasibilityNumber,
          conditions: input.conditions ?? [],
          searchIndex: "",
          ...times,
        });
        const reviews = defaultReviews(record.id, times.createdAt);
        set((state) => ({ assessments: [record, ...state.assessments], reviews: [...reviews, ...state.reviews] }));
        writeLocalAudit({
          userId: actor.uid,
          userEmail: actor.email,
          action: "create",
          module: "feasibility",
          recordId: record.id,
          timestamp: times.createdAt,
          oldValue: null,
          newValue: record.feasibilityNumber,
        });
        return record;
      },
      updateAssessment: (id, patch, actor) => {
        const current = get().getAssessment(id);
        if (!current) throw new AppError("NOT_FOUND", "Feasibility not found.", 404);
        const next = withSearch({
          ...current,
          ...patch,
          id: current.id,
          feasibilityNumber: current.feasibilityNumber,
          createdAt: current.createdAt,
          createdBy: current.createdBy,
          updatedAt: nowIso(),
          updatedBy: actor.uid,
        });
        set((state) => ({ assessments: state.assessments.map((item) => (item.id === id ? next : item)) }));
        writeLocalAudit({
          userId: actor.uid,
          userEmail: actor.email,
          action: "update",
          module: "feasibility",
          recordId: id,
          timestamp: next.updatedAt,
          oldValue: current.status,
          newValue: next.status,
        });
        return next;
      },
      changeStatus: (id, status, actor) => {
        const current = get().getAssessment(id);
        if (!current) throw new AppError("NOT_FOUND", "Feasibility not found.", 404);
        validateTransition(current.status, status);
        return get().updateAssessment(id, { status }, actor);
      },
      updateReview: (id, patch, actor) => {
        const current = get().reviews.find((item) => item.id === id);
        if (!current) throw new AppError("NOT_FOUND", "Department review not found.", 404);
        const next: DepartmentReview = { ...current, ...patch, updatedAt: nowIso() };
        set((state) => ({ reviews: state.reviews.map((item) => (item.id === id ? next : item)) }));
        writeLocalAudit({
          userId: actor.uid,
          userEmail: actor.email,
          action: "update",
          module: "feasibility",
          recordId: current.feasibilityId,
          timestamp: next.updatedAt,
          oldValue: current.status,
          newValue: next.status,
        });
        return next;
      },
      addClarification: (input, actor) => {
        const record: FeasibilityClarification = {
          ...input,
          id: `fclar_${crypto.randomUUID().slice(0, 8)}`,
          requestedBy: actor.uid,
          requestedByName: actor.displayName,
          requestedAt: nowIso(),
          status: "OPEN",
        };
        set((state) => ({ clarifications: [record, ...state.clarifications] }));
        writeLocalAudit({
          userId: actor.uid,
          userEmail: actor.email,
          action: "update",
          module: "feasibility",
          recordId: record.feasibilityId,
          timestamp: record.requestedAt,
          oldValue: null,
          newValue: record.question,
        });
        return record;
      },
      updateClarification: (id, patch, actor) => {
        const current = get().clarifications.find((item) => item.id === id);
        if (!current) throw new AppError("NOT_FOUND", "Clarification not found.", 404);
        const next = { ...current, ...patch };
        set((state) => ({ clarifications: state.clarifications.map((item) => (item.id === id ? next : item)) }));
        writeLocalAudit({
          userId: actor.uid,
          userEmail: actor.email,
          action: "update",
          module: "feasibility",
          recordId: current.feasibilityId,
          timestamp: nowIso(),
          oldValue: current.status,
          newValue: next.status,
        });
        return next;
      },
      upsertEvaluation: (feasibilityId, evaluation) => {
        set((state) => ({
          evaluations: [evaluation, ...state.evaluations.filter((item) => item.feasibilityId !== feasibilityId)],
        }));
      },
      addDocument: (input, actor) => {
        const record: FeasibilityDocument = {
          ...input,
          id: `fdoc_${crypto.randomUUID().slice(0, 8)}`,
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
          recordId: record.feasibilityId,
          timestamp: record.uploadedAt,
          oldValue: null,
          newValue: record.fileName,
        });
        return record;
      },
    }),
    { name: "patri-cmo-crm-feasibility" },
  ),
);
