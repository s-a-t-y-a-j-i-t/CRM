"use client";

import { use, useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { CustomerForm } from "@/features/crm/customer-form";
import { useAuth } from "@/hooks/useAuth";
import { useCrmStore } from "@/stores/crm-store";
import { fromMinorUnits } from "@/lib/money";
import { updateCustomer } from "@/services/crm/customer.service";
import { toUserMessage } from "@/lib/errors";
import type { CustomerFormValues } from "@/schemas/crm";

export default function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const customer = useCrmStore((state) => state.customers.find((item) => item.id === id));
  const [submitting, setSubmitting] = useState(false);

  if (!customer) {
    return <EmptyState title="Customer not found" description="This account is no longer available." />;
  }

  const current = customer;

  async function onSubmit(values: CustomerFormValues) {
    if (!user) return;
    setSubmitting(true);
    try {
      await updateCustomer(current.id, values, user);
      toast.success("Customer updated");
      router.push(`/crm/customers/${current.id}` as Route);
    } catch (error) {
      toast.error(toUserMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  const defaults: CustomerFormValues = {
    companyName: customer.companyName,
    legalName: customer.legalName ?? "",
    shortName: customer.shortName ?? "",
    customerType: customer.customerType,
    customerCategory: customer.customerCategory ?? "",
    website: customer.website ?? "",
    primaryEmail: customer.primaryEmail ?? "",
    primaryPhone: customer.primaryPhone ?? "",
    alternatePhone: customer.alternatePhone ?? "",
    billingAddress: customer.billingAddress ?? "",
    shippingAddress: customer.shippingAddress ?? "",
    sameAsBilling: customer.shippingAddress === customer.billingAddress,
    city: customer.city ?? "",
    state: customer.state ?? "",
    country: customer.country ?? "",
    postalCode: customer.postalCode ?? "",
    gstin: customer.gstin ?? "",
    pan: customer.pan ?? "",
    drugLicenseNumber: customer.drugLicenseNumber ?? "",
    licenseExpiryDate: customer.licenseExpiryDate ?? "",
    paymentTerms: customer.paymentTerms ?? "",
    creditLimit: Number(fromMinorUnits(customer.creditLimitMinor, customer.currency)),
    currency: customer.currency,
    assignedSalesPersonId: customer.assignedSalesPersonId ?? "",
    customerSince: customer.customerSince ?? "",
    notes: customer.notes ?? "",
    status: customer.status,
  };

  return (
    <div className="space-y-6">
      <PageHeader title={`Edit ${customer.companyName}`} description={`${customer.customerCode} · customer code cannot be changed.`} />
      <CustomerForm defaultValues={defaults} submitting={submitting} onSubmit={onSubmit} />
    </div>
  );
}
