import { NextResponse } from "next/server";
import { jsonError, requirePermission } from "@/lib/auth/require-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { writeAuditLog } from "@/services/audit/audit.service";
import { formatQuotationDisplay } from "@/services/quotations/quotation-code";
import { nowIso } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { isDemoMode } from "@/lib/env";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requirePermission("quotations.revise");
    const { id } = await context.params;
    if (isDemoMode()) return NextResponse.json({ ok: true, mode: "demo" });
    const body = (await request.json()) as { changeReason?: string };
    if (!body.changeReason?.trim()) return NextResponse.json({ error: "A revision reason is required." }, { status: 400 });
    const db = getAdminDb();
    if (!db) throw new AppError("FIREBASE_UNCONFIGURED", "Admin SDK is required.", 500);
    const source = await db.collection(COLLECTIONS.quotations).doc(id).get();
    if (!source.exists) throw new AppError("NOT_FOUND", "Quotation not found.", 404);
    const current = source.data() ?? {};
    const familyId = String(current.familyId ?? id);
    const siblings = await db.collection(COLLECTIONS.quotations).where("familyId", "==", familyId).get();
    const nextVersion = siblings.docs.reduce((max, doc) => Math.max(max, Number(doc.data().version ?? 1)), 1) + 1;
    const now = nowIso();
    const payload = {
      ...current,
      version: nextVersion,
      displayNumber: formatQuotationDisplay(String(current.quotationNumber), nextVersion),
      status: "DRAFT",
      approvalStatus: "NOT_SUBMITTED",
      approvedBy: null,
      sentAt: null,
      familyId,
      internalNotes: body.changeReason,
      createdAt: now,
      updatedAt: now,
      createdBy: actor.uid,
      updatedBy: actor.uid,
    };
    const ref = await db.collection(COLLECTIONS.quotations).add(payload);
    await db.collection(COLLECTIONS.quotationVersions).add({
      quotationId: id,
      version: current.version,
      changeReason: body.changeReason,
      createdAt: now,
      createdBy: actor.uid,
    });
    await writeAuditLog({ userId: actor.uid, userName: actor.displayName, action: "CREATE", module: "quotations", recordId: ref.id, oldValue: String(current.displayNumber ?? ""), newValue: String(payload.displayNumber) });
    return NextResponse.json({ quotation: { id: ref.id, ...payload } });
  } catch (error) {
    const mapped = jsonError(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
