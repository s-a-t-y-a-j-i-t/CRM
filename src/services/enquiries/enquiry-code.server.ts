import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { AppError } from "@/lib/errors";
import { formatEnquiryNumber } from "@/services/enquiries/enquiry-code";

export async function allocateEnquiryNumber(year = new Date().getFullYear()): Promise<string> {
  const db = getAdminDb();
  if (!db) {
    throw new AppError("FIREBASE_UNCONFIGURED", "Enquiry number allocation requires Admin SDK.", 500);
  }
  const ref = db.collection(COLLECTIONS.counters).doc(`enquiryNumber-${year}`);
  return db.runTransaction(async (transaction) => {
    const snap = await transaction.get(ref);
    const next = Number(snap.data()?.seq ?? 0) + 1;
    transaction.set(ref, { seq: next, year, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return formatEnquiryNumber(year, next);
  });
}
