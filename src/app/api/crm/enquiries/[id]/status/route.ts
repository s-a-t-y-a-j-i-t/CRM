import { NextResponse } from "next/server";
import { jsonError, requirePermission } from "@/lib/auth/require-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { enquiryStatusSchema } from "@/schemas/enquiries";
import { validateTransition } from "@/services/enquiries/enquiry-workflow.service";
import { writeAuditLog } from "@/services/audit/audit.service";
import { nowIso } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { isDemoMode } from "@/lib/env";
import type { EnquiryStatus } from "@/types/enquiries";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const actor = await requirePermission("enquiries.change_status");
    const { id } = await context.params;
    if (isDemoMode()) return NextResponse.json({ ok: true, mode: "demo" });
    const parsed = enquiryStatusSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid status change." }, { status: 400 });
    const db = getAdminDb();
    if (!db) throw new AppError("FIREBASE_UNCONFIGURED", "Admin SDK is required.", 500);
    const ref = db.collection(COLLECTIONS.enquiries).doc(id);
    const snap = await ref.get();
    if (!snap.exists) throw new AppError("NOT_FOUND", "Enquiry not found.", 404);
    const current = snap.data() ?? {};
    const from = String(current.status ?? "NEW") as EnquiryStatus;
    validateTransition(from, parsed.data.status);
    const next = { status: parsed.data.status, previousStatus: from, updatedAt: nowIso(), updatedBy: actor.uid };
    await ref.set(next, { merge: true });
    await writeAuditLog({
      userId: actor.uid,
      userName: actor.displayName,
      action: "UPDATE",
      module: "enquiries",
      recordId: id,
      oldValue: from,
      newValue: parsed.data.status,
    });
    return NextResponse.json({ enquiry: { id, ...current, ...next } });
  } catch (error) {
    const mapped = jsonError(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
