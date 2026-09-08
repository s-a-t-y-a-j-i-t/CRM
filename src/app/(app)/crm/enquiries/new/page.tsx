"use client";

import { Suspense, useState } from "react";
import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { EnquiryForm, emptyEnquiryForm } from "@/features/enquiries/enquiry-form";
import { useAuth } from "@/hooks/useAuth";
import { createEnquiry } from "@/services/enquiries/enquiry.service";
import { toUserMessage } from "@/lib/errors";
import type { EnquiryFormValues } from "@/schemas/enquiries";

export default function NewEnquiryPage() {
  return (
    <Suspense fallback={<PageHeader title="New enquiry" description="Loading enquiry form…" />}>
      <NewEnquiryForm />
    </Suspense>
  );
}

function NewEnquiryForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const customerId = searchParams.get("customerId") ?? "";
  const contactId = searchParams.get("contactId") ?? "";
  const leadId = searchParams.get("leadId") ?? "";

  async function onSubmit(values: EnquiryFormValues) {
    if (!user) return;
    setSubmitting(true);
    try {
      const created = await createEnquiry(values, user);
      toast.success(`Enquiry created · ${created.enquiryNumber}`);
      router.push(`/crm/enquiries/${created.id}` as Route);
    } catch (error) {
      toast.error(toUserMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="New enquiry"
        description="Enquiry numbers are assigned server-side (ENQ-YYYY-00001). Customer and contact remain the source of truth."
      />
      <EnquiryForm
        defaultValues={{
          ...emptyEnquiryForm,
          customerId,
          contactId,
          leadId,
          enquirySource: leadId ? "LEAD" : customerId ? "EXISTING_CUSTOMER" : emptyEnquiryForm.enquirySource,
        }}
        lockCustomer={Boolean(customerId)}
        submitting={submitting}
        submitLabel="Create enquiry"
        onSubmit={onSubmit}
      />
    </div>
  );
}
