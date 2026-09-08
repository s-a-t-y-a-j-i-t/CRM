"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nowIso } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { assertCan } from "@/lib/rbac/can";
import { createDemoDatabase, type DemoDatabase } from "@/lib/seed/demo-data";
import { applyPaymentToInvoice } from "@/services/finance";
import type { ListQuery, PaginatedResult } from "@/types/common";
import type { AuditLogEntry } from "@/types/audit";
import type { AuthenticatedUser, ModuleId, PermissionAction } from "@/types/rbac";
import type { Payment } from "@/types/finance";
import type { Complaint, ComplaintEvent } from "@/types/quality";

export type ResourceName = keyof DemoDatabase;

const RESOURCE_MODULE: Record<ResourceName, ModuleId> = {
  users: "users",
  customers: "customers",
  contacts: "contacts",
  leads: "leads",
  enquiries: "enquiries",
  opportunities: "opportunities",
  products: "products",
  productRequirements: "product_requirements",
  feasibility: "feasibility",
  quotations: "quotations",
  purchaseOrders: "purchase_orders",
  manufacturingOrders: "manufacturing",
  batches: "batches",
  dispatches: "dispatch",
  invoices: "invoices",
  payments: "payments",
  complaints: "complaints",
  complaintEvents: "complaints",
  documents: "documents",
  activities: "activities",
  notifications: "notifications",
  auditLogs: "audit_logs",
};

interface AppStore {
  db: DemoDatabase;
  reset: () => void;
  list: <K extends ResourceName>(
    resource: K,
    query: ListQuery,
    user: AuthenticatedUser,
  ) => PaginatedResult<DemoDatabase[K][number]>;
  getById: <K extends ResourceName>(
    resource: K,
    id: string,
    user: AuthenticatedUser,
  ) => DemoDatabase[K][number] | null;
  create: <K extends ResourceName>(
    resource: K,
    payload: Record<string, unknown>,
    user: AuthenticatedUser,
  ) => DemoDatabase[K][number];
  update: <K extends ResourceName>(
    resource: K,
    id: string,
    payload: Record<string, unknown>,
    user: AuthenticatedUser,
  ) => DemoDatabase[K][number];
  archive: <K extends ResourceName>(resource: K, id: string, user: AuthenticatedUser) => void;
}

function matchesSearch(record: object, search?: string): boolean {
  if (!search) return true;
  const needle = search.toLowerCase();
  return Object.values(record).some((value) => String(value).toLowerCase().includes(needle));
}

function matchesFilters(record: Record<string, unknown>, filters?: ListQuery["filters"]): boolean {
  if (!filters) return true;
  return Object.entries(filters).every(([key, expected]) => {
    if (expected === undefined || expected === null || expected === "" || expected === "all") {
      return true;
    }
    return String(record[key]) === String(expected);
  });
}

function sortRecords<T extends object>(items: T[], sortBy?: string, direction: "asc" | "desc" = "desc"): T[] {
  if (!sortBy) return items;
  return [...items].sort((a, b) => {
    const left = String((a as Record<string, unknown>)[sortBy] ?? "");
    const right = String((b as Record<string, unknown>)[sortBy] ?? "");
    return direction === "asc" ? left.localeCompare(right) : right.localeCompare(left);
  });
}

function appendAudit(
  db: DemoDatabase,
  user: AuthenticatedUser,
  action: AuditLogEntry["action"],
  module: ModuleId,
  recordId: string,
  oldValue: string | null,
  newValue: string | null,
): void {
  db.auditLogs.unshift({
    id: `aud_${crypto.randomUUID()}`,
    userId: user.uid,
    userEmail: user.email,
    action,
    module,
    recordId,
    timestamp: nowIso(),
    oldValue,
    newValue,
  });
}

function withLifecycle<T extends object>(
  payload: T,
  user: AuthenticatedUser,
  id: string,
): T & { id: string; createdAt: string; updatedAt: string; createdBy: string; updatedBy: string; status: string } {
  const now = nowIso();
  return {
    ...payload,
    id,
    createdAt: now,
    updatedAt: now,
    createdBy: user.uid,
    updatedBy: user.uid,
    status: "status" in payload && typeof payload.status === "string" ? payload.status : "active",
  };
}

function syncDerived(db: DemoDatabase): void {
  db.invoices = db.invoices.map((invoice) => applyPaymentToInvoice(invoice, db.payments as Payment[]));
  db.activities = db.activities.map((activity) => {
    if (
      activity.dueAt &&
      activity.activityStatus !== "completed" &&
      activity.activityStatus !== "cancelled" &&
      new Date(activity.dueAt).getTime() < Date.now()
    ) {
      return { ...activity, activityStatus: "overdue" };
    }
    return activity;
  });
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      db: createDemoDatabase(),
      reset: () => set({ db: createDemoDatabase() }),
      list: (resource, query, user) => {
        assertCan(user, `${RESOURCE_MODULE[resource]}.view`);
        if (resource === "auditLogs" && !["super_admin", "admin", "management"].includes(user.role)) {
          throw new AppError("FORBIDDEN", "Audit logs are restricted.", 403);
        }
        const page = query.page ?? 1;
        const pageSize = query.pageSize ?? 20;
        const raw = get().db[resource] as object[];
        const filtered = sortRecords(
          raw.filter((item) => matchesSearch(item, query.search) && matchesFilters(item as Record<string, unknown>, query.filters)),
          query.sortBy,
          query.sortDirection,
        );
        const start = (page - 1) * pageSize;
        return {
          items: filtered.slice(start, start + pageSize) as never,
          total: filtered.length,
          page,
          pageSize,
          hasMore: start + pageSize < filtered.length,
        };
      },
      getById: (resource, id, user) => {
        assertCan(user, `${RESOURCE_MODULE[resource]}.view`);
        const record = get().db[resource].find((item) => item.id === id);
        return (record ?? null) as never;
      },
      create: (resource, payload, user) => {
        if (resource === "auditLogs") {
          throw new AppError("FORBIDDEN", "Audit logs cannot be created from the client.", 403);
        }
        assertCan(user, `${RESOURCE_MODULE[resource]}.create`);
        const id = `${resource.slice(0, 3)}_${crypto.randomUUID().slice(0, 8)}`;
        const enriched = { ...payload } as Record<string, unknown>;
        if (resource === "activities" && !enriched.activityNumber) {
          enriched.activityNumber = `ACT-${id.slice(-6).toUpperCase()}`;
        }
        if (resource === "invoices") {
          enriched.paidMinor = 0;
          enriched.outstandingMinor = enriched.totalMinor ?? 0;
          enriched.invoiceStatus = "pending";
        }
        const record = withLifecycle(enriched, user, id);
        set((state) => {
          const db = structuredClone(state.db);
          (db[resource] as unknown[]).unshift(record);
          if (resource === "payments") {
            db.invoices = db.invoices.map((invoice) => applyPaymentToInvoice(invoice, db.payments as Payment[]));
          }
          if (resource === "complaints") {
            const complaint = record as unknown as Complaint;
            const event = withLifecycle(
              {
                complaintId: complaint.id,
                toStatus: complaint.investigationStatus,
                note: "Complaint registered.",
                actorUserId: user.uid,
              },
              user,
              `cme_${crypto.randomUUID().slice(0, 8)}`,
            );
            db.complaintEvents.unshift(event as ComplaintEvent);
          }
          appendAudit(db, user, "create", RESOURCE_MODULE[resource], record.id, null, JSON.stringify(record));
          syncDerived(db);
          return { db };
        });
        return record as never;
      },
      update: (resource, id, payload, user) => {
        if (resource === "auditLogs") {
          throw new AppError("FORBIDDEN", "Audit logs cannot be modified.", 403);
        }
        if (resource === "users" && "role" in payload && user.role !== "super_admin" && user.role !== "admin") {
          throw new AppError("FORBIDDEN", "Roles can only be changed by administrators.", 403);
        }
        assertCan(user, `${RESOURCE_MODULE[resource]}.update`);
        let updated: DemoDatabase[typeof resource][number] | null = null;
        set((state) => {
          const db = structuredClone(state.db);
          const collection = db[resource] as { id: string }[];
          const index = collection.findIndex((item) => item.id === id);
          if (index < 0) {
            throw new AppError("NOT_FOUND", "Record not found.", 404);
          }
          const previous = collection[index];
          const next = {
            ...previous,
            ...payload,
            id,
            updatedAt: nowIso(),
            updatedBy: user.uid,
          };
          collection[index] = next;
          updated = next as never;
          if (resource === "complaints" && previous && "investigationStatus" in previous) {
            const before = previous as Complaint;
            const after = next as Complaint;
            if (before.investigationStatus !== after.investigationStatus) {
              db.complaintEvents.unshift(
                withLifecycle(
                  {
                    complaintId: id,
                    fromStatus: before.investigationStatus,
                    toStatus: after.investigationStatus,
                    note: `Status moved to ${after.investigationStatus}.`,
                    actorUserId: user.uid,
                  },
                  user,
                  `cme_${crypto.randomUUID().slice(0, 8)}`,
                ) as ComplaintEvent,
              );
            }
          }
          appendAudit(
            db,
            user,
            "update",
            RESOURCE_MODULE[resource],
            id,
            JSON.stringify(previous),
            JSON.stringify(next),
          );
          syncDerived(db);
          return { db };
        });
        if (!updated) {
          throw new AppError("NOT_FOUND", "Record not found.", 404);
        }
        return updated as never;
      },
      archive: (resource, id, user) => {
        if (resource === "auditLogs") {
          throw new AppError("FORBIDDEN", "Audit logs cannot be deleted or archived.", 403);
        }
        assertCan(user, `${RESOURCE_MODULE[resource]}.delete`);
        get().update(resource, id, { status: "archived" }, user);
      },
    }),
    {
      name: "patri-cmo-data",
      partialize: (state) => ({ db: state.db }),
    },
  ),
);

export function requiredAction(action: PermissionAction): PermissionAction {
  return action;
}

export function allRecords<K extends ResourceName>(resource: K): DemoDatabase[K] {
  return useAppStore.getState().db[resource];
}
