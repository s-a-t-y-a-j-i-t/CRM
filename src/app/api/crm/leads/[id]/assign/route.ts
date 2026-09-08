import { NextResponse } from "next/server";
import { jsonError, requirePermission } from "@/lib/auth/require-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { leadAssignSchema } from "@/schemas/leads";
import { writeAuditLog } from "@/services/audit/audit.service";
import { nowIso } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { isDemoMode } from "@/lib/env";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const actor = await requirePermission("leads.assign");
    const { id } = await context.params;
    if (isDemoMode()) return NextResponse.json({ ok: true, mode: "demo" });
    const parsed = leadAssignSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Select a sales person." }, { status: 400 });
    }
    const db = getAdminDb();
    if (!db) throw new AppError("FIREBASE_UNCONFIGURED", "Admin SDK is required.", 500);
    const ref = db.collection(COLLECTIONS.leads).doc(id);
    const snap = await ref.get();
    if (!snap.exists) throw new AppError("NOT_FOUND", "Lead not found.", 404);
    const current = snap.data() ?? {};
    const userSnap = await db.collection(COLLECTIONS.users).doc(parsed.data.assignedTo).get();
    const assignedToName = String(userSnap.data()?.displayName ?? actor.displayName);
    const next = {
      assignedTo: parsed.data.assignedTo,
      assignedToName,
      assignedAt: nowIso(),
      updatedAt: nowIso(),
      updatedBy: actor.uid,
    };
    await ref.set(next, { merge: true });
    await writeAuditLog({
      userId: actor.uid,
      userName: actor.displayName,
      action: "UPDATE",
      module: "leads",
      recordId: id,
      oldValue: String(current.assignedTo ?? ""),
      newValue: parsed.data.assignedTo,
    });
    return NextResponse.json({ lead: { id, ...current, ...next } });
  } catch (error) {
    const mapped = jsonError(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
