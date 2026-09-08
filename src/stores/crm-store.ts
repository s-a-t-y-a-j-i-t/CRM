"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nowIso } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { buildCustomerSearchIndex, nextCustomerCode } from "@/services/crm/customer-code";
import { useAppStore } from "@/services/store";
import type { AuditLogEntry } from "@/types/audit";
import type {
  CrmContact,
  CrmCustomer,
  CrmCustomerActivity,
  CrmCustomerDocument,
  CrmNote,
  CustomerStatus,
} from "@/types/crm";
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

function seedCustomers(): CrmCustomer[] {
  const created = "2026-04-12T09:00:00.000Z";
  const updated = "2026-08-20T11:30:00.000Z";
  const rows: Array<Omit<CrmCustomer, "searchIndex">> = [
    {
      id: "cust_helix",
      customerCode: "CUS-00001",
      companyName: "Helix Therapeutics Private Limited",
      legalName: "Helix Therapeutics Private Limited",
      shortName: "Helix Tx",
      customerType: "MARKETING_COMPANY",
      customerCategory: "STRATEGIC",
      website: "https://helix.example",
      primaryEmail: "olivia.t@example.org",
      primaryPhone: "+91 98200 11004",
      billingAddress: "401, Senapati Bapat Marg, Lower Parel, Mumbai 400013",
      shippingAddress: "Warehouse 12, Bhiwandi Logistics Park, Thane 421302",
      city: "Mumbai",
      state: "Maharashtra",
      country: "India",
      postalCode: "400013",
      gstin: "27AABCH1234M1Z5",
      pan: "AABCH1234M",
      drugLicenseNumber: "MH-20B-88211",
      licenseExpiryDate: "2027-03-31",
      paymentTerms: "NET_45",
      creditLimitMinor: 25_000_000_00,
      currency: "INR",
      assignedSalesPersonId: "usr_sales",
      assignedSalesPersonName: "Rohit Menon",
      status: "ACTIVE",
      customerSince: "2024-06-01",
      notes: "DEMO: Priority marketer. Prefers Alu-Alu packs and 24-month shelf life.",
      isArchived: false,
      isDemoData: true,
      primaryContactName: "Priya Nair",
      primaryContactPhone: "+91 98200 11004",
      primaryContactEmail: "olivia.t@example.org",
      createdAt: created,
      updatedAt: updated,
      createdBy: "usr_admin",
      updatedBy: "usr_admin",
    },
    {
      id: "cust_aurora",
      customerCode: "CUS-00002",
      companyName: "Aurora Lifesciences LLP",
      legalName: "Aurora Lifesciences LLP",
      shortName: "Aurora LS",
      customerType: "PHARMACEUTICAL_COMPANY",
      customerCategory: "DOMESTIC",
      primaryEmail: "ivan.p@example.net",
      primaryPhone: "+91 98860 22110",
      billingAddress: "12, Prestige Tech Park, Outer Ring Road, Bengaluru 560103",
      shippingAddress: "12, Prestige Tech Park, Outer Ring Road, Bengaluru 560103",
      city: "Bengaluru",
      state: "Karnataka",
      country: "India",
      postalCode: "560103",
      gstin: "29AADCA9988B1Z2",
      drugLicenseNumber: "KA-21B-44109",
      paymentTerms: "NET_30",
      creditLimitMinor: 12_000_000_00,
      currency: "INR",
      assignedSalesPersonId: "usr_bd",
      assignedSalesPersonName: "Meera Iyer",
      status: "ACTIVE",
      customerSince: "2025-01-15",
      notes: "DEMO seed customer.",
      isArchived: false,
      isDemoData: true,
      primaryContactName: "Leena Reddy",
      primaryContactPhone: "+91 98860 22110",
      primaryContactEmail: "ivan.p@example.net",
      createdAt: created,
      updatedAt: updated,
      createdBy: "usr_admin",
      updatedBy: "usr_admin",
    },
    {
      id: "cust_nimbus",
      customerCode: "CUS-00003",
      companyName: "Nimbus Pharma Export FZ-LLC",
      legalName: "Nimbus Pharma Export FZ-LLC",
      shortName: "Nimbus Export",
      customerType: "EXPORT_CUSTOMER",
      customerCategory: "EXPORT",
      primaryEmail: "olivia.t@example.org",
      primaryPhone: "+971 50 441 2290",
      billingAddress: "Dubai Science Park, Al Barsha South, Dubai",
      shippingAddress: "Jebel Ali Free Zone, Dubai",
      city: "Dubai",
      state: "Dubai",
      country: "UAE",
      paymentTerms: "LC",
      creditLimitMinor: 8_000_000_00,
      currency: "USD",
      assignedSalesPersonId: "usr_sales",
      assignedSalesPersonName: "Rohit Menon",
      status: "PROSPECT",
      notes: "DEMO: Export enquiry. CTD dossier and COPP required before first batch.",
      isArchived: false,
      isDemoData: true,
      createdAt: created,
      updatedAt: updated,
      createdBy: "usr_admin",
      updatedBy: "usr_admin",
    },
    {
      id: "cust_abc",
      customerCode: "CUS-00004",
      companyName: "ABC Pharma Pvt Ltd",
      legalName: "ABC Pharma Private Limited",
      shortName: "ABC Pharma",
      customerType: "PHARMACEUTICAL_COMPANY",
      customerCategory: "REGULAR",
      website: "https://abcpharma.example",
      primaryEmail: "nathan.k@example.net",
      primaryPhone: "+91 98765 44001",
      billingAddress: "Plot 18, MIDC Industrial Area, Taloja, Navi Mumbai 410208",
      shippingAddress: "Plot 18, MIDC Industrial Area, Taloja, Navi Mumbai 410208",
      city: "Navi Mumbai",
      state: "Maharashtra",
      country: "India",
      postalCode: "410208",
      gstin: "27AABCA4400P1Z6",
      pan: "AABCA4400P",
      drugLicenseNumber: "MH-20B-44001",
      licenseExpiryDate: "2028-01-31",
      paymentTerms: "NET_30",
      creditLimitMinor: 5_000_000_00,
      currency: "INR",
      assignedSalesPersonId: "usr_sales",
      assignedSalesPersonName: "Rohit Menon",
      status: "ACTIVE",
      customerSince: "2025-09-01",
      notes: "DEMO: Development seed customer for Customer & Contact management.",
      isArchived: false,
      isDemoData: true,
      primaryContactName: "Rahul Sharma",
      primaryContactPhone: "+91 98765 44011",
      primaryContactEmail: "hannah.h@example.com",
      createdAt: created,
      updatedAt: updated,
      createdBy: "usr_admin",
      updatedBy: "usr_admin",
    },
  ];
  return rows.map((row) => ({ ...row, searchIndex: buildCustomerSearchIndex(row) }));
}

function seedContacts(): CrmContact[] {
  const created = "2026-04-12T09:00:00.000Z";
  const base = { createdAt: created, updatedAt: created, createdBy: "usr_admin", updatedBy: "usr_admin", status: "ACTIVE" as const };
  return [
    { id: "con_helix_priya", customerId: "cust_helix", firstName: "Priya", lastName: "Nair", fullName: "Priya Nair", designation: "Head of Procurement", department: "Purchase", email: "olivia.t@example.org", phone: "+91 98200 11004", contactType: "PURCHASE", isPrimary: true, ...base },
    { id: "con_helix_vikram", customerId: "cust_helix", firstName: "Vikram", lastName: "Joshi", fullName: "Vikram Joshi", designation: "QA Manager", department: "Quality", email: "frank.g@example.org", phone: "+91 98200 11008", contactType: "QA", isPrimary: false, ...base },
    { id: "con_aurora_leena", customerId: "cust_aurora", firstName: "Leena", lastName: "Reddy", fullName: "Leena Reddy", designation: "Founder", department: "Management", email: "ivan.p@example.net", phone: "+91 98860 22110", contactType: "MANAGEMENT", isPrimary: true, ...base },
    { id: "con_abc_rahul", customerId: "cust_abc", firstName: "Rahul", lastName: "Sharma", fullName: "Rahul Sharma", designation: "Purchase Manager", department: "Purchase", email: "hannah.h@example.com", phone: "+91 98765 44011", whatsapp: "+91 98765 44011", contactType: "PURCHASE", isPrimary: true, notes: "DEMO contact", ...base },
    { id: "con_abc_priya", customerId: "cust_abc", firstName: "Priya", lastName: "Mehta", fullName: "Priya Mehta", designation: "QA Manager", department: "Quality Assurance", email: "nina.v@example.com", phone: "+91 98765 44022", contactType: "QA", isPrimary: false, notes: "DEMO contact", ...base },
  ];
}

interface CrmState {
  customers: CrmCustomer[];
  contacts: CrmContact[];
  notes: CrmNote[];
  activities: CrmCustomerActivity[];
  documents: CrmCustomerDocument[];
  getCustomer: (id: string) => CrmCustomer | undefined;
  createCustomer: (input: Omit<CrmCustomer, "id" | "customerCode" | "searchIndex" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy" | "isArchived" | "primaryContactName" | "primaryContactPhone" | "primaryContactEmail"> & { customerCode?: string }, actor: AuthenticatedUser) => CrmCustomer;
  updateCustomer: (id: string, patch: Partial<CrmCustomer>, actor: AuthenticatedUser) => CrmCustomer;
  updateCustomerStatus: (id: string, status: CustomerStatus, actor: AuthenticatedUser) => CrmCustomer;
  archiveCustomer: (id: string, actor: AuthenticatedUser) => CrmCustomer;
  listContacts: (customerId: string) => CrmContact[];
  getContact: (id: string) => CrmContact | undefined;
  createContact: (input: Omit<CrmContact, "id" | "fullName" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">, actor: AuthenticatedUser) => CrmContact;
  updateContact: (id: string, patch: Partial<CrmContact>, actor: AuthenticatedUser) => CrmContact;
  setPrimaryContact: (id: string, actor: AuthenticatedUser) => CrmContact;
  deactivateContact: (id: string, actor: AuthenticatedUser) => CrmContact;
  addNote: (customerId: string, text: string, actor: AuthenticatedUser) => CrmNote;
  addActivity: (input: Omit<CrmCustomerActivity, "id" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy" | "createdByName">, actor: AuthenticatedUser) => CrmCustomerActivity;
  addDocument: (input: Omit<CrmCustomerDocument, "id" | "uploadedAt">, actor: AuthenticatedUser) => CrmCustomerDocument;
}

function syncPrimary(customerId: string, contacts: CrmContact[], customers: CrmCustomer[]): CrmCustomer[] {
  const primary = contacts.find((item) => item.customerId === customerId && item.isPrimary && item.status === "ACTIVE");
  return customers.map((customer) =>
    customer.id === customerId
      ? {
          ...customer,
          primaryContactName: primary?.fullName,
          primaryContactPhone: primary?.phone,
          primaryContactEmail: primary?.email,
          searchIndex: buildCustomerSearchIndex({ ...customer, primaryContactName: primary?.fullName }),
        }
      : customer,
  );
}

export const useCrmStore = create<CrmState>()(
  persist(
    (set, get) => ({
      customers: seedCustomers(),
      contacts: seedContacts(),
      notes: [],
      activities: [
        {
          id: "cact_abc_created",
          customerId: "cust_abc",
          type: "NOTE",
          subject: "Customer created",
          description: "DEMO seed record for ABC Pharma Pvt Ltd.",
          activityDate: "2025-09-01T10:00:00.000Z",
          status: "COMPLETED",
          createdAt: "2025-09-01T10:00:00.000Z",
          createdBy: "usr_admin",
          createdByName: "Ananya Rao",
          updatedAt: "2025-09-01T10:00:00.000Z",
          updatedBy: "usr_admin",
        },
      ],
      documents: [],
      getCustomer: (id) => get().customers.find((item) => item.id === id),
      createCustomer: (input, actor) => {
        const customerCode = input.customerCode?.trim() || nextCustomerCode(get().customers.map((item) => item.customerCode));
        if (get().customers.some((item) => item.customerCode === customerCode)) {
          throw new AppError("CONFLICT", "Customer code is already in use.", 409);
        }
        const times = stamp(actor);
        const record: CrmCustomer = {
          ...input,
          id: `cust_${crypto.randomUUID().slice(0, 8)}`,
          customerCode,
          isArchived: false,
          searchIndex: buildCustomerSearchIndex({ ...input, customerCode }),
          ...times,
        };
        set((state) => ({ customers: [record, ...state.customers] }));
        writeLocalAudit({
          userId: actor.uid,
          userEmail: actor.email,
          action: "create",
          module: "customers",
          recordId: record.id,
          timestamp: times.createdAt,
          oldValue: null,
          newValue: `${record.companyName} (${record.customerCode})`,
        });
        return record;
      },
      updateCustomer: (id, patch, actor) => {
        const current = get().getCustomer(id);
        if (!current) throw new AppError("NOT_FOUND", "Customer not found.", 404);
        const next: CrmCustomer = {
          ...current,
          ...patch,
          id: current.id,
          customerCode: current.customerCode,
          createdAt: current.createdAt,
          createdBy: current.createdBy,
          updatedAt: nowIso(),
          updatedBy: actor.uid,
        };
        next.searchIndex = buildCustomerSearchIndex(next);
        set((state) => ({ customers: state.customers.map((item) => (item.id === id ? next : item)) }));
        writeLocalAudit({
          userId: actor.uid,
          userEmail: actor.email,
          action: "update",
          module: "customers",
          recordId: id,
          timestamp: next.updatedAt,
          oldValue: current.companyName,
          newValue: next.companyName,
        });
        return next;
      },
      updateCustomerStatus: (id, status, actor) => {
        const current = get().getCustomer(id);
        if (!current) throw new AppError("NOT_FOUND", "Customer not found.", 404);
        const next = get().updateCustomer(id, { status }, actor);
        writeLocalAudit({
          userId: actor.uid,
          userEmail: actor.email,
          action: "status_change",
          module: "customers",
          recordId: id,
          timestamp: nowIso(),
          oldValue: current.status,
          newValue: status,
        });
        get().addActivity(
          {
            customerId: id,
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
      archiveCustomer: (id, actor) => {
        const next = get().updateCustomer(id, { isArchived: true, status: "INACTIVE" }, actor);
        writeLocalAudit({
          userId: actor.uid,
          userEmail: actor.email,
          action: "status_change",
          module: "customers",
          recordId: id,
          timestamp: nowIso(),
          oldValue: "ACTIVE_DIRECTORY",
          newValue: "ARCHIVED",
        });
        return next;
      },
      listContacts: (customerId) => get().contacts.filter((item) => item.customerId === customerId),
      getContact: (id) => get().contacts.find((item) => item.id === id),
      createContact: (input, actor) => {
        const times = stamp(actor);
        const record: CrmContact = {
          ...input,
          id: `con_${crypto.randomUUID().slice(0, 8)}`,
          fullName: `${input.firstName} ${input.lastName}`.trim(),
          ...times,
        };
        set((state) => {
          let contacts = [...state.contacts, record];
          if (record.isPrimary) {
            contacts = contacts.map((item) =>
              item.customerId === record.customerId ? { ...item, isPrimary: item.id === record.id } : item,
            );
          }
          return { contacts, customers: syncPrimary(record.customerId, contacts, state.customers) };
        });
        writeLocalAudit({
          userId: actor.uid,
          userEmail: actor.email,
          action: "create",
          module: "contacts",
          recordId: record.id,
          timestamp: times.createdAt,
          oldValue: null,
          newValue: record.fullName,
        });
        return record;
      },
      updateContact: (id, patch, actor) => {
        const current = get().getContact(id);
        if (!current) throw new AppError("NOT_FOUND", "Contact not found.", 404);
        const next: CrmContact = {
          ...current,
          ...patch,
          id: current.id,
          customerId: current.customerId,
          fullName: `${patch.firstName ?? current.firstName} ${patch.lastName ?? current.lastName}`.trim(),
          createdAt: current.createdAt,
          createdBy: current.createdBy,
          updatedAt: nowIso(),
          updatedBy: actor.uid,
        };
        set((state) => {
          const contacts = state.contacts.map((item) => (item.id === id ? next : item));
          return { contacts, customers: syncPrimary(current.customerId, contacts, state.customers) };
        });
        writeLocalAudit({
          userId: actor.uid,
          userEmail: actor.email,
          action: "update",
          module: "contacts",
          recordId: id,
          timestamp: next.updatedAt,
          oldValue: current.fullName,
          newValue: next.fullName,
        });
        return next;
      },
      setPrimaryContact: (id, actor) => {
        const current = get().getContact(id);
        if (!current) throw new AppError("NOT_FOUND", "Contact not found.", 404);
        const previous = get().contacts.find((item) => item.customerId === current.customerId && item.isPrimary);
        set((state) => {
          const contacts = state.contacts.map((item) =>
            item.customerId === current.customerId ? { ...item, isPrimary: item.id === id, updatedAt: nowIso(), updatedBy: actor.uid } : item,
          );
          return { contacts, customers: syncPrimary(current.customerId, contacts, state.customers) };
        });
        writeLocalAudit({
          userId: actor.uid,
          userEmail: actor.email,
          action: "status_change",
          module: "contacts",
          recordId: id,
          timestamp: nowIso(),
          oldValue: previous?.fullName ?? null,
          newValue: current.fullName,
        });
        return get().getContact(id)!;
      },
      deactivateContact: (id, actor) => {
        const next = get().updateContact(id, { status: "INACTIVE", isPrimary: false }, actor);
        writeLocalAudit({
          userId: actor.uid,
          userEmail: actor.email,
          action: "status_change",
          module: "contacts",
          recordId: id,
          timestamp: nowIso(),
          oldValue: "ACTIVE",
          newValue: "INACTIVE",
        });
        return next;
      },
      addNote: (customerId, text, actor) => {
        const note: CrmNote = {
          id: `note_${crypto.randomUUID().slice(0, 8)}`,
          customerId,
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
          module: "customers",
          recordId: customerId,
          timestamp: note.createdAt,
          oldValue: null,
          newValue: "NOTE_ADDED",
        });
        get().addActivity(
          {
            customerId,
            type: "NOTE",
            subject: "Note added",
            description: text.slice(0, 180),
            activityDate: note.createdAt,
            status: "COMPLETED",
          },
          actor,
        );
        return note;
      },
      addActivity: (input, actor) => {
        const times = stamp(actor);
        const record: CrmCustomerActivity = {
          ...input,
          id: `cact_${crypto.randomUUID().slice(0, 8)}`,
          createdByName: actor.displayName,
          ...times,
        };
        set((state) => ({ activities: [record, ...state.activities] }));
        return record;
      },
      addDocument: (input, actor) => {
        const record: CrmCustomerDocument = {
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
          module: "documents",
          recordId: record.id,
          timestamp: record.uploadedAt,
          oldValue: null,
          newValue: record.name,
        });
        return record;
      },
    }),
    { name: "patri-cmo-crm-customers" },
  ),
);
