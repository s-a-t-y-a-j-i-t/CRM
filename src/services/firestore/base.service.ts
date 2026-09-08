import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  updateDoc,
  where,
  type DocumentData,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { AppError } from "@/lib/errors";
import { getClientDb } from "@/lib/firebase/client";
import { assertCan } from "@/lib/rbac/can";
import type { ListQuery, PaginatedResult } from "@/types/common";
import type { AuthenticatedUser, ModuleId } from "@/types/rbac";

const DEFAULT_PAGE = 20;

function requireDb() {
  const db = getClientDb();
  if (!db) {
    throw new AppError("FIREBASE_UNCONFIGURED", "Firestore is not configured.", 500);
  }
  return db;
}

export interface MutationContext {
  user: AuthenticatedUser;
  module: ModuleId;
}

export async function createDocument<T extends DocumentData>(
  path: string,
  payload: T,
  context: MutationContext,
): Promise<string> {
  assertCan(context.user, `${context.module}.create`);
  const db = requireDb();
  const ref = await addDoc(collection(db, path), {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: context.user.uid,
    updatedBy: context.user.uid,
    status: payload.status ?? "active",
  });
  return ref.id;
}

export async function getDocumentById<T>(path: string, id: string, context: MutationContext): Promise<T | null> {
  assertCan(context.user, `${context.module}.view`);
  const snapshot = await getDoc(doc(requireDb(), path, id));
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as T;
}

export async function updateDocument<T extends DocumentData>(
  path: string,
  id: string,
  payload: Partial<T>,
  context: MutationContext,
): Promise<void> {
  assertCan(context.user, `${context.module}.update`);
  await updateDoc(doc(requireDb(), path, id), {
    ...payload,
    updatedAt: serverTimestamp(),
    updatedBy: context.user.uid,
  });
}

export async function deleteDocument(path: string, id: string, context: MutationContext): Promise<void> {
  assertCan(context.user, `${context.module}.delete`);
  await deleteDoc(doc(requireDb(), path, id));
}

export async function listDocuments<T>(
  path: string,
  context: MutationContext,
  options: ListQuery & { cursor?: QueryDocumentSnapshot | null; equality?: Record<string, string> } = {},
): Promise<PaginatedResult<T> & { cursor: QueryDocumentSnapshot | null }> {
  assertCan(context.user, `${context.module}.view`);
  const pageSize = options.pageSize ?? DEFAULT_PAGE;
  const constraints: QueryConstraint[] = [];

  if (options.equality) {
    for (const [field, value] of Object.entries(options.equality)) {
      constraints.push(where(field, "==", value));
    }
  }
  constraints.push(orderBy(options.sortBy ?? "updatedAt", options.sortDirection ?? "desc"));
  if (options.cursor) {
    constraints.push(startAfter(options.cursor));
  }
  constraints.push(limit(pageSize + 1));

  const snapshot = await getDocs(query(collection(requireDb(), path), ...constraints));
  const docs = snapshot.docs.slice(0, pageSize);
  const items = docs.map((item) => ({ id: item.id, ...item.data() }) as T);
  const last = docs[docs.length - 1] ?? null;

  return {
    items,
    total: items.length,
    page: options.page ?? 1,
    pageSize,
    hasMore: snapshot.docs.length > pageSize,
    cursor: last,
  };
}
