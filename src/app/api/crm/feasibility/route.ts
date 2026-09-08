import { NextResponse } from "next/server";
import { jsonError, requirePermission } from "@/lib/auth/require-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { startFeasibilitySchema } from "@/schemas/feasibility";
import { allocateFeasibilityNumber } from "@/services/feasibility/feasibility-code.server";
import { buildFeasibilitySearchIndex } from "@/services/feasibility/feasibility-code";
import { writeAuditLog } from "@/services/audit/audit.service";
import { nowIso } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { isDemoMode } from "@/lib/env";

export async function POST(request: Request) {
  try {
    const actor = await requirePermission("feasibility.create");
    if (isDemoMode()) return NextResponse.json({ ok: true, mode: "demo" });
    const parsed = startFeasibilitySchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Feasibility details are incomplete." }, { status: 400 });
    const db = getAdminDb();
    if (!db) throw new AppError("FIREBASE_UNCONFIGURED", "Admin SDK is required.", 500);
    const existing = await db.collection(COLLECTIONS.feasibilities)
      .where("enquiryId", "==", parsed.data.enquiryId)
      .where("status", "in", ["INITIATED", "DOCUMENT_REVIEW", "TECHNICAL_REVIEW", "DEPARTMENT_REVIEW", "CLARIFICATION_REQUIRED", "UNDER_EVALUATION", "APPROVAL_PENDING", "ON_HOLD"])
      .limit(1)
      .get();
    if (!existing.empty) {
      throw new AppError("CONFLICT", "An active feasibility already exists for this enquiry.", 409);
    }
    const feasibilityNumber = await allocateFeasibilityNumber();
    const now = nowIso();
    const payload = {
      ...parsed.data,
      feasibilityNumber,
      status: "INITIATED",
      initiatedAt: now,
      searchIndex: buildFeasibilitySearchIndex({ feasibilityNumber }),
      createdAt: now,
      updatedAt: now,
      createdBy: actor.uid,
      updatedBy: actor.uid,
    };
    const ref = await db.collection(COLLECTIONS.feasibilities).add(payload);
    await writeAuditLog({ userId: actor.uid, userName: actor.displayName, action: "CREATE", module: "feasibility", recordId: ref.id, newValue: feasibilityNumber });
    return NextResponse.json({ feasibility: { id: ref.id, ...payload } });
  } catch (error) {
    const mapped = jsonError(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
