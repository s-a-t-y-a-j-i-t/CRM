"use client";

import { useMemo, useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/shared/form-field";
import { Can } from "@/components/rbac/can";
import { RequirementFields } from "@/features/enquiries/requirement-form";
import { emptyRequirementForm } from "@/services/enquiries/requirement-map";
import { ENQUIRY_PRIORITY_OPTIONS, ENQUIRY_SOURCE_OPTIONS, ENQUIRY_TYPE_OPTIONS } from "@/constants/enquiries";
import { enquiryFormSchema, type EnquiryFormValues } from "@/schemas/enquiries";
import { useIdentityStore } from "@/stores/identity-store";
import { useCrmStore } from "@/stores/crm-store";
import { listCustomers } from "@/services/crm/customer.service";
import { listContacts } from "@/services/crm/contact.service";
import { todayIso } from "@/lib/dates";
import { requirementToForm } from "@/services/enquiries/requirement-map";
import type { CrmEnquiry, ProductRequirement } from "@/types/enquiries";

export function EnquiryForm({
  defaultValues,
  submitting,
  submitLabel = "Save enquiry",
  showChangeReason,
  lockCustomer,
  sections = "all",
  onSubmit,
}: {
  defaultValues: EnquiryFormValues;
  submitting?: boolean;
  submitLabel?: string;
  showChangeReason?: boolean;
  lockCustomer?: boolean;
  sections?: "all" | "requirement";
  onSubmit: (values: EnquiryFormValues) => Promise<void>;
}) {
  const router = useRouter();
  const salesPeople = useIdentityStore((state) => state.users).filter((user) => user.status === "ACTIVE");
  const customers = useCrmStore((state) => state.customers);
  const form = useForm<EnquiryFormValues>({
    resolver: zodResolver(enquiryFormSchema),
    defaultValues,
  });
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerId, setCustomerId] = useState(defaultValues.customerId);
  const matches = useMemo(
    () => listCustomers({ search: customerQuery, pageSize: 8 }, customers).items,
    [customerQuery, customers],
  );
  const contacts = customerId ? listContacts(customerId) : [];

  return (
    <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
      {sections === "all" ? (<>
      <Card>
        <CardHeader><CardTitle>Customer</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 space-y-2">
            <FormField label="Search existing customer *" htmlFor="customerSearch" error={form.formState.errors.customerId?.message}>
              <Input id="customerSearch" placeholder="Search without loading the full customer list" value={customerQuery} disabled={lockCustomer} onChange={(event) => setCustomerQuery(event.target.value)} />
            </FormField>
            {customerQuery ? (
              <ul className="max-h-40 overflow-auto rounded-lg border border-border text-sm">
                {matches.length === 0 ? (
                  <li className="px-3 py-2 text-muted-foreground">No matching customer.</li>
                ) : (
                  matches.map((customer) => (
                    <li key={customer.id}>
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left hover:bg-muted"
                        onClick={() => {
                          form.setValue("customerId", customer.id);
                          form.setValue("contactId", "");
                          setCustomerId(customer.id);
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
                Selected: {customers.find((item) => item.id === customerId)?.companyName ?? customerId}. Contacts below belong to this customer only.
              </p>
            ) : null}
            <Can permission="customers.create">
              <Button type="button" size="sm" variant="outline" onClick={() => router.push("/crm/customers/new" as Route)}>Create customer</Button>
            </Can>
          </div>
          <FormField label="Contact *" htmlFor="contactId" error={form.formState.errors.contactId?.message}>
            <Select id="contactId" {...form.register("contactId")}>
              <option value="">Select contact</option>
              {contacts.map((contact) => (
                <option key={contact.id} value={contact.id}>{contact.fullName}</option>
              ))}
            </Select>
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Enquiry information</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField label="Enquiry source *" htmlFor="enquirySource">
            <Select id="enquirySource" {...form.register("enquirySource")}>
              {ENQUIRY_SOURCE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </Select>
          </FormField>
          <FormField label="Enquiry type *" htmlFor="enquiryType">
            <Select id="enquiryType" {...form.register("enquiryType")}>
              {ENQUIRY_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </Select>
          </FormField>
          <FormField label="Priority *" htmlFor="priority">
            <Select id="priority" {...form.register("priority")}>
              {ENQUIRY_PRIORITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </Select>
          </FormField>
          <FormField label="Assigned to *" htmlFor="assignedTo" error={form.formState.errors.assignedTo?.message}>
            <Select id="assignedTo" {...form.register("assignedTo")}>
              <option value="">Select owner</option>
              {salesPeople.map((person) => <option key={person.id} value={person.id}>{person.displayName}</option>)}
            </Select>
          </FormField>
          <FormField label="Received date" htmlFor="receivedDate">
            <Input id="receivedDate" type="date" {...form.register("receivedDate")} />
          </FormField>
          <FormField label="Expected decision date" htmlFor="expectedDecisionDate">
            <Input id="expectedDecisionDate" type="date" {...form.register("expectedDecisionDate")} />
          </FormField>
          <div className="sm:col-span-2">
            <FormField label="Description" htmlFor="description">
              <Textarea id="description" rows={3} {...form.register("description")} />
            </FormField>
          </div>
          <div className="sm:col-span-2">
            <FormField label="Internal notes" htmlFor="internalNotes">
              <Textarea id="internalNotes" rows={3} {...form.register("internalNotes")} />
            </FormField>
          </div>
        </CardContent>
      </Card>
      </>) : null}

      <RequirementFields form={form} showChangeReason={showChangeReason} />

      <div className="flex justify-end">
        <Button type="submit" disabled={submitting}>{submitting ? "Saving…" : submitLabel}</Button>
      </div>
    </form>
  );
}

export function enquiryToForm(enquiry: CrmEnquiry, requirement?: ProductRequirement | null): EnquiryFormValues {
  return {
    customerId: enquiry.customerId,
    contactId: enquiry.contactId,
    leadId: enquiry.leadId ?? "",
    enquirySource: enquiry.enquirySource,
    enquiryType: enquiry.enquiryType,
    priority: enquiry.priority,
    assignedTo: enquiry.assignedTo,
    receivedDate: enquiry.receivedDate,
    expectedDecisionDate: enquiry.expectedDecisionDate ?? "",
    description: enquiry.description ?? "",
    internalNotes: enquiry.internalNotes ?? "",
    status: enquiry.status,
    requirement: requirement ? requirementToForm(requirement) : emptyRequirementForm(),
  };
}

export const emptyEnquiryForm: EnquiryFormValues = {
  customerId: "",
  contactId: "",
  leadId: "",
  enquirySource: "EXISTING_CUSTOMER",
  enquiryType: "NEW_PRODUCT",
  priority: "MEDIUM",
  assignedTo: "",
  receivedDate: todayIso(),
  expectedDecisionDate: "",
  description: "",
  internalNotes: "",
  status: "NEW",
  requirement: emptyRequirementForm(),
};
