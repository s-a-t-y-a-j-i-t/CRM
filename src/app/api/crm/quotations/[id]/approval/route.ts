import { NextResponse } from "next/server";
import { jsonError, requirePermission } from "@/lib/auth/require-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { quotationApprovalSchema } from "@/schemas/quotations";
import { writeAuditLog } from "@/services/audit/audit.service";
import { nowIso } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { isDemoMode } from "@/lib/env";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const parsed = quotationApprovalSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Approval details are incomplete." }, { status: 400 });
    const permission = parsed.data.decision === "REJECTED" ? "quotations.reject" : parsed.data.decision === "APPROVED" ? "quotations.approve" : "quotations.submit";
    const actor = await requirePermission(permission);
    if (isDemoMode()) return NextResponse.json({ ok: true, mode: "demo" });
    const db = getAdminDb();
    if (!db) throw new AppError("FIREBASE_UNCONFIGURED", "Admin SDK is required.", 500);
    const ref = db.collection(COLLECTIONS.quotations).doc(id);
    const snap = await ref.get();
    if (!snap.exists) throw new AppError("NOT_FOUND", "Quotation not found.", 404);
    const current = snap.data() ?? {};
    const status = parsed.data.decision === "REJECTED" ? "REJECTED" : parsed.data.decision === "APPROVED" ? "APPROVED" : "APPROVAL_PENDING";
    await ref.set({
      status,
      approvalStatus: status,
      approvedBy: parsed.data.decision === "APPROVED" ? actor.uid : null,
      approvedAt: parsed.data.decision === "APPROVED" ? nowIso() : null,
      updatedAt: nowIso(),
      updatedBy: actor.uid,
    }, { merge: true });
    await db.collection(COLLECTIONS.quotationApprovals).add({
      quotationId: id,
      decision: parsed.data.decision,
      remarks: parsed.data.reason || parsed.data.remarks,
      actorId: actor.uid,
      actorName: actor.displayName,
      createdAt: nowIso(),
    });
    await writeAuditLog({ userId: actor.uid, userName: actor.displayName, action: "UPDATE", module: "quotations", recordId: id, oldValue: String(current.status ?? ""), newValue: status });
    return NextResponse.json({ quotation: { id, ...current, status } });
  } catch (error) {
    const mapped = jsonError(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
