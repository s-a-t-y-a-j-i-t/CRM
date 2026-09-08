"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/shared/form-field";
import { COUNTRY_OPTIONS } from "@/constants/customers";
import {
  DOSAGE_FORM_OPTIONS,
  LEAD_PRIORITY_OPTIONS,
  LEAD_SOURCE_OPTIONS,
  LEAD_TYPE_OPTIONS,
} from "@/constants/leads";
import { leadFormSchema, type LeadFormValues } from "@/schemas/leads";
import { useIdentityStore } from "@/stores/identity-store";
import { useCrmStore } from "@/stores/crm-store";
import { listCustomers } from "@/services/crm/customer.service";
import { listContacts } from "@/services/crm/contact.service";

export function LeadForm({
  defaultValues,
  submitting,
  submitLabel = "Save lead",
  onSubmit,
}: {
  defaultValues: LeadFormValues;
  submitting?: boolean;
  submitLabel?: string;
  onSubmit: (values: LeadFormValues) => Promise<void>;
}) {
  const salesPeople = useIdentityStore((state) => state.users).filter((user) => user.status === "ACTIVE");
  const customers = useCrmStore((state) => state.customers);
  const form = useForm<LeadFormValues>({
    resolver: zodResolver(leadFormSchema),
    defaultValues,
  });
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerId, setCustomerId] = useState(defaultValues.customerId ?? "");
  const matches = useMemo(
    () => listCustomers({ search: customerQuery, pageSize: 8 }, customers).items,
    [customerQuery, customers],
  );
  const contacts = customerId ? listContacts(customerId) : [];

  function numberField(name: "requiredQuantity" | "annualQuantity" | "targetPrice" | "expectedBusinessValue") {
    return form.register(name, {
      setValueAs: (value) => (value === "" || value === null || Number.isNaN(Number(value)) ? undefined : Number(value)),
    });
  }

  return (
    <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
      <Card>
        <CardHeader>
          <CardTitle>Company</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 space-y-2">
            <FormField label="Existing customer" htmlFor="customerSearch">
              <Input
                id="customerSearch"
                placeholder="Search customers without loading the full list"
                value={customerQuery}
                onChange={(event) => setCustomerQuery(event.target.value)}
              />
            </FormField>
            {customerQuery ? (
              <ul className="max-h-40 overflow-auto rounded-lg border border-border text-sm">
                {matches.length === 0 ? (
                  <li className="px-3 py-2 text-muted-foreground">No matching customer. Lead can stay an independent prospect.</li>
                ) : (
                  matches.map((customer) => (
                    <li key={customer.id}>
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left hover:bg-muted"
                        onClick={() => {
                          form.setValue("customerId", customer.id);
                          setCustomerId(customer.id);
                          form.setValue("companyName", customer.companyName);
                          form.setValue("website", customer.website ?? "");
                          form.setValue("country", customer.country ?? "");
                          form.setValue("state", customer.state ?? "");
                          form.setValue("leadType", "EXISTING_CUSTOMER");
                          setCustomerQuery("");
                        }}
                      >
                        {customer.companyName} · {customer.customerCode}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            ) : null}
            {customerId ? (
              <p className="text-xs text-muted-foreground">
                Linked to existing customer.{" "}
                <button type="button" className="underline" onClick={() => { form.setValue("customerId", ""); form.setValue("contactId", ""); setCustomerId(""); }}>
                  Unlink
                </button>
              </p>
            ) : null}
          </div>
          <FormField label="Company name *" htmlFor="companyName" error={form.formState.errors.companyName?.message}>
            <Input id="companyName" {...form.register("companyName")} />
          </FormField>
          <FormField label="Website" htmlFor="website" error={form.formState.errors.website?.message}>
            <Input id="website" placeholder="https://" {...form.register("website")} />
          </FormField>
          <FormField label="Country" htmlFor="country">
            <Select id="country" {...form.register("country")}>
              <option value="">Select country</option>
              {COUNTRY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="State" htmlFor="state">
            <Input id="state" {...form.register("state")} />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {customerId ? (
            <FormField label="Existing contact" htmlFor="contactId">
              <Select id="contactId" {...form.register("contactId")}>
                <option value="">Independent / create later</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>{contact.fullName}</option>
                ))}
              </Select>
            </FormField>
          ) : null}
          <FormField label="Contact name *" htmlFor="contactName" error={form.formState.errors.contactName?.message}>
            <Input id="contactName" {...form.register("contactName")} />
          </FormField>
          <FormField label="Designation" htmlFor="contactDesignation">
            <Input id="contactDesignation" {...form.register("contactDesignation")} />
          </FormField>
          <FormField label="Email" htmlFor="email" error={form.formState.errors.email?.message}>
            <Input id="email" type="email" {...form.register("email")} />
          </FormField>
          <FormField label="Phone" htmlFor="phone" error={form.formState.errors.phone?.message}>
            <Input id="phone" {...form.register("phone")} />
          </FormField>
          <FormField label="Alternate phone" htmlFor="alternatePhone" error={form.formState.errors.alternatePhone?.message}>
            <Input id="alternatePhone" {...form.register("alternatePhone")} />
          </FormField>
          <FormField label="WhatsApp" htmlFor="whatsapp" error={form.formState.errors.whatsapp?.message}>
            <Input id="whatsapp" {...form.register("whatsapp")} />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Business source</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField label="Lead source *" htmlFor="leadSource" error={form.formState.errors.leadSource?.message}>
            <Select id="leadSource" {...form.register("leadSource")}>
              {LEAD_SOURCE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Lead type" htmlFor="leadType">
            <Select id="leadType" {...form.register("leadType")}>
              <option value="">Select type</option>
              {LEAD_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Assigned sales person *" htmlFor="assignedTo" error={form.formState.errors.assignedTo?.message}>
            <Select id="assignedTo" {...form.register("assignedTo")}>
              <option value="">Select owner</option>
              {salesPeople.map((person) => (
                <option key={person.id} value={person.id}>{person.displayName}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Priority *" htmlFor="priority" error={form.formState.errors.priority?.message}>
            <Select id="priority" {...form.register("priority")}>
              {LEAD_PRIORITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </Select>
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Product interest</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField label="Product interest" htmlFor="productInterest">
            <Input id="productInterest" {...form.register("productInterest")} />
          </FormField>
          <FormField label="Dosage form" htmlFor="dosageForm">
            <Select id="dosageForm" {...form.register("dosageForm")}>
              <option value="">Select form</option>
              {DOSAGE_FORM_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Strength" htmlFor="strength">
            <Input id="strength" {...form.register("strength")} />
          </FormField>
          <FormField label="Composition" htmlFor="composition">
            <Input id="composition" {...form.register("composition")} />
          </FormField>
          <FormField label="Required quantity" htmlFor="requiredQuantity" error={form.formState.errors.requiredQuantity?.message}>
            <Input id="requiredQuantity" type="number" min={0} {...numberField("requiredQuantity")} />
          </FormField>
          <FormField label="Annual quantity" htmlFor="annualQuantity" error={form.formState.errors.annualQuantity?.message}>
            <Input id="annualQuantity" type="number" min={0} {...numberField("annualQuantity")} />
          </FormField>
          <FormField label="Target price (INR)" htmlFor="targetPrice" error={form.formState.errors.targetPrice?.message}>
            <Input id="targetPrice" type="number" min={0} step="0.01" {...numberField("targetPrice")} />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Business expectation</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField label="Expected business value (INR)" htmlFor="expectedBusinessValue" error={form.formState.errors.expectedBusinessValue?.message}>
            <Input id="expectedBusinessValue" type="number" min={0} step="0.01" {...form.register("expectedBusinessValue", { valueAsNumber: true })} />
          </FormField>
          <FormField label="Expected closing date" htmlFor="expectedClosingDate" error={form.formState.errors.expectedClosingDate?.message}>
            <Input id="expectedClosingDate" type="date" {...form.register("expectedClosingDate")} />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Follow-up</CardTitle>
        </CardHeader>
        <CardContent>
          <FormField label="Next follow-up date" htmlFor="nextFollowUpDate" error={form.formState.errors.nextFollowUpDate?.message}>
            <Input id="nextFollowUpDate" type="date" {...form.register("nextFollowUpDate")} />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <FormField label="Description" htmlFor="description">
            <Textarea id="description" rows={3} {...form.register("description")} />
          </FormField>
          <FormField label="Internal notes" htmlFor="notes">
            <Textarea id="notes" rows={3} {...form.register("notes")} />
          </FormField>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}

export const emptyLeadForm: LeadFormValues = {
  companyName: "",
  website: "",
  country: "India",
  state: "",
  contactName: "",
  contactDesignation: "",
  email: "",
  phone: "",
  alternatePhone: "",
  whatsapp: "",
  leadSource: "WEBSITE",
  leadType: "",
  assignedTo: "",
  priority: "MEDIUM",
  customerId: "",
  contactId: "",
  productInterest: "",
  dosageForm: "",
  strength: "",
  composition: "",
  expectedBusinessValue: 0,
  expectedClosingDate: "",
  nextFollowUpDate: "",
  description: "",
  notes: "",
  status: "NEW",
};
