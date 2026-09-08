import { NextResponse } from "next/server";
import { jsonError, requirePermission } from "@/lib/auth/require-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { createCostingSchema } from "@/schemas/costing";
import { allocateCostingNumber } from "@/services/costing/costing-code.server";
import { buildCostingSearchIndex, formatCostingDisplay } from "@/services/costing/costing-code";
import { writeAuditLog } from "@/services/audit/audit.service";
import { nowIso } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { isDemoMode } from "@/lib/env";

export async function POST(request: Request) {
  try {
    const actor = await requirePermission("costing.create");
    if (isDemoMode()) return NextResponse.json({ ok: true, mode: "demo" });
    const parsed = createCostingSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Costing details are incomplete." }, { status: 400 });
    const db = getAdminDb();
    if (!db) throw new AppError("FIREBASE_UNCONFIGURED", "Admin SDK is required.", 500);
    const costingNumber = await allocateCostingNumber();
    const now = nowIso();
    const payload = {
      ...parsed.data,
      costingNumber,
      displayNumber: formatCostingDisplay(costingNumber, 1),
      version: 1,
      status: "DRAFT",
      approvalStatus: "NOT_SUBMITTED",
      searchIndex: buildCostingSearchIndex({ costingNumber, displayNumber: formatCostingDisplay(costingNumber, 1) }),
      createdAt: now,
      updatedAt: now,
      createdBy: actor.uid,
      updatedBy: actor.uid,
    };
    const ref = await db.collection(COLLECTIONS.costings).add(payload);
    await ref.set({ familyId: ref.id }, { merge: true });
    await writeAuditLog({ userId: actor.uid, userName: actor.displayName, action: "CREATE", module: "costing", recordId: ref.id, newValue: costingNumber });
    return NextResponse.json({ costing: { id: ref.id, familyId: ref.id, ...payload } });
  } catch (error) {
    const mapped = jsonError(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
