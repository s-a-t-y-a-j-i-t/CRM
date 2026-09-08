import type { EntityId, IsoDateString, UserId } from "@/types/common";
import type { ModuleId } from "@/types/rbac";

export interface AuditLogEntry {
  id: EntityId;
  userId: UserId;
  userEmail: string;
  action: "create" | "update" | "delete" | "status_change" | "login" | "logout" | "export" | "upload";
  module: ModuleId;
  recordId: EntityId;
  timestamp: IsoDateString;
  oldValue: string | null;
  newValue: string | null;
  ipAddress?: string;
  userAgent?: string;
}

export const AUDIT_IMMUTABLE_MESSAGE =
  "Audit logs are append-only and cannot be modified by application users.";
