import { NextResponse } from "next/server";
import { jsonError, requirePermission } from "@/lib/auth/require-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { customerFormSchema } from "@/schemas/crm";
import { buildCustomerSearchIndex } from "@/services/crm/customer-code";
import { writeAuditLog } from "@/services/audit/audit.service";
import { nowIso } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { isDemoMode } from "@/lib/env";
import { toMinorUnits } from "@/lib/money";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const actor = await requirePermission("customers.update");
    const { id } = await context.params;
    if (isDemoMode()) {
      return NextResponse.json({ ok: true, mode: "demo" });
    }
    const parsed = customerFormSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Check the highlighted fields and try again." }, { status: 400 });
    }
    const db = getAdminDb();
    if (!db) {
      throw new AppError("FIREBASE_UNCONFIGURED", "Admin SDK is required to update customers.", 500);
    }
    const ref = db.collection(COLLECTIONS.customers).doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      throw new AppError("NOT_FOUND", "Customer not found.", 404);
    }
    const current = snap.data() ?? {};
    const values = parsed.data;
    const shipping = values.sameAsBilling ? values.billingAddress : values.shippingAddress;
    const next = {
      companyName: values.companyName,
      legalName: values.legalName || null,
      shortName: values.shortName || null,
      customerType: values.customerType,
      customerCategory: values.customerCategory || null,
      website: values.website || null,
      primaryEmail: values.primaryEmail || null,
      primaryPhone: values.primaryPhone || null,
      alternatePhone: values.alternatePhone || null,
      billingAddress: values.billingAddress || null,
      shippingAddress: shipping || null,
      city: values.city || null,
      state: values.state || null,
      country: values.country || null,
      postalCode: values.postalCode || null,
      gstin: values.gstin?.toUpperCase() || null,
      pan: values.pan?.toUpperCase() || null,
      drugLicenseNumber: values.drugLicenseNumber || null,
      licenseExpiryDate: values.licenseExpiryDate || null,
      paymentTerms: values.paymentTerms || null,
      creditLimitMinor: toMinorUnits(values.creditLimit, values.currency),
      currency: values.currency,
      assignedSalesPersonId: values.assignedSalesPersonId || null,
      customerSince: values.customerSince || null,
      notes: values.notes || null,
      searchIndex: buildCustomerSearchIndex({
        ...values,
        customerCode: String(current.customerCode ?? ""),
      }),
      updatedAt: nowIso(),
      updatedBy: actor.uid,
    };
    await ref.set(next, { merge: true });
    await writeAuditLog({
      userId: actor.uid,
      userName: actor.displayName,
      action: "UPDATE",
      module: "customers",
      recordId: id,
      oldValue: String(current.companyName ?? ""),
      newValue: values.companyName,
    });
    return NextResponse.json({ customer: { id, ...current, ...next } });
  } catch (error) {
    const mapped = jsonError(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
