import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { AppError } from "@/lib/errors";
import { formatLeadCode } from "@/services/leads/lead-code";

export async function allocateLeadCode(): Promise<string> {
  const db = getAdminDb();
  if (!db) {
    throw new AppError("FIREBASE_UNCONFIGURED", "Lead code allocation requires Admin SDK.", 500);
  }
  const ref = db.collection(COLLECTIONS.counters).doc("leadCode");
  return db.runTransaction(async (transaction) => {
    const snap = await transaction.get(ref);
    const next = Number(snap.data()?.seq ?? 0) + 1;
    transaction.set(ref, { seq: next, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return formatLeadCode(next);
  });
}
