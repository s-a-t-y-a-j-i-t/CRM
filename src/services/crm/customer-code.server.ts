import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { AppError } from "@/lib/errors";
import { formatCustomerCode } from "@/services/crm/customer-code";

const COUNTER_ID = "customerCode";

export async function allocateCustomerCode(): Promise<string> {
  const db = getAdminDb();
  if (!db) {
    throw new AppError("FIREBASE_UNCONFIGURED", "Customer code allocation requires Admin SDK.", 500);
  }
  const ref = db.collection(COLLECTIONS.counters).doc(COUNTER_ID);
  return db.runTransaction(async (transaction) => {
    const snap = await transaction.get(ref);
    const current = Number(snap.data()?.seq ?? 0);
    const next = current + 1;
    transaction.set(ref, { seq: next, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return formatCustomerCode(next);
  });
}
