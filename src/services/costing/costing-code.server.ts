import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { AppError } from "@/lib/errors";
import { formatCostingNumber } from "@/services/costing/costing-code";

export async function allocateCostingNumber(year = new Date().getFullYear()): Promise<string> {
  const db = getAdminDb();
  if (!db) {
    throw new AppError("FIREBASE_UNCONFIGURED", "Costing number allocation requires Admin SDK.", 500);
  }
  const ref = db.collection(COLLECTIONS.counters).doc(`costingNumber-${year}`);
  return db.runTransaction(async (transaction) => {
    const snap = await transaction.get(ref);
    const next = Number(snap.data()?.seq ?? 0) + 1;
    transaction.set(ref, { seq: next, year, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return formatCostingNumber(year, next);
  });
}
