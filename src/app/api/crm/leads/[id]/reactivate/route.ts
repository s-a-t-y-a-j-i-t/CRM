import { NextResponse } from "next/server";
import { jsonError, requirePermission } from "@/lib/auth/require-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { reactivateTarget } from "@/services/leads/lead-workflow.service";
import { writeAuditLog } from "@/services/audit/audit.service";
import { nowIso } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { isDemoMode } from "@/lib/env";
import type { LeadStatus } from "@/types/leads";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    const actor = await requirePermission("leads.change_status");
    const { id } = await context.params;
    if (isDemoMode()) return NextResponse.json({ ok: true, mode: "demo" });
    const db = getAdminDb();
    if (!db) throw new AppError("FIREBASE_UNCONFIGURED", "Admin SDK is required.", 500);
    const ref = db.collection(COLLECTIONS.leads).doc(id);
    const snap = await ref.get();
    if (!snap.exists) throw new AppError("NOT_FOUND", "Lead not found.", 404);
    const current = snap.data() ?? {};
    const target = reactivateTarget({
      status: String(current.status ?? "LOST") as LeadStatus,
      previousStatus: current.previousStatus as LeadStatus | undefined,
    });
    const next = { status: target, updatedAt: nowIso(), updatedBy: actor.uid };
    await ref.set(next, { merge: true });
    await writeAuditLog({
      userId: actor.uid,
      userName: actor.displayName,
      action: "UPDATE",
      module: "leads",
      recordId: id,
      oldValue: String(current.status ?? ""),
      newValue: target,
    });
    return NextResponse.json({ lead: { id, ...current, ...next } });
  } catch (error) {
    const mapped = jsonError(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
