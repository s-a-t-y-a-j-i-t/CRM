import { NextResponse } from "next/server";
import { jsonError, requirePermission } from "@/lib/auth/require-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { contactFormSchema } from "@/schemas/crm";
import { writeAuditLog } from "@/services/audit/audit.service";
import { nowIso } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { isDemoMode } from "@/lib/env";

export async function POST(request: Request) {
  try {
    const actor = await requirePermission("contacts.create");
    if (isDemoMode()) {
      return NextResponse.json({ ok: true, mode: "demo" });
    }
    const body = await request.json();
    const parsed = contactFormSchema.safeParse(body);
    const customerId = String(body.customerId ?? "");
    if (!parsed.success || !customerId) {
      return NextResponse.json({ error: "Check the highlighted fields and try again." }, { status: 400 });
    }
    const db = getAdminDb();
    if (!db) {
      throw new AppError("FIREBASE_UNCONFIGURED", "Admin SDK is required to create contacts.", 500);
    }
    const values = parsed.data;
    const now = nowIso();
    const payload = {
      customerId,
      firstName: values.firstName,
      lastName: values.lastName ?? "",
      fullName: `${values.firstName} ${values.lastName ?? ""}`.trim(),
      designation: values.designation || null,
      department: values.department || null,
      email: values.email || null,
      phone: values.phone || null,
      alternatePhone: values.alternatePhone || null,
      whatsapp: values.whatsapp || null,
      contactType: values.contactType,
      isPrimary: values.isPrimary,
      status: values.status,
      notes: values.notes || null,
      createdAt: now,
      updatedAt: now,
      createdBy: actor.uid,
      updatedBy: actor.uid,
    };
    const batch = db.batch();
    const ref = db.collection(COLLECTIONS.customers).doc(customerId).collection("contacts").doc();
    batch.set(ref, payload);
    if (values.isPrimary) {
      const existing = await db.collection(COLLECTIONS.customers).doc(customerId).collection("contacts").get();
      existing.docs.forEach((doc) => {
        if (doc.id !== ref.id) batch.set(doc.ref, { isPrimary: false, updatedAt: now, updatedBy: actor.uid }, { merge: true });
      });
      batch.set(
        db.collection(COLLECTIONS.customers).doc(customerId),
        { primaryContactName: payload.fullName, primaryContactPhone: payload.phone, primaryContactEmail: payload.email, updatedAt: now },
        { merge: true },
      );
    }
    await batch.commit();
    await writeAuditLog({
      userId: actor.uid,
      userName: actor.displayName,
      action: "CREATE",
      module: "contacts",
      recordId: ref.id,
      newValue: payload.fullName,
    });
    return NextResponse.json({ contact: { id: ref.id, ...payload } });
  } catch (error) {
    const mapped = jsonError(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
