import { NextResponse } from "next/server";
import { jsonError, requirePermission } from "@/lib/auth/require-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { quotationStatusSchema } from "@/schemas/quotations";
import { validateQuotationTransition } from "@/services/quotations/quotation-workflow.service";
import { writeAuditLog } from "@/services/audit/audit.service";
import { nowIso } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { isDemoMode } from "@/lib/env";
import type { QuotationStatus } from "@/constants/quotations";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const parsed = quotationStatusSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Status is invalid." }, { status: 400 });
    const permission = parsed.data.status === "CANCELLED" ? "quotations.cancel" : parsed.data.status === "ACCEPTED" ? "quotations.approve" : "quotations.update";
    const actor = await requirePermission(permission);
    if (isDemoMode()) return NextResponse.json({ ok: true, mode: "demo" });
    const db = getAdminDb();
    if (!db) throw new AppError("FIREBASE_UNCONFIGURED", "Admin SDK is required.", 500);
    const ref = db.collection(COLLECTIONS.quotations).doc(id);
    const snap = await ref.get();
    if (!snap.exists) throw new AppError("NOT_FOUND", "Quotation not found.", 404);
    const current = snap.data() ?? {};
    validateQuotationTransition(String(current.status) as QuotationStatus, parsed.data.status);
    await ref.set({ status: parsed.data.status, updatedAt: nowIso(), updatedBy: actor.uid }, { merge: true });
    await writeAuditLog({ userId: actor.uid, userName: actor.displayName, action: "UPDATE", module: "quotations", recordId: id, oldValue: String(current.status ?? ""), newValue: parsed.data.status });
    return NextResponse.json({ quotation: { id, ...current, status: parsed.data.status } });
  } catch (error) {
    const mapped = jsonError(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
