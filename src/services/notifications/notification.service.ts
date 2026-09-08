import { addDoc, collection, doc, getDocs, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { AppError } from "@/lib/errors";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { getClientDb } from "@/lib/firebase/client";
import type { AuthenticatedUser } from "@/types/rbac";

export interface NotificationRecord {
  id: string;
  type: string;
  title: string;
  message: string;
  recipientId: string;
  relatedModule?: string;
  relatedRecordId?: string;
  isRead: boolean;
  createdAt: string;
}

function requireDb() {
  const db = getClientDb();
  if (!db) {
    throw new AppError("FIREBASE_UNCONFIGURED", "Firestore is not configured.", 500);
  }
  return db;
}

export async function createNotification(
  input: Omit<NotificationRecord, "id" | "isRead" | "createdAt">,
): Promise<string> {
  const ref = await addDoc(collection(requireDb(), COLLECTIONS.notifications), {
    ...input,
    isRead: false,
    createdAt: serverTimestamp(),
    status: "active",
  });
  return ref.id;
}

export async function markAsRead(id: string, user: AuthenticatedUser): Promise<void> {
  await updateDoc(doc(requireDb(), COLLECTIONS.notifications, id), {
    isRead: true,
    updatedBy: user.uid,
    updatedAt: serverTimestamp(),
  });
}

export async function markAllAsRead(user: AuthenticatedUser): Promise<void> {
  const snapshot = await getDocs(
    query(collection(requireDb(), COLLECTIONS.notifications), where("recipientId", "==", user.uid)),
  );
  await Promise.all(snapshot.docs.map((item) => markAsRead(item.id, user)));
}

export async function getUserNotifications(user: AuthenticatedUser): Promise<NotificationRecord[]> {
  const snapshot = await getDocs(
    query(collection(requireDb(), COLLECTIONS.notifications), where("recipientId", "==", user.uid)),
  );
  return snapshot.docs.map((item) => {
    const data = item.data();
    return {
      id: item.id,
      type: String(data.type ?? ""),
      title: String(data.title ?? ""),
      message: String(data.message ?? data.body ?? ""),
      recipientId: String(data.recipientId ?? user.uid),
      relatedModule: data.relatedModule ? String(data.relatedModule) : undefined,
      relatedRecordId: data.relatedRecordId ? String(data.relatedRecordId) : undefined,
      isRead: Boolean(data.isRead),
      createdAt: String(data.createdAt ?? ""),
    };
  });
}
