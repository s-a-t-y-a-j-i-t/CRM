import { NextResponse } from "next/server";
import { jsonError, requirePermission } from "@/lib/auth/require-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { enquiryFormSchema } from "@/schemas/enquiries";
import { allocateEnquiryNumber } from "@/services/enquiries/enquiry-code.server";
import { buildEnquirySearchIndex } from "@/services/enquiries/enquiry-code";
import { writeAuditLog } from "@/services/audit/audit.service";
import { nowIso } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { isDemoMode } from "@/lib/env";

export async function POST(request: Request) {
  try {
    const actor = await requirePermission("enquiries.create");
    if (isDemoMode()) return NextResponse.json({ ok: true, mode: "demo" });
    const parsed = enquiryFormSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Check the highlighted fields and try again." }, { status: 400 });
    }
    const db = getAdminDb();
    if (!db) throw new AppError("FIREBASE_UNCONFIGURED", "Admin SDK is required to create enquiries.", 500);
    const values = parsed.data;
    const enquiryNumber = await allocateEnquiryNumber();
    const now = nowIso();
    const payload = {
      enquiryNumber,
      leadId: values.leadId || null,
      customerId: values.customerId,
      contactId: values.contactId,
      enquirySource: values.enquirySource,
      enquiryType: values.enquiryType,
      assignedTo: values.assignedTo,
      priority: values.priority,
      status: "NEW",
      receivedDate: values.receivedDate,
      expectedDecisionDate: values.expectedDecisionDate || null,
      description: values.description || null,
      internalNotes: values.internalNotes || null,
      technicalReviewStatus: "NOT_STARTED",
      searchIndex: buildEnquirySearchIndex({
        enquiryNumber,
        productName: values.requirement.productName,
        genericName: values.requirement.genericName,
        brandName: values.requirement.brandName,
      }),
      createdAt: now,
      updatedAt: now,
      createdBy: actor.uid,
      updatedBy: actor.uid,
    };
    const ref = await db.collection(COLLECTIONS.enquiries).add(payload);
    await db.collection(COLLECTIONS.productRequirements).add({
      enquiryId: ref.id,
      ...values.requirement,
      versionNumber: 1,
      isCurrent: true,
      createdAt: now,
      updatedAt: now,
      createdBy: actor.uid,
      updatedBy: actor.uid,
    });
    await writeAuditLog({
      userId: actor.uid,
      userName: actor.displayName,
      action: "CREATE",
      module: "enquiries",
      recordId: ref.id,
      newValue: enquiryNumber,
    });
    return NextResponse.json({ enquiry: { id: ref.id, ...payload } });
  } catch (error) {
    const mapped = jsonError(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
