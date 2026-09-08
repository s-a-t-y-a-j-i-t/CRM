import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { AppError } from "@/lib/errors";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { getAdminDb } from "@/lib/firebase/admin";
import { getClientDb } from "@/lib/firebase/client";
import { AUDIT_IMMUTABLE_MESSAGE } from "@/types/audit";
import type { ModuleId } from "@/types/rbac";

export const AUDIT_ACTIONS = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "APPROVE",
  "REJECT",
  "LOGIN",
  "LOGOUT",
  "EXPORT",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export interface AuditWrite {
  userId: string;
  userName: string;
  action: AuditAction;
  module: ModuleId;
  recordId: string;
  oldValue?: string | null;
  newValue?: string | null;
  metadata?: Record<string, string>;
}

export async function writeAuditLog(entry: AuditWrite): Promise<void> {
  const adminDb = getAdminDb();
  const payload = {
    ...entry,
    oldValue: entry.oldValue ?? null,
    newValue: entry.newValue ?? null,
    timestamp: serverTimestamp(),
  };

  if (adminDb) {
    await adminDb.collection(COLLECTIONS.auditLogs).add(payload);
    return;
  }

  const clientDb = getClientDb();
  if (!clientDb) {
    return;
  }
  await addDoc(collection(clientDb, COLLECTIONS.auditLogs), payload);
}

export function assertAuditImmutable(): never {
  throw new AppError("FORBIDDEN", AUDIT_IMMUTABLE_MESSAGE, 403);
}
