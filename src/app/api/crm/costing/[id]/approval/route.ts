import { NextResponse } from "next/server";
import { jsonError, requirePermission } from "@/lib/auth/require-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { costingApprovalSchema } from "@/schemas/costing";
import { writeAuditLog } from "@/services/audit/audit.service";
import { nowIso } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { isDemoMode } from "@/lib/env";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const parsed = costingApprovalSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Approval details are incomplete." }, { status: 400 });
    const permission = parsed.data.decision === "REJECTED" ? "costing.reject" : parsed.data.decision === "APPROVED" ? "costing.approve" : "costing.review";
    const actor = await requirePermission(permission);
    if (isDemoMode()) return NextResponse.json({ ok: true, mode: "demo" });
    const db = getAdminDb();
    if (!db) throw new AppError("FIREBASE_UNCONFIGURED", "Admin SDK is required.", 500);
    const ref = db.collection(COLLECTIONS.costings).doc(id);
    const snap = await ref.get();
    if (!snap.exists) throw new AppError("NOT_FOUND", "Costing not found.", 404);
    const current = snap.data() ?? {};
    const status = parsed.data.decision === "REJECTED" ? "REJECTED" : parsed.data.decision === "APPROVED" ? "APPROVED" : "UNDER_REVIEW";
    await ref.set({
      status,
      approvalStatus: status,
      approvedBy: parsed.data.decision === "APPROVED" ? actor.uid : null,
      approvedAt: parsed.data.decision === "APPROVED" ? nowIso() : null,
      updatedAt: nowIso(),
      updatedBy: actor.uid,
    }, { merge: true });
    await db.collection(COLLECTIONS.costingApprovals).add({
      costingId: id,
      decision: parsed.data.decision,
      remarks: parsed.data.reason || parsed.data.remarks,
      actorId: actor.uid,
      actorName: actor.displayName,
      createdAt: nowIso(),
    });
    await writeAuditLog({ userId: actor.uid, userName: actor.displayName, action: "UPDATE", module: "costing", recordId: id, oldValue: String(current.status ?? ""), newValue: status });
    return NextResponse.json({ costing: { id, ...current, status } });
  } catch (error) {
    const mapped = jsonError(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
