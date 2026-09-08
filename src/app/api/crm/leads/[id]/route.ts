import { NextResponse } from "next/server";
import { jsonError, requirePermission } from "@/lib/auth/require-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { leadFormSchema } from "@/schemas/leads";
import { buildLeadSearchIndex } from "@/services/leads/lead-code";
import { writeAuditLog } from "@/services/audit/audit.service";
import { nowIso } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { isDemoMode } from "@/lib/env";
import { toMinorUnits } from "@/lib/money";
import { can } from "@/lib/rbac/can";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const actor = await requirePermission("leads.view");
    const { id } = await context.params;
    if (isDemoMode()) {
      return NextResponse.json({ ok: true, mode: "demo" });
    }
    const db = getAdminDb();
    if (!db) throw new AppError("FIREBASE_UNCONFIGURED", "Admin SDK is required.", 500);
    const snap = await db.collection(COLLECTIONS.leads).doc(id).get();
    if (!snap.exists) throw new AppError("NOT_FOUND", "Lead not found.", 404);
    const lead = { id: snap.id, ...snap.data() } as { assignedTo?: string };
    if (!can(actor, "leads.view_all") && lead.assignedTo !== actor.uid) {
      throw new AppError("FORBIDDEN", "You can only access leads assigned to you.", 403);
    }
    return NextResponse.json({ lead: { id: snap.id, ...snap.data() } });
  } catch (error) {
    const mapped = jsonError(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const actor = await requirePermission("leads.update");
    const { id } = await context.params;
    if (isDemoMode()) {
      return NextResponse.json({ ok: true, mode: "demo" });
    }
    const parsed = leadFormSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Check the highlighted fields and try again." }, { status: 400 });
    }
    const db = getAdminDb();
    if (!db) throw new AppError("FIREBASE_UNCONFIGURED", "Admin SDK is required to update leads.", 500);
    const ref = db.collection(COLLECTIONS.leads).doc(id);
    const snap = await ref.get();
    if (!snap.exists) throw new AppError("NOT_FOUND", "Lead not found.", 404);
    const current = snap.data() ?? {};
    if (!can(actor, "leads.view_all") && current.assignedTo !== actor.uid) {
      throw new AppError("FORBIDDEN", "You can only access leads assigned to you.", 403);
    }
    const values = parsed.data;
    const next = {
      companyName: values.companyName,
      contactName: values.contactName,
      contactDesignation: values.contactDesignation || null,
      email: values.email || null,
      phone: values.phone || null,
      alternatePhone: values.alternatePhone || null,
      whatsapp: values.whatsapp || null,
      website: values.website || null,
      customerId: values.customerId || null,
      contactId: values.contactId || null,
      leadSource: values.leadSource,
      leadType: values.leadType || null,
      productInterest: values.productInterest || null,
      dosageForm: values.dosageForm || null,
      strength: values.strength || null,
      composition: values.composition || null,
      requiredQuantity: values.requiredQuantity ?? null,
      annualQuantity: values.annualQuantity ?? null,
      targetPriceMinor: values.targetPrice ? toMinorUnits(values.targetPrice, "INR") : null,
      country: values.country || null,
      state: values.state || null,
      expectedBusinessValueMinor: toMinorUnits(values.expectedBusinessValue || 0, "INR"),
      expectedClosingDate: values.expectedClosingDate || null,
      priority: values.priority,
      assignedTo: values.assignedTo,
      nextFollowUpDate: values.nextFollowUpDate || null,
      description: values.description || null,
      notes: values.notes || null,
      searchIndex: buildLeadSearchIndex({ ...values, leadCode: String(current.leadCode ?? "") }),
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
      oldValue: String(current.companyName ?? ""),
      newValue: values.companyName,
    });
    return NextResponse.json({ lead: { id, ...current, ...next } });
  } catch (error) {
    const mapped = jsonError(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
