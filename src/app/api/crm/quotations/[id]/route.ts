import { NextResponse } from "next/server";
import { jsonError, requirePermission } from "@/lib/auth/require-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { quotationHeaderSchema } from "@/schemas/quotations";
import { writeAuditLog } from "@/services/audit/audit.service";
import { nowIso } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { isDemoMode } from "@/lib/env";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requirePermission("quotations.update");
    const { id } = await context.params;
    if (isDemoMode()) return NextResponse.json({ ok: true, mode: "demo" });
    const parsed = quotationHeaderSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Quotation details are incomplete." }, { status: 400 });
    const db = getAdminDb();
    if (!db) throw new AppError("FIREBASE_UNCONFIGURED", "Admin SDK is required.", 500);
    const ref = db.collection(COLLECTIONS.quotations).doc(id);
    const snap = await ref.get();
    if (!snap.exists) throw new AppError("NOT_FOUND", "Quotation not found.", 404);
    const current = snap.data() ?? {};
    if (["APPROVED", "SENT", "VIEWED", "NEGOTIATION", "ACCEPTED"].includes(String(current.status))) {
      throw new AppError("VALIDATION", "Create a revision instead of editing a locked quotation.", 400);
    }
    const next = { ...parsed.data, updatedAt: nowIso(), updatedBy: actor.uid };
    await ref.set(next, { merge: true });
    await writeAuditLog({ userId: actor.uid, userName: actor.displayName, action: "UPDATE", module: "quotations", recordId: id, oldValue: String(current.status ?? ""), newValue: String(current.status ?? "") });
    return NextResponse.json({ quotation: { id, ...current, ...next } });
  } catch (error) {
    const mapped = jsonError(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
