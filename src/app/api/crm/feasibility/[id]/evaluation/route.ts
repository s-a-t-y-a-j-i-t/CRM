import { NextResponse } from "next/server";
import { jsonError, requirePermission } from "@/lib/auth/require-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { evaluationSchema } from "@/schemas/feasibility";
import { writeAuditLog } from "@/services/audit/audit.service";
import { nowIso } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { isDemoMode } from "@/lib/env";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requirePermission("feasibility.update");
    const { id } = await context.params;
    if (isDemoMode()) return NextResponse.json({ ok: true, mode: "demo" });
    const parsed = evaluationSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Evaluation is incomplete." }, { status: 400 });
    const db = getAdminDb();
    if (!db) throw new AppError("FIREBASE_UNCONFIGURED", "Admin SDK is required.", 500);
    const parent = await db.collection(COLLECTIONS.feasibilities).doc(id).get();
    if (!parent.exists) throw new AppError("NOT_FOUND", "Feasibility not found.", 404);
    const scored = parsed.data.factors.filter((factor) => typeof factor.score === "number");
    const weight = scored.reduce((sum, factor) => sum + factor.weight, 0);
    const overallScore = weight
      ? Math.round((scored.reduce((sum, factor) => sum + (factor.score ?? 0) * factor.weight, 0) / weight) * 10)
      : undefined;
    const payload = {
      feasibilityId: id,
      factors: parsed.data.factors,
      overallScore,
      submitted: true,
      submittedAt: nowIso(),
      submittedBy: actor.uid,
      updatedAt: nowIso(),
      updatedBy: actor.uid,
    };
    const ref = await db.collection(COLLECTIONS.feasibilityEvaluations).add(payload);
    await db.collection(COLLECTIONS.feasibilities).doc(id).set({
      status: "APPROVAL_PENDING",
      overallScore,
      updatedAt: nowIso(),
      updatedBy: actor.uid,
    }, { merge: true });
    await writeAuditLog({
      userId: actor.uid,
      userName: actor.displayName,
      action: "UPDATE",
      module: "feasibility",
      recordId: id,
      oldValue: "UNDER_EVALUATION",
      newValue: "APPROVAL_PENDING",
    });
    return NextResponse.json({ evaluation: { id: ref.id, ...payload } });
  } catch (error) {
    const mapped = jsonError(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
