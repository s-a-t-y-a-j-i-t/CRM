import { NextResponse } from "next/server";
import { jsonError, requirePermission } from "@/lib/auth/require-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { feasibilityDecisionSchema } from "@/schemas/feasibility";
import { writeAuditLog } from "@/services/audit/audit.service";
import { nowIso } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { isDemoMode } from "@/lib/env";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requirePermission("feasibility.final_decision");
    const { id } = await context.params;
    if (isDemoMode()) return NextResponse.json({ ok: true, mode: "demo" });
    const parsed = feasibilityDecisionSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Decision details are incomplete." }, { status: 400 });
    const db = getAdminDb();
    if (!db) throw new AppError("FIREBASE_UNCONFIGURED", "Admin SDK is required.", 500);
    const ref = db.collection(COLLECTIONS.feasibilities).doc(id);
    const snap = await ref.get();
    if (!snap.exists) throw new AppError("NOT_FOUND", "Feasibility not found.", 404);
    const current = snap.data() ?? {};
    const next = {
      status: parsed.data.decision,
      overallDecision: parsed.data.decision,
      overallRemarks: parsed.data.remarks,
      notFeasibleReason: parsed.data.notFeasibleReason ?? null,
      conditions: parsed.data.conditions ?? [],
      updatedAt: nowIso(),
      updatedBy: actor.uid,
    };
    await ref.set(next, { merge: true });
    await writeAuditLog({ userId: actor.uid, userName: actor.displayName, action: "UPDATE", module: "feasibility", recordId: id, oldValue: String(current.status ?? ""), newValue: parsed.data.decision });
    return NextResponse.json({ feasibility: { id, ...current, ...next } });
  } catch (error) {
    const mapped = jsonError(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
