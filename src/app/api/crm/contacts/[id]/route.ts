import { NextResponse } from "next/server";
import { jsonError, requirePermission } from "@/lib/auth/require-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { contactFormSchema } from "@/schemas/crm";
import { writeAuditLog } from "@/services/audit/audit.service";
import { nowIso } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { isDemoMode } from "@/lib/env";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const actor = await requirePermission("contacts.update");
    const { id } = await context.params;
    if (isDemoMode()) {
      return NextResponse.json({ ok: true, mode: "demo" });
    }
    const parsed = contactFormSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Check the highlighted fields and try again." }, { status: 400 });
    }
    const db = getAdminDb();
    if (!db) {
      throw new AppError("FIREBASE_UNCONFIGURED", "Admin SDK is required to update contacts.", 500);
    }
    const group = await db.collectionGroup("contacts").where("id", "==", id).limit(1).get();
    const fallback = group.empty ? await findContact(db, id) : group.docs[0];
    if (!fallback) {
      throw new AppError("NOT_FOUND", "Contact not found.", 404);
    }
    const values = parsed.data;
    const next = {
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
      updatedAt: nowIso(),
      updatedBy: actor.uid,
    };
    await fallback.ref.set(next, { merge: true });
    await writeAuditLog({
      userId: actor.uid,
      userName: actor.displayName,
      action: "UPDATE",
      module: "contacts",
      recordId: id,
      oldValue: String(fallback.data()?.fullName ?? ""),
      newValue: next.fullName,
    });
    return NextResponse.json({ contact: { id, ...fallback.data(), ...next } });
  } catch (error) {
    const mapped = jsonError(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}

async function findContact(db: NonNullable<ReturnType<typeof getAdminDb>>, id: string) {
  const customers = await db.collection(COLLECTIONS.customers).limit(200).get();
  for (const customer of customers.docs) {
    const snap = await customer.ref.collection("contacts").doc(id).get();
    if (snap.exists) return snap;
  }
  return null;
}
