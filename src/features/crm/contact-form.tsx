"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/shared/form-field";
import { CONTACT_TYPE_OPTIONS } from "@/constants/customers";
import { contactFormSchema, type ContactFormValues } from "@/schemas/crm";

export function ContactForm({
  defaultValues,
  submitting,
  onSubmit,
  onCancel,
}: {
  defaultValues: ContactFormValues;
  submitting?: boolean;
  onSubmit: (values: ContactFormValues) => Promise<void>;
  onCancel: () => void;
}) {
  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues,
  });

  return (
    <form className="grid gap-4 sm:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}>
      <FormField label="First name *" htmlFor="firstName" error={form.formState.errors.firstName?.message}>
        <Input id="firstName" {...form.register("firstName")} />
      </FormField>
      <FormField label="Last name" htmlFor="lastName">
        <Input id="lastName" {...form.register("lastName")} />
      </FormField>
      <FormField label="Designation" htmlFor="designation">
        <Input id="designation" {...form.register("designation")} />
      </FormField>
      <FormField label="Department" htmlFor="department">
        <Input id="department" {...form.register("department")} />
      </FormField>
      <FormField label="Email" htmlFor="email" error={form.formState.errors.email?.message}>
        <Input id="email" type="email" {...form.register("email")} />
      </FormField>
      <FormField label="Phone" htmlFor="phone" error={form.formState.errors.phone?.message}>
        <Input id="phone" {...form.register("phone")} />
      </FormField>
      <FormField label="Alternate phone" htmlFor="alternatePhone">
        <Input id="alternatePhone" {...form.register("alternatePhone")} />
      </FormField>
      <FormField label="WhatsApp" htmlFor="whatsapp">
        <Input id="whatsapp" {...form.register("whatsapp")} />
      </FormField>
      <FormField label="Contact type *" htmlFor="contactType">
        <Select id="contactType" {...form.register("contactType")}>
          {CONTACT_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </Select>
      </FormField>
      <FormField label="Status" htmlFor="status">
        <Select id="status" {...form.register("status")}>
          <option value="ACTIVE">ACTIVE</option>
          <option value="INACTIVE">INACTIVE</option>
        </Select>
      </FormField>
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" className="size-4 accent-primary" {...form.register("isPrimary")} />
        Primary contact
      </label>
      <div className="sm:col-span-2">
        <FormField label="Notes" htmlFor="notes">
          <Textarea id="notes" rows={3} {...form.register("notes")} />
        </FormField>
      </div>
      <div className="flex justify-end gap-2 sm:col-span-2">
        <Button variant="ghost" type="button" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={submitting}>{submitting ? "Saving…" : "Save contact"}</Button>
      </div>
    </form>
  );
}

export const emptyContactForm: ContactFormValues = {
  firstName: "",
  lastName: "",
  designation: "",
  department: "",
  email: "",
  phone: "",
  alternatePhone: "",
  whatsapp: "",
  contactType: "GENERAL",
  isPrimary: false,
  status: "ACTIVE",
  notes: "",
};
