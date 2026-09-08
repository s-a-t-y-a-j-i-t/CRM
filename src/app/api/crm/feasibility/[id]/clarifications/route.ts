import { NextResponse } from "next/server";
import { jsonError, requirePermission } from "@/lib/auth/require-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { clarificationSchema } from "@/schemas/feasibility";
import { writeAuditLog } from "@/services/audit/audit.service";
import { nowIso } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { isDemoMode } from "@/lib/env";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requirePermission("feasibility.review");
    const { id } = await context.params;
    if (isDemoMode()) return NextResponse.json({ ok: true, mode: "demo" });
    const parsed = clarificationSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Clarification is incomplete." }, { status: 400 });
    const db = getAdminDb();
    if (!db) throw new AppError("FIREBASE_UNCONFIGURED", "Admin SDK is required.", 500);
    const parent = await db.collection(COLLECTIONS.feasibilities).doc(id).get();
    if (!parent.exists) throw new AppError("NOT_FOUND", "Feasibility not found.", 404);
    const payload = {
      ...parsed.data,
      feasibilityId: id,
      requestedBy: actor.uid,
      requestedByName: actor.displayName,
      requestedAt: nowIso(),
      status: "OPEN",
    };
    const ref = await db.collection(COLLECTIONS.feasibilityClarifications).add(payload);
    await db.collection(COLLECTIONS.feasibilities).doc(id).set({ status: "CLARIFICATION_REQUIRED", updatedAt: nowIso(), updatedBy: actor.uid }, { merge: true });
    await writeAuditLog({
      userId: actor.uid,
      userName: actor.displayName,
      action: "UPDATE",
      module: "feasibility",
      recordId: id,
      newValue: parsed.data.question,
    });
    return NextResponse.json({ clarification: { id: ref.id, ...payload } });
  } catch (error) {
    const mapped = jsonError(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
