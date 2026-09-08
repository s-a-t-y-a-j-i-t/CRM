"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nowIso } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { useAppStore } from "@/services/store";
import { buildLeadSearchIndex, nextLeadCode, scoreLead } from "@/services/leads/lead-code";
import { reactivateTarget, validateTransition } from "@/services/leads/lead-workflow.service";
import type { AuditLogEntry } from "@/types/audit";
import type {
  CrmLead,
  LeadActivity,
  LeadDocument,
  LeadFollowUp,
  LeadNote,
  LeadStatus,
  LostReason,
} from "@/types/leads";
import type { AuthenticatedUser } from "@/types/rbac";

export interface LeadEnquiryStub {
  id: string;
  enquiryCode: string;
  leadId: string;
  customerId: string;
  contactId?: string;
  status: "DRAFT";
  createdAt: string;
  createdBy: string;
}

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

function withSearch(lead: Omit<CrmLead, "searchIndex" | "score"> & { score?: number }): CrmLead {
  return {
    ...lead,
    score: lead.score ?? scoreLead(lead),
    searchIndex: buildLeadSearchIndex(lead),
  };
}

function seedLeads(): CrmLead[] {
  const rows: Array<Omit<CrmLead, "searchIndex" | "score">> = [
    {
      id: "lead_helix",
      leadCode: "LEAD-00001",
      companyName: "Helix Therapeutics Private Limited",
      contactName: "Priya Nair",
      contactDesignation: "Head of Procurement",
      email: "olivia.t@example.org",
      phone: "+91 98200 11004",
      website: "https://helix.example",
      customerId: "cust_helix",
      contactId: "con_helix_priya",
      leadSource: "EXISTING_CUSTOMER",
      leadType: "EXISTING_CUSTOMER",
      productInterest: "Telmisartan 40 mg",
      dosageForm: "tablet",
      strength: "40 mg",
      composition: "Telmisartan IP 40 mg",
      requiredQuantity: 2_500_000,
      annualQuantity: 10_000_000,
      targetPriceMinor: 185_00,
      country: "India",
      state: "Maharashtra",
      expectedBusinessValueMinor: 18_500_000_00,
      expectedClosingDate: "2026-06-30",
      priority: "HIGH",
      assignedTo: "usr_sales",
      assignedToName: "Rohit Menon",
      assignedAt: "2026-04-12T09:10:00.000Z",
      status: "WON",
      convertedCustomerId: "cust_helix",
      convertedEnquiryId: "enq_hel_telmi",
      convertedAt: "2026-05-18T11:00:00.000Z",
      description: "Repeat CMO programme for Helix-Teli.",
      isDemoData: true,
      createdAt: "2026-04-12T09:00:00.000Z",
      updatedAt: "2026-05-18T11:00:00.000Z",
      createdBy: "usr_admin",
      updatedBy: "usr_sales",
    },
    {
      id: "lead_nimbus",
      leadCode: "LEAD-00002",
      companyName: "Nimbus Pharma Export FZ-LLC",
      contactName: "Omar Haddad",
      contactDesignation: "Procurement Lead",
      email: "olivia.t@example.org",
      phone: "+971 50 441 2290",
      customerId: "cust_nimbus",
      leadSource: "EXHIBITION",
      leadType: "EXPORT",
      productInterest: "Azithromycin 500 mg",
      dosageForm: "tablet",
      strength: "500 mg",
      requiredQuantity: 1_000_000,
      country: "UAE",
      state: "Dubai",
      market: "GCC",
      expectedBusinessValueMinor: 6_200_000_00,
      expectedClosingDate: "2026-10-15",
      priority: "HIGH",
      assignedTo: "usr_sales",
      assignedToName: "Rohit Menon",
      assignedAt: "2026-07-02T08:00:00.000Z",
      status: "QUALIFIED",
      nextFollowUpDate: "2026-09-08",
      description: "Export pack, CTD dossier required.",
      isDemoData: true,
      createdAt: "2026-07-02T08:00:00.000Z",
      updatedAt: "2026-08-20T11:30:00.000Z",
      createdBy: "usr_sales",
      updatedBy: "usr_sales",
    },
    {
      id: "lead_vertex",
      leadCode: "LEAD-00003",
      companyName: "Vertex Nutraceuticals",
      contactName: "Anita Kulkarni",
      email: "frank.g@example.org",
      phone: "+91 98111 22008",
      leadSource: "WEBSITE",
      leadType: "NEW_BUSINESS",
      productInterest: "Vitamin D3 60k IU",
      dosageForm: "capsule",
      strength: "60,000 IU",
      requiredQuantity: 500_000,
      country: "India",
      state: "Gujarat",
      expectedBusinessValueMinor: 1_800_000_00,
      expectedClosingDate: "2026-11-30",
      priority: "MEDIUM",
      assignedTo: "usr_bd",
      assignedToName: "Meera Iyer",
      assignedAt: "2026-08-01T10:00:00.000Z",
      status: "REQUIREMENT_PENDING",
      nextFollowUpDate: "2026-09-06",
      isDemoData: true,
      createdAt: "2026-08-01T10:00:00.000Z",
      updatedAt: "2026-08-22T09:15:00.000Z",
      createdBy: "usr_bd",
      updatedBy: "usr_bd",
    },
    {
      id: "lead_abc",
      leadCode: "LEAD-00004",
      companyName: "ABC Pharma Pvt Ltd",
      contactName: "Rahul Sharma",
      contactDesignation: "Purchase Manager",
      email: "hannah.h@example.com",
      phone: "+91 98765 44011",
      customerId: "cust_abc",
      contactId: "con_abc_rahul",
      leadSource: "EXISTING_CUSTOMER",
      leadType: "EXISTING_CUSTOMER",
      productInterest: "Pantoprazole 40 mg",
      dosageForm: "tablet",
      strength: "40 mg",
      country: "India",
      state: "Maharashtra",
      expectedBusinessValueMinor: 3_400_000_00,
      expectedClosingDate: "2026-12-15",
      priority: "HIGH",
      assignedTo: "usr_sales",
      assignedToName: "Rohit Menon",
      assignedAt: "2026-08-10T09:00:00.000Z",
      status: "CONTACTED",
      nextFollowUpDate: "2026-09-05",
      isDemoData: true,
      createdAt: "2026-08-10T09:00:00.000Z",
      updatedAt: "2026-08-28T16:00:00.000Z",
      createdBy: "usr_sales",
      updatedBy: "usr_sales",
    },
    {
      id: "lead_inbound",
      leadCode: "LEAD-00005",
      companyName: "Lotus Care Formulations",
      contactName: "Sneha Patil",
      email: "paula.r@example.org",
      phone: "+91 97650 11880",
      leadSource: "WEBSITE",
      leadType: "NEW_BUSINESS",
      productInterest: "Cefixime 200 mg",
      dosageForm: "tablet",
      country: "India",
      state: "Maharashtra",
      expectedBusinessValueMinor: 2_100_000_00,
      priority: "MEDIUM",
      assignedTo: "usr_bd",
      assignedToName: "Meera Iyer",
      assignedAt: "2026-09-01T07:30:00.000Z",
      status: "NEW",
      nextFollowUpDate: "2026-09-07",
      isDemoData: true,
      createdAt: "2026-09-01T07:30:00.000Z",
      updatedAt: "2026-09-01T07:30:00.000Z",
      createdBy: "usr_bd",
      updatedBy: "usr_bd",
    },
    {
      id: "lead_proposal",
      leadCode: "LEAD-00006",
      companyName: "Northwind Healthcare",
      contactName: "Imran Qureshi",
      email: "xavier.y@example.org",
      phone: "+91 99001 33440",
      leadSource: "REFERRAL",
      leadType: "REFERRAL",
      productInterest: "Metformin 500 mg SR",
      dosageForm: "tablet",
      strength: "500 mg",
      country: "India",
      state: "Delhi",
      expectedBusinessValueMinor: 4_800_000_00,
      expectedClosingDate: "2026-10-31",
      priority: "URGENT",
      assignedTo: "usr_sales",
      assignedToName: "Rohit Menon",
      assignedAt: "2026-06-18T11:00:00.000Z",
      status: "PROPOSAL",
      nextFollowUpDate: "2026-09-04",
      isDemoData: true,
      createdAt: "2026-06-18T11:00:00.000Z",
      updatedAt: "2026-08-30T12:00:00.000Z",
      createdBy: "usr_sales",
      updatedBy: "usr_sales",
    },
    {
      id: "lead_nego",
      leadCode: "LEAD-00007",
      companyName: "Sahyadri Medicos",
      contactName: "Deepa Nair",
      email: "hannah.h@example.com",
      phone: "+91 98450 22119",
      leadSource: "SALES_VISIT",
      leadType: "DISTRIBUTOR",
      productInterest: "Amoxicillin + Clavulanate 625 mg",
      dosageForm: "tablet",
      country: "India",
      state: "Kerala",
      expectedBusinessValueMinor: 7_500_000_00,
      expectedClosingDate: "2026-09-30",
      priority: "HIGH",
      assignedTo: "usr_sales",
      assignedToName: "Rohit Menon",
      assignedAt: "2026-05-20T10:00:00.000Z",
      status: "NEGOTIATION",
      nextFollowUpDate: "2026-09-03",
      isDemoData: true,
      createdAt: "2026-05-20T10:00:00.000Z",
      updatedAt: "2026-08-29T15:20:00.000Z",
      createdBy: "usr_sales",
      updatedBy: "usr_sales",
    },
    {
      id: "lead_lost",
      leadCode: "LEAD-00008",
      companyName: "Pinnacle Generics",
      contactName: "Harish Rao",
      email: "samuel.w@example.com",
      phone: "+91 97000 11821",
      leadSource: "PHONE",
      leadType: "NEW_BUSINESS",
      productInterest: "Atorvastatin 20 mg",
      dosageForm: "tablet",
      country: "India",
      state: "Telangana",
      expectedBusinessValueMinor: 2_400_000_00,
      priority: "LOW",
      assignedTo: "usr_bd",
      assignedToName: "Meera Iyer",
      assignedAt: "2026-03-04T09:00:00.000Z",
      status: "LOST",
      previousStatus: "QUALIFIED",
      lostReason: "CUSTOMER_SELECTED_COMPETITOR",
      lostNotes: "Moved to another CMO on price.",
      lostAt: "2026-07-12T14:00:00.000Z",
      lostBy: "usr_bd",
      isDemoData: true,
      createdAt: "2026-03-04T09:00:00.000Z",
      updatedAt: "2026-07-12T14:00:00.000Z",
      createdBy: "usr_bd",
      updatedBy: "usr_bd",
    },
    {
      id: "lead_hold",
      leadCode: "LEAD-00009",
      companyName: "Orion Wellness Ltd",
      contactName: "Kiran Shetty",
      email: "iris.p@example.org",
      phone: "+91 96111 44002",
      leadSource: "EMAIL",
      leadType: "INSTITUTIONAL",
      productInterest: "Paracetamol 650 mg",
      dosageForm: "tablet",
      country: "India",
      state: "Karnataka",
      expectedBusinessValueMinor: 1_200_000_00,
      priority: "MEDIUM",
      assignedTo: "usr_bd",
      assignedToName: "Meera Iyer",
      assignedAt: "2026-06-01T10:00:00.000Z",
      status: "ON_HOLD",
      previousStatus: "QUALIFIED",
      nextFollowUpDate: "2026-09-20",
      notes: "Budget freeze until Q3 close.",
      isDemoData: true,
      createdAt: "2026-06-01T10:00:00.000Z",
      updatedAt: "2026-08-05T09:00:00.000Z",
      createdBy: "usr_bd",
      updatedBy: "usr_bd",
    },
    {
      id: "lead_enquiry",
      leadCode: "LEAD-00010",
      companyName: "Blue Harbor Pharma",
      contactName: "Farah Khan",
      email: "alice.j@example.com",
      phone: "+91 93222 11890",
      leadSource: "SOCIAL_MEDIA",
      leadType: "NEW_BUSINESS",
      productInterest: "Levocetirizine 5 mg",
      dosageForm: "tablet",
      country: "India",
      state: "Maharashtra",
      expectedBusinessValueMinor: 2_900_000_00,
      expectedClosingDate: "2026-11-15",
      priority: "MEDIUM",
      assignedTo: "usr_sales",
      assignedToName: "Rohit Menon",
      assignedAt: "2026-07-21T08:40:00.000Z",
      status: "ENQUIRY_CREATED",
      convertedEnquiryId: "enq_stub_blue",
      nextFollowUpDate: "2026-09-10",
      isDemoData: true,
      createdAt: "2026-07-21T08:40:00.000Z",
      updatedAt: "2026-08-18T13:10:00.000Z",
      createdBy: "usr_sales",
      updatedBy: "usr_sales",
    },
  ];
  return rows.map((row) => withSearch(row));
}

function seedFollowUps(): LeadFollowUp[] {
  return [
    {
      id: "lfu_today",
      leadId: "lead_proposal",
      followUpAt: "2026-09-05T11:00:00.000Z",
      assignedTo: "usr_sales",
      assignedToName: "Rohit Menon",
      purpose: "Share draft commercial terms",
      priority: "URGENT",
      status: "PENDING",
      createdAt: "2026-09-01T10:00:00.000Z",
      createdBy: "usr_sales",
      updatedAt: "2026-09-01T10:00:00.000Z",
      updatedBy: "usr_sales",
    },
    {
      id: "lfu_overdue",
      leadId: "lead_nego",
      followUpAt: "2026-09-03T10:00:00.000Z",
      assignedTo: "usr_sales",
      assignedToName: "Rohit Menon",
      purpose: "Close packing and payment terms",
      priority: "HIGH",
      status: "PENDING",
      createdAt: "2026-08-28T10:00:00.000Z",
      createdBy: "usr_sales",
      updatedAt: "2026-08-28T10:00:00.000Z",
      updatedBy: "usr_sales",
    },
    {
      id: "lfu_upcoming",
      leadId: "lead_nimbus",
      followUpAt: "2026-09-08T15:00:00.000Z",
      assignedTo: "usr_sales",
      assignedToName: "Rohit Menon",
      purpose: "Dossier checklist call",
      priority: "HIGH",
      status: "PENDING",
      createdAt: "2026-08-20T11:30:00.000Z",
      createdBy: "usr_sales",
      updatedAt: "2026-08-20T11:30:00.000Z",
      updatedBy: "usr_sales",
    },
  ];
}

function seedActivities(): LeadActivity[] {
  return [
    {
      id: "lact_helix",
      leadId: "lead_helix",
      customerId: "cust_helix",
      contactId: "con_helix_priya",
      type: "MEETING",
      subject: "Commercial close for Telmisartan 40 mg",
      description: "Helix confirmed annual volume and artwork freeze.",
      activityDate: "2026-05-16T10:00:00.000Z",
      status: "COMPLETED",
      createdAt: "2026-05-16T10:00:00.000Z",
      createdBy: "usr_sales",
      createdByName: "Rohit Menon",
      updatedAt: "2026-05-16T10:00:00.000Z",
      updatedBy: "usr_sales",
    },
    {
      id: "lact_vertex",
      leadId: "lead_vertex",
      type: "CALL",
      subject: "Requirement collection started",
      description: "Waiting for composition and pack style.",
      activityDate: "2026-08-22T09:15:00.000Z",
      nextFollowUpDate: "2026-09-06",
      status: "OPEN",
      createdAt: "2026-08-22T09:15:00.000Z",
      createdBy: "usr_bd",
      createdByName: "Meera Iyer",
      updatedAt: "2026-08-22T09:15:00.000Z",
      updatedBy: "usr_bd",
    },
  ];
}

interface LeadState {
  leads: CrmLead[];
  activities: LeadActivity[];
  followUps: LeadFollowUp[];
  notes: LeadNote[];
  documents: LeadDocument[];
  enquiryStubs: LeadEnquiryStub[];
  getLead: (id: string) => CrmLead | undefined;
  createLead: (input: Omit<CrmLead, "id" | "leadCode" | "searchIndex" | "score" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy"> & { leadCode?: string }, actor: AuthenticatedUser) => CrmLead;
  updateLead: (id: string, patch: Partial<CrmLead>, actor: AuthenticatedUser) => CrmLead;
  assignLead: (id: string, assignedTo: string, assignedToName: string, actor: AuthenticatedUser) => CrmLead;
  changeStatus: (id: string, status: LeadStatus, actor: AuthenticatedUser, extras?: { lostReason?: LostReason; lostNotes?: string }) => CrmLead;
  markLost: (id: string, reason: LostReason, notes: string | undefined, actor: AuthenticatedUser) => CrmLead;
  reactivate: (id: string, actor: AuthenticatedUser) => CrmLead;
  convertLead: (id: string, customerId: string, enquiryId: string | undefined, actor: AuthenticatedUser) => CrmLead;
  addEnquiryStub: (stub: LeadEnquiryStub) => void;
  addActivity: (input: Omit<LeadActivity, "id" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy" | "createdByName">, actor: AuthenticatedUser) => LeadActivity;
  addFollowUp: (input: Omit<LeadFollowUp, "id" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">, actor: AuthenticatedUser) => LeadFollowUp;
  updateFollowUp: (id: string, patch: Partial<LeadFollowUp>, actor: AuthenticatedUser) => LeadFollowUp;
  addNote: (leadId: string, text: string, actor: AuthenticatedUser) => LeadNote;
  addDocument: (input: Omit<LeadDocument, "id" | "uploadedAt">, actor: AuthenticatedUser) => LeadDocument;
}

export const useLeadStore = create<LeadState>()(
  persist(
    (set, get) => ({
      leads: seedLeads(),
      activities: seedActivities(),
      followUps: seedFollowUps(),
      notes: [
        {
          id: "lnote_vertex",
          leadId: "lead_vertex",
          text: "Customer requested 100,000 capsules per month after first commercial batch.",
          createdAt: "2026-08-22T09:20:00.000Z",
          createdBy: "usr_bd",
          createdByName: "Meera Iyer",
        },
      ],
      documents: [],
      enquiryStubs: [
        {
          id: "enq_stub_blue",
          enquiryCode: "ENQ-00001",
          leadId: "lead_enquiry",
          customerId: "",
          status: "DRAFT",
          createdAt: "2026-08-18T13:10:00.000Z",
          createdBy: "usr_sales",
        },
      ],
      getLead: (id) => get().leads.find((item) => item.id === id),
      createLead: (input, actor) => {
        const leadCode = input.leadCode?.trim() || nextLeadCode(get().leads.map((item) => item.leadCode));
        if (get().leads.some((item) => item.leadCode === leadCode)) {
          throw new AppError("CONFLICT", "Lead code is already in use.", 409);
        }
        const times = stamp(actor);
        const record = withSearch({
          ...input,
          id: `lead_${crypto.randomUUID().slice(0, 8)}`,
          leadCode,
          assignedAt: input.assignedAt ?? times.createdAt,
          ...times,
        });
        set((state) => ({ leads: [record, ...state.leads] }));
        writeLocalAudit({
          userId: actor.uid,
          userEmail: actor.email,
          action: "create",
          module: "leads",
          recordId: record.id,
          timestamp: times.createdAt,
          oldValue: null,
          newValue: `${record.companyName} (${record.leadCode})`,
        });
        get().addActivity(
          {
            leadId: record.id,
            customerId: record.customerId,
            contactId: record.contactId,
            type: "NOTE",
            subject: "Lead created",
            description: `${record.leadCode} opened as ${record.status}`,
            activityDate: times.createdAt,
            status: "COMPLETED",
          },
          actor,
        );
        return record;
      },
      updateLead: (id, patch, actor) => {
        const current = get().getLead(id);
        if (!current) throw new AppError("NOT_FOUND", "Lead not found.", 404);
        const next = withSearch({
          ...current,
          ...patch,
          id: current.id,
          leadCode: current.leadCode,
          createdAt: current.createdAt,
          createdBy: current.createdBy,
          updatedAt: nowIso(),
          updatedBy: actor.uid,
        });
        set((state) => ({ leads: state.leads.map((item) => (item.id === id ? next : item)) }));
        writeLocalAudit({
          userId: actor.uid,
          userEmail: actor.email,
          action: "update",
          module: "leads",
          recordId: id,
          timestamp: next.updatedAt,
          oldValue: current.companyName,
          newValue: next.companyName,
        });
        return next;
      },
      assignLead: (id, assignedTo, assignedToName, actor) => {
        const current = get().getLead(id);
        if (!current) throw new AppError("NOT_FOUND", "Lead not found.", 404);
        const next = get().updateLead(id, { assignedTo, assignedToName, assignedAt: nowIso() }, actor);
        writeLocalAudit({
          userId: actor.uid,
          userEmail: actor.email,
          action: "update",
          module: "leads",
          recordId: id,
          timestamp: nowIso(),
          oldValue: current.assignedToName,
          newValue: assignedToName,
        });
        get().addActivity(
          {
            leadId: id,
            type: "NOTE",
            subject: current.assignedTo === assignedTo ? "Lead assigned" : "Lead reassigned",
            description: `${current.assignedToName} → ${assignedToName}`,
            activityDate: nowIso(),
            status: "COMPLETED",
          },
          actor,
        );
        return next;
      },
      changeStatus: (id, status, actor, extras) => {
        const current = get().getLead(id);
        if (!current) throw new AppError("NOT_FOUND", "Lead not found.", 404);
        validateTransition(current.status, status);
        if (status === "LOST" && !extras?.lostReason) {
          throw new AppError("VALIDATION", "A lost reason is required.", 400);
        }
        const patch: Partial<CrmLead> = {
          status,
          previousStatus: status === "ON_HOLD" || status === "LOST" ? current.status : current.previousStatus,
        };
        if (status === "LOST") {
          patch.lostReason = extras?.lostReason;
          patch.lostNotes = extras?.lostNotes;
          patch.lostAt = nowIso();
          patch.lostBy = actor.uid;
        }
        const next = get().updateLead(id, patch, actor);
        writeLocalAudit({
          userId: actor.uid,
          userEmail: actor.email,
          action: "status_change",
          module: "leads",
          recordId: id,
          timestamp: nowIso(),
          oldValue: current.status,
          newValue: status,
        });
        get().addActivity(
          {
            leadId: id,
            type: "NOTE",
            subject: status === "LOST" ? "Lead marked lost" : "Status changed",
            description: `${current.status} → ${status}`,
            activityDate: nowIso(),
            status: "COMPLETED",
          },
          actor,
        );
        return next;
      },
      markLost: (id, reason, notes, actor) => get().changeStatus(id, "LOST", actor, { lostReason: reason, lostNotes: notes }),
      reactivate: (id, actor) => {
        const current = get().getLead(id);
        if (!current) throw new AppError("NOT_FOUND", "Lead not found.", 404);
        const target = reactivateTarget(current);
        const next = get().changeStatus(id, target, actor);
        get().addActivity(
          {
            leadId: id,
            type: "NOTE",
            subject: "Lead reactivated",
            description: `${current.status} → ${target}. Previous history retained.`,
            activityDate: nowIso(),
            status: "COMPLETED",
          },
          actor,
        );
        return next;
      },
      convertLead: (id, customerId, enquiryId, actor) => {
        const current = get().getLead(id);
        if (!current) throw new AppError("NOT_FOUND", "Lead not found.", 404);
        if (current.convertedEnquiryId) {
          throw new AppError("CONFLICT", "This lead has already been converted.", 409);
        }
        const next = get().updateLead(
          id,
          {
            status: enquiryId ? "ENQUIRY_CREATED" : current.status,
            customerId,
            convertedCustomerId: customerId,
            convertedEnquiryId: enquiryId,
            convertedAt: nowIso(),
          },
          actor,
        );
        writeLocalAudit({
          userId: actor.uid,
          userEmail: actor.email,
          action: "status_change",
          module: "leads",
          recordId: id,
          timestamp: nowIso(),
          oldValue: current.status,
          newValue: "LEAD_CONVERTED",
        });
        get().addActivity(
          {
            leadId: id,
            customerId,
            type: "NOTE",
            subject: "Lead converted",
            description: enquiryId ? `Customer ${customerId} · enquiry ${enquiryId}` : `Customer ${customerId}`,
            activityDate: nowIso(),
            status: "COMPLETED",
          },
          actor,
        );
        return next;
      },
      addEnquiryStub: (stub) => set((state) => ({ enquiryStubs: [stub, ...state.enquiryStubs] })),
      addActivity: (input, actor) => {
        const times = stamp(actor);
        const record: LeadActivity = {
          ...input,
          id: `lact_${crypto.randomUUID().slice(0, 8)}`,
          createdByName: actor.displayName,
          ...times,
        };
        set((state) => ({ activities: [record, ...state.activities] }));
        writeLocalAudit({
          userId: actor.uid,
          userEmail: actor.email,
          action: "create",
          module: "activities",
          recordId: record.id,
          timestamp: times.createdAt,
          oldValue: null,
          newValue: record.subject,
        });
        return record;
      },
      addFollowUp: (input, actor) => {
        const times = stamp(actor);
        const record: LeadFollowUp = { ...input, id: `lfu_${crypto.randomUUID().slice(0, 8)}`, ...times };
        set((state) => ({ followUps: [record, ...state.followUps] }));
        writeLocalAudit({
          userId: actor.uid,
          userEmail: actor.email,
          action: "create",
          module: "activities",
          recordId: record.id,
          timestamp: times.createdAt,
          oldValue: null,
          newValue: `FOLLOW_UP:${record.purpose}`,
        });
        get().addActivity(
          {
            leadId: record.leadId,
            type: "FOLLOW_UP",
            subject: "Follow-up scheduled",
            description: record.purpose,
            assignedTo: record.assignedTo,
            activityDate: record.followUpAt,
            nextFollowUpDate: record.followUpAt.slice(0, 10),
            status: "OPEN",
          },
          actor,
        );
        const lead = get().getLead(record.leadId);
        if (lead) {
          get().updateLead(record.leadId, { nextFollowUpDate: record.followUpAt.slice(0, 10) }, actor);
        }
        return record;
      },
      updateFollowUp: (id, patch, actor) => {
        const current = get().followUps.find((item) => item.id === id);
        if (!current) throw new AppError("NOT_FOUND", "Follow-up not found.", 404);
        const next: LeadFollowUp = { ...current, ...patch, id: current.id, updatedAt: nowIso(), updatedBy: actor.uid };
        set((state) => ({ followUps: state.followUps.map((item) => (item.id === id ? next : item)) }));
        if (next.status === "COMPLETED") {
          writeLocalAudit({
            userId: actor.uid,
            userEmail: actor.email,
            action: "update",
            module: "activities",
            recordId: id,
            timestamp: next.updatedAt,
            oldValue: current.status,
            newValue: "COMPLETED",
          });
          get().addActivity(
            {
              leadId: current.leadId,
              type: "FOLLOW_UP",
              subject: "Follow-up completed",
              description: current.purpose,
              activityDate: nowIso(),
              status: "COMPLETED",
            },
            actor,
          );
        }
        return next;
      },
      addNote: (leadId, text, actor) => {
        const note: LeadNote = {
          id: `lnote_${crypto.randomUUID().slice(0, 8)}`,
          leadId,
          text,
          createdAt: nowIso(),
          createdBy: actor.uid,
          createdByName: actor.displayName,
        };
        set((state) => ({ notes: [note, ...state.notes] }));
        writeLocalAudit({
          userId: actor.uid,
          userEmail: actor.email,
          action: "create",
          module: "leads",
          recordId: leadId,
          timestamp: note.createdAt,
          oldValue: null,
          newValue: "NOTE_ADDED",
        });
        get().addActivity(
          {
            leadId,
            type: "NOTE",
            subject: "Internal note added",
            description: text.slice(0, 180),
            activityDate: note.createdAt,
            status: "COMPLETED",
          },
          actor,
        );
        return note;
      },
      addDocument: (input, actor) => {
        const record: LeadDocument = {
          ...input,
          id: `ldoc_${crypto.randomUUID().slice(0, 8)}`,
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
          newValue: record.name,
        });
        return record;
      },
    }),
    { name: "patri-cmo-crm-leads" },
  ),
);
