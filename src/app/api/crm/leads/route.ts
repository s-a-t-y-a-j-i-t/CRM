import { NextResponse } from "next/server";
import { jsonError, requirePermission } from "@/lib/auth/require-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { leadFormSchema } from "@/schemas/leads";
import { allocateLeadCode } from "@/services/leads/lead-code.server";
import { buildLeadSearchIndex, scoreLead } from "@/services/leads/lead-code";
import { writeAuditLog } from "@/services/audit/audit.service";
import { nowIso } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { isDemoMode } from "@/lib/env";
import { toMinorUnits } from "@/lib/money";

export async function POST(request: Request) {
  try {
    const actor = await requirePermission("leads.create");
    if (isDemoMode()) {
      return NextResponse.json({ ok: true, mode: "demo" });
    }
    const body = await request.json();
    const parsed = leadFormSchema.safeParse({ ...body, status: body.status ?? "NEW" });
    if (!parsed.success) {
      return NextResponse.json({ error: "Check the highlighted fields and try again." }, { status: 400 });
    }
    const db = getAdminDb();
    if (!db) {
      throw new AppError("FIREBASE_UNCONFIGURED", "Admin SDK is required to create leads.", 500);
    }
    const values = parsed.data;
    const leadCode = await allocateLeadCode();
    const now = nowIso();
    const expectedBusinessValueMinor = toMinorUnits(values.expectedBusinessValue || 0, "INR");
    const payload = {
      leadCode,
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
      expectedBusinessValueMinor,
      expectedClosingDate: values.expectedClosingDate || null,
      priority: values.priority,
      assignedTo: values.assignedTo,
      assignedToName: actor.displayName,
      assignedAt: now,
      status: "NEW",
      nextFollowUpDate: values.nextFollowUpDate || null,
      description: values.description || null,
      notes: values.notes || null,
      score: scoreLead({
        priority: values.priority,
        expectedBusinessValueMinor,
        customerId: values.customerId || undefined,
        nextFollowUpDate: values.nextFollowUpDate || undefined,
        requiredQuantity: values.requiredQuantity,
      }),
      searchIndex: buildLeadSearchIndex({ ...values, leadCode }),
      isDemoData: false,
      createdAt: now,
      updatedAt: now,
      createdBy: actor.uid,
      updatedBy: actor.uid,
    };
    const ref = await db.collection(COLLECTIONS.leads).add(payload);
    await writeAuditLog({
      userId: actor.uid,
      userName: actor.displayName,
      action: "CREATE",
      module: "leads",
      recordId: ref.id,
      newValue: `${values.companyName} (${leadCode})`,
    });
    return NextResponse.json({ lead: { id: ref.id, ...payload } });
  } catch (error) {
    const mapped = jsonError(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
