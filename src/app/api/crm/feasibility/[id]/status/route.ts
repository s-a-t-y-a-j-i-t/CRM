import { NextResponse } from "next/server";
import { jsonError, requirePermission } from "@/lib/auth/require-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { feasibilityStatusSchema } from "@/schemas/feasibility";
import { validateTransition } from "@/services/feasibility/feasibility-workflow.service";
import { writeAuditLog } from "@/services/audit/audit.service";
import { nowIso } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { isDemoMode } from "@/lib/env";
import type { FeasibilityStatus } from "@/constants/feasibility";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requirePermission("feasibility.change_status");
    const { id } = await context.params;
    if (isDemoMode()) return NextResponse.json({ ok: true, mode: "demo" });
    const parsed = feasibilityStatusSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    const db = getAdminDb();
    if (!db) throw new AppError("FIREBASE_UNCONFIGURED", "Admin SDK is required.", 500);
    const ref = db.collection(COLLECTIONS.feasibilities).doc(id);
    const snap = await ref.get();
    if (!snap.exists) throw new AppError("NOT_FOUND", "Feasibility not found.", 404);
    const current = snap.data() ?? {};
    validateTransition(String(current.status ?? "INITIATED") as FeasibilityStatus, parsed.data.status);
    await ref.set({ status: parsed.data.status, updatedAt: nowIso(), updatedBy: actor.uid }, { merge: true });
    await writeAuditLog({ userId: actor.uid, userName: actor.displayName, action: "UPDATE", module: "feasibility", recordId: id, oldValue: String(current.status ?? ""), newValue: parsed.data.status });
    return NextResponse.json({ feasibility: { id, ...current, status: parsed.data.status } });
  } catch (error) {
    const mapped = jsonError(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
