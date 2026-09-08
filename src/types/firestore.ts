import type { Timestamp } from "firebase/firestore";
import type { EntityId, UserId } from "@/types/common";

/** Production Firestore audit fields. Demo seed data may still use ISO strings. */
export interface FirestoreAuditFields {
  id: EntityId;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: UserId;
  updatedBy: UserId;
  status: string;
}

export type TimestampOrIso = Timestamp | string;

export function isFirestoreTimestamp(value: unknown): value is Timestamp {
  return typeof value === "object" && value !== null && "toDate" in value && typeof value.toDate === "function";
}

export function toIso(value: TimestampOrIso | undefined | null): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value.toDate().toISOString();
}
