"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/shared/form-field";
import {
  COUNTRY_OPTIONS,
  CUSTOMER_CATEGORY_OPTIONS,
  CUSTOMER_STATUS_OPTIONS,
  CUSTOMER_TYPE_OPTIONS,
  PAYMENT_TERM_OPTIONS,
} from "@/constants/customers";
import { customerFormSchema, type CustomerFormValues } from "@/schemas/crm";
import { useIdentityStore } from "@/stores/identity-store";

export function CustomerForm({
  defaultValues,
  submitting,
  onSubmit,
}: {
  defaultValues: CustomerFormValues;
  submitting?: boolean;
  onSubmit: (values: CustomerFormValues) => Promise<void>;
}) {
  const salesPeople = useIdentityStore((state) => state.users).filter((user) => user.status === "ACTIVE");
  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues,
  });
  const [sameAsBilling, setSameAsBilling] = useState(defaultValues.sameAsBilling);

  return (
    <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
      <Card>
        <CardHeader>
          <CardTitle>Basic information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField label="Company name *" htmlFor="companyName" error={form.formState.errors.companyName?.message}>
            <Input id="companyName" {...form.register("companyName")} />
          </FormField>
          <FormField label="Legal name" htmlFor="legalName" error={form.formState.errors.legalName?.message}>
            <Input id="legalName" {...form.register("legalName")} />
          </FormField>
          <FormField label="Short name" htmlFor="shortName">
            <Input id="shortName" {...form.register("shortName")} />
          </FormField>
          <FormField label="Customer type *" htmlFor="customerType" error={form.formState.errors.customerType?.message}>
            <Select id="customerType" {...form.register("customerType")}>
              {CUSTOMER_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Customer category" htmlFor="customerCategory">
            <Select id="customerCategory" {...form.register("customerCategory")}>
              <option value="">Select category</option>
              {CUSTOMER_CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Website" htmlFor="website" error={form.formState.errors.website?.message}>
            <Input id="website" placeholder="https://" {...form.register("website")} />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField label="Primary email" htmlFor="primaryEmail" error={form.formState.errors.primaryEmail?.message}>
            <Input id="primaryEmail" type="email" {...form.register("primaryEmail")} />
          </FormField>
          <FormField label="Primary phone" htmlFor="primaryPhone" error={form.formState.errors.primaryPhone?.message}>
            <Input id="primaryPhone" {...form.register("primaryPhone")} />
          </FormField>
          <FormField label="Alternate phone" htmlFor="alternatePhone">
            <Input id="alternatePhone" {...form.register("alternatePhone")} />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Address</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <FormField label="Billing address" htmlFor="billingAddress">
              <Textarea id="billingAddress" rows={3} {...form.register("billingAddress")} />
            </FormField>
          </div>
          <label className="sm:col-span-2 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={sameAsBilling}
              onChange={(event) => {
                setSameAsBilling(event.target.checked);
                form.setValue("sameAsBilling", event.target.checked);
              }}
            />
            Same as billing address
          </label>
          {sameAsBilling ? null : (
            <div className="sm:col-span-2">
              <FormField label="Shipping address" htmlFor="shippingAddress">
                <Textarea id="shippingAddress" rows={3} {...form.register("shippingAddress")} />
              </FormField>
            </div>
          )}
          <FormField label="City" htmlFor="city">
            <Input id="city" {...form.register("city")} />
          </FormField>
          <FormField label="State" htmlFor="state">
            <Input id="state" {...form.register("state")} />
          </FormField>
          <FormField label="Country" htmlFor="country">
            <Select id="country" {...form.register("country")}>
              <option value="">Select country</option>
              {COUNTRY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Postal code" htmlFor="postalCode">
            <Input id="postalCode" {...form.register("postalCode")} />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Business information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField label="GSTIN" htmlFor="gstin" error={form.formState.errors.gstin?.message}>
            <Input id="gstin" {...form.register("gstin")} />
          </FormField>
          <FormField label="PAN" htmlFor="pan" error={form.formState.errors.pan?.message}>
            <Input id="pan" {...form.register("pan")} />
          </FormField>
          <FormField label="Drug license number" htmlFor="drugLicenseNumber">
            <Input id="drugLicenseNumber" {...form.register("drugLicenseNumber")} />
          </FormField>
          <FormField label="License expiry" htmlFor="licenseExpiryDate" error={form.formState.errors.licenseExpiryDate?.message}>
            <Input id="licenseExpiryDate" type="date" {...form.register("licenseExpiryDate")} />
          </FormField>
          <FormField label="Payment terms" htmlFor="paymentTerms">
            <Select id="paymentTerms" {...form.register("paymentTerms")}>
              <option value="">Select terms</option>
              {PAYMENT_TERM_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Credit limit" htmlFor="creditLimit" error={form.formState.errors.creditLimit?.message}>
            <Input id="creditLimit" type="number" min={0} step="0.01" {...form.register("creditLimit", { valueAsNumber: true })} />
          </FormField>
          <FormField label="Currency" htmlFor="currency">
            <Select id="currency" {...form.register("currency")}>
              <option value="INR">INR</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </Select>
          </FormField>
          <FormField label="Status" htmlFor="status">
            <Select id="status" {...form.register("status")}>
              {CUSTOMER_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </Select>
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assignment</CardTitle>
        </CardHeader>
        <CardContent>
          <FormField label="Sales person" htmlFor="assignedSalesPersonId">
            <Select id="assignedSalesPersonId" {...form.register("assignedSalesPersonId")}>
              <option value="">Unassigned</option>
              {salesPeople.map((user) => (
                <option key={user.id} value={user.id}>{user.displayName} · {user.designation}</option>
              ))}
            </Select>
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Additional</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField label="Customer since" htmlFor="customerSince">
            <Input id="customerSince" type="date" {...form.register("customerSince")} />
          </FormField>
          <div className="sm:col-span-2">
            <FormField label="Notes" htmlFor="notes">
              <Textarea id="notes" rows={4} {...form.register("notes")} />
            </FormField>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : "Save customer"}
        </Button>
      </div>
    </form>
  );
}

export const emptyCustomerForm: CustomerFormValues = {
  companyName: "",
  legalName: "",
  shortName: "",
  customerType: "PHARMACEUTICAL_COMPANY",
  customerCategory: "DOMESTIC",
  website: "",
  primaryEmail: "",
  primaryPhone: "",
  alternatePhone: "",
  billingAddress: "",
  shippingAddress: "",
  sameAsBilling: true,
  city: "",
  state: "",
  country: "India",
  postalCode: "",
  gstin: "",
  pan: "",
  drugLicenseNumber: "",
  licenseExpiryDate: "",
  paymentTerms: "NET_30",
  creditLimit: 0,
  currency: "INR",
  assignedSalesPersonId: "",
  customerSince: "",
  notes: "",
  status: "PROSPECT",
};
