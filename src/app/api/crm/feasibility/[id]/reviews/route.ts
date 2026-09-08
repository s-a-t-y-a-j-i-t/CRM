import { NextResponse } from "next/server";
import { jsonError, requirePermission } from "@/lib/auth/require-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { departmentReviewSchema } from "@/schemas/feasibility";
import { writeAuditLog } from "@/services/audit/audit.service";
import { nowIso } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { isDemoMode } from "@/lib/env";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requirePermission("feasibility.review");
    const { id } = await context.params;
    if (isDemoMode()) return NextResponse.json({ ok: true, mode: "demo" });
    const parsed = departmentReviewSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Review details are incomplete." }, { status: 400 });
    const db = getAdminDb();
    if (!db) throw new AppError("FIREBASE_UNCONFIGURED", "Admin SDK is required.", 500);
    const parent = await db.collection(COLLECTIONS.feasibilities).doc(id).get();
    if (!parent.exists) throw new AppError("NOT_FOUND", "Feasibility not found.", 404);
    const payload = {
      ...parsed.data,
      feasibilityId: id,
      reviewerId: actor.uid,
      reviewerName: actor.displayName,
      completedAt: nowIso(),
      updatedAt: nowIso(),
      updatedBy: actor.uid,
    };
    const ref = await db.collection(COLLECTIONS.feasibilityReviews).add(payload);
    await writeAuditLog({
      userId: actor.uid,
      userName: actor.displayName,
      action: "UPDATE",
      module: "feasibility",
      recordId: id,
      oldValue: "IN_REVIEW",
      newValue: parsed.data.status,
    });
    return NextResponse.json({ review: { id: ref.id, ...payload } });
  } catch (error) {
    const mapped = jsonError(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
