import { NextResponse } from "next/server";
import { jsonError, requirePermission } from "@/lib/auth/require-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { feasibilityAssignSchema } from "@/schemas/feasibility";
import { writeAuditLog } from "@/services/audit/audit.service";
import { nowIso } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { isDemoMode } from "@/lib/env";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requirePermission("feasibility.assign");
    const { id } = await context.params;
    if (isDemoMode()) return NextResponse.json({ ok: true, mode: "demo" });
    const parsed = feasibilityAssignSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Assignment is incomplete." }, { status: 400 });
    const db = getAdminDb();
    if (!db) throw new AppError("FIREBASE_UNCONFIGURED", "Admin SDK is required.", 500);
    const ref = db.collection(COLLECTIONS.feasibilities).doc(id);
    const snap = await ref.get();
    if (!snap.exists) throw new AppError("NOT_FOUND", "Feasibility not found.", 404);
    const current = snap.data() ?? {};
    await ref.set({ assignedTo: parsed.data.assignedTo, technicalReviewer: parsed.data.technicalReviewer || null, updatedAt: nowIso(), updatedBy: actor.uid }, { merge: true });
    await writeAuditLog({ userId: actor.uid, userName: actor.displayName, action: "UPDATE", module: "feasibility", recordId: id, oldValue: String(current.assignedTo ?? ""), newValue: parsed.data.assignedTo });
    return NextResponse.json({ feasibility: { id, ...current, assignedTo: parsed.data.assignedTo } });
  } catch (error) {
    const mapped = jsonError(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
