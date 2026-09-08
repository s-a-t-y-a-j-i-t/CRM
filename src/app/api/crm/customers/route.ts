import { NextResponse } from "next/server";
import { jsonError, requirePermission } from "@/lib/auth/require-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { customerFormSchema } from "@/schemas/crm";
import { allocateCustomerCode } from "@/services/crm/customer-code.server";
import { buildCustomerSearchIndex } from "@/services/crm/customer-code";
import { writeAuditLog } from "@/services/audit/audit.service";
import { nowIso } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { isDemoMode } from "@/lib/env";
import { toMinorUnits } from "@/lib/money";

export async function POST(request: Request) {
  try {
    const actor = await requirePermission("customers.create");
    if (isDemoMode()) {
      return NextResponse.json({ ok: true, mode: "demo" });
    }
    const body = await request.json();
    const parsed = customerFormSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Check the highlighted fields and try again." }, { status: 400 });
    }
    const db = getAdminDb();
    if (!db) {
      throw new AppError("FIREBASE_UNCONFIGURED", "Admin SDK is required to create customers.", 500);
    }
    const values = parsed.data;
    const customerCode = await allocateCustomerCode();
    const now = nowIso();
    const shipping = values.sameAsBilling ? values.billingAddress : values.shippingAddress;
    const payload = {
      customerCode,
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
      status: values.status,
      customerSince: values.customerSince || null,
      notes: values.notes || null,
      isArchived: false,
      isDemoData: false,
      searchIndex: buildCustomerSearchIndex({ ...values, customerCode }),
      createdAt: now,
      updatedAt: now,
      createdBy: actor.uid,
      updatedBy: actor.uid,
    };
    const ref = await db.collection(COLLECTIONS.customers).add(payload);
    await writeAuditLog({
      userId: actor.uid,
      userName: actor.displayName,
      action: "CREATE",
      module: "customers",
      recordId: ref.id,
      newValue: `${values.companyName} (${customerCode})`,
    });
    return NextResponse.json({ customer: { id: ref.id, ...payload } });
  } catch (error) {
    const mapped = jsonError(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
