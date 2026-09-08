import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { AppError } from "@/lib/errors";
import { formatEmployeeId } from "@/services/identity/employee-id";

const COUNTER_ID = "employeeId";

export async function allocateEmployeeId(): Promise<string> {
  const db = getAdminDb();
  if (!db) {
    throw new AppError("FIREBASE_UNCONFIGURED", "Employee ID allocation requires Admin SDK.", 500);
  }
  const ref = db.collection(COLLECTIONS.counters).doc(COUNTER_ID);
  return db.runTransaction(async (transaction) => {
    const snap = await transaction.get(ref);
    const current = Number(snap.data()?.seq ?? 0);
    const next = current + 1;
    transaction.set(ref, { seq: next, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return formatEmployeeId(next);
  });
}
