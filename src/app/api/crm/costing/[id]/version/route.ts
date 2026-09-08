import { NextResponse } from "next/server";
import { jsonError, requirePermission } from "@/lib/auth/require-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { costingVersionSchema } from "@/schemas/costing";
import { formatCostingDisplay } from "@/services/costing/costing-code";
import { writeAuditLog } from "@/services/audit/audit.service";
import { nowIso } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { isDemoMode } from "@/lib/env";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requirePermission("costing.version");
    const { id } = await context.params;
    if (isDemoMode()) return NextResponse.json({ ok: true, mode: "demo" });
    const parsed = costingVersionSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "A change reason is required." }, { status: 400 });
    const db = getAdminDb();
    if (!db) throw new AppError("FIREBASE_UNCONFIGURED", "Admin SDK is required.", 500);
    const currentRef = db.collection(COLLECTIONS.costings).doc(id);
    const snap = await currentRef.get();
    if (!snap.exists) throw new AppError("NOT_FOUND", "Costing not found.", 404);
    const current = snap.data() ?? {};
    const familyId = String(current.familyId ?? id);
    const siblings = await db.collection(COLLECTIONS.costings).where("familyId", "==", familyId).get();
    const nextVersion = siblings.docs.reduce((max, doc) => Math.max(max, Number(doc.data().version ?? 1)), 1) + 1;
    const now = nowIso();
    const payload = {
      ...current,
      version: nextVersion,
      displayNumber: formatCostingDisplay(String(current.costingNumber), nextVersion),
      status: "DRAFT",
      approvalStatus: "NOT_SUBMITTED",
      approvedBy: null,
      approvedAt: null,
      remarks: parsed.data.changeReason,
      createdAt: now,
      updatedAt: now,
      createdBy: actor.uid,
      updatedBy: actor.uid,
    };
    const ref = await db.collection(COLLECTIONS.costings).add(payload);
    await writeAuditLog({ userId: actor.uid, userName: actor.displayName, action: "CREATE", module: "costing", recordId: ref.id, oldValue: String(current.version ?? 1), newValue: String(nextVersion) });
    return NextResponse.json({ costing: { id: ref.id, ...payload } });
  } catch (error) {
    const mapped = jsonError(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
