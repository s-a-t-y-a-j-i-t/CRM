import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { AppError } from "@/lib/errors";
import { formatProductCode } from "@/services/products/product-code";

export async function allocateProductCode(): Promise<string> {
  const db = getAdminDb();
  if (!db) {
    throw new AppError("FIREBASE_UNCONFIGURED", "Product code allocation requires Admin SDK.", 500);
  }
  const ref = db.collection(COLLECTIONS.counters).doc("productCode");
  return db.runTransaction(async (transaction) => {
    const snap = await transaction.get(ref);
    const next = Number(snap.data()?.seq ?? 0) + 1;
    transaction.set(ref, { seq: next, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return formatProductCode(next);
  });
}
