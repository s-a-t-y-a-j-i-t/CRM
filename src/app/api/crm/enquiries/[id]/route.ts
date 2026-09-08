import { NextResponse } from "next/server";
import { jsonError, requirePermission } from "@/lib/auth/require-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { enquiryFormSchema } from "@/schemas/enquiries";
import { writeAuditLog } from "@/services/audit/audit.service";
import { nowIso } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { isDemoMode } from "@/lib/env";
import { can } from "@/lib/rbac/can";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const actor = await requirePermission("enquiries.update");
    const { id } = await context.params;
    if (isDemoMode()) return NextResponse.json({ ok: true, mode: "demo" });
    const parsed = enquiryFormSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Check the highlighted fields and try again." }, { status: 400 });
    }
    const db = getAdminDb();
    if (!db) throw new AppError("FIREBASE_UNCONFIGURED", "Admin SDK is required.", 500);
    const ref = db.collection(COLLECTIONS.enquiries).doc(id);
    const snap = await ref.get();
    if (!snap.exists) throw new AppError("NOT_FOUND", "Enquiry not found.", 404);
    const current = snap.data() ?? {};
    if (!can(actor, "enquiries.view_all") && current.assignedTo !== actor.uid) {
      throw new AppError("FORBIDDEN", "You can only access enquiries assigned to you.", 403);
    }
    const values = parsed.data;
    const next = {
      customerId: values.customerId,
      contactId: values.contactId,
      enquirySource: values.enquirySource,
      enquiryType: values.enquiryType,
      assignedTo: values.assignedTo,
      priority: values.priority,
      receivedDate: values.receivedDate,
      expectedDecisionDate: values.expectedDecisionDate || null,
      description: values.description || null,
      updatedAt: nowIso(),
      updatedBy: actor.uid,
    };
    await ref.set(next, { merge: true });
    await writeAuditLog({
      userId: actor.uid,
      userName: actor.displayName,
      action: "UPDATE",
      module: "enquiries",
      recordId: id,
      oldValue: String(current.status ?? ""),
      newValue: values.enquiryType,
    });
    return NextResponse.json({ enquiry: { id, ...current, ...next } });
  } catch (error) {
    const mapped = jsonError(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
