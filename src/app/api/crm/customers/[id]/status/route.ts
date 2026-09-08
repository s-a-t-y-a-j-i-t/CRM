import { NextResponse } from "next/server";
import { jsonError, requirePermission } from "@/lib/auth/require-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { customerStatusSchema } from "@/schemas/crm";
import { writeAuditLog } from "@/services/audit/audit.service";
import { BLOCKED_ROLES } from "@/constants/customers";
import { nowIso } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { isDemoMode } from "@/lib/env";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const actor = await requirePermission("customers.change_status");
    const { id } = await context.params;
    if (isDemoMode()) {
      return NextResponse.json({ ok: true, mode: "demo" });
    }
    const parsed = customerStatusSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }
    if (parsed.data.status === "BLOCKED" && !BLOCKED_ROLES.has(String(actor.role))) {
      throw new AppError("FORBIDDEN", "Only commercial leadership can block a customer.", 403);
    }
    const db = getAdminDb();
    if (!db) {
      throw new AppError("FIREBASE_UNCONFIGURED", "Admin SDK is required to change status.", 500);
    }
    const ref = db.collection(COLLECTIONS.customers).doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      throw new AppError("NOT_FOUND", "Customer not found.", 404);
    }
    const previous = String(snap.data()?.status ?? "");
    await ref.set({ status: parsed.data.status, updatedAt: nowIso(), updatedBy: actor.uid }, { merge: true });
    await writeAuditLog({
      userId: actor.uid,
      userName: actor.displayName,
      action: "UPDATE",
      module: "customers",
      recordId: id,
      oldValue: previous,
      newValue: parsed.data.status,
      metadata: { action: "STATUS_CHANGED" },
    });
    return NextResponse.json({ customer: { id, ...snap.data(), status: parsed.data.status } });
  } catch (error) {
    const mapped = jsonError(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
