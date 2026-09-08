"use client";

import { use, useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { EnquiryForm, enquiryToForm } from "@/features/enquiries/enquiry-form";
import { useAuth } from "@/hooks/useAuth";
import { useEnquiryStore } from "@/stores/enquiry-store";
import { updateRequirement } from "@/services/enquiries/product-requirement.service";
import { toUserMessage } from "@/lib/errors";
import type { EnquiryFormValues } from "@/schemas/enquiries";

export default function EditRequirementsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const enquiry = useEnquiryStore((state) => state.enquiries.find((item) => item.id === id));
  const requirement = useEnquiryStore((state) => state.requirements.find((item) => item.enquiryId === id && item.isCurrent));
  const [submitting, setSubmitting] = useState(false);

  if (!enquiry) {
    return <EmptyState title="Enquiry not found" description="This enquiry record is no longer available." />;
  }

  const current = enquiry;

  async function onSubmit(values: EnquiryFormValues) {
    if (!user) return;
    setSubmitting(true);
    try {
      await updateRequirement(current.id, values.requirement, user);
      toast.success("Requirement version created");
      router.push(`/crm/enquiries/${current.id}/requirements` as Route);
    } catch (error) {
      toast.error(toUserMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Requirement · ${enquiry.enquiryNumber}`}
        description="Saving creates a new version. Historical snapshots are not overwritten."
      />
      <EnquiryForm
        defaultValues={enquiryToForm(enquiry, requirement)}
        sections="requirement"
        showChangeReason
        submitting={submitting}
        submitLabel="Save new version"
        onSubmit={onSubmit}
      />
    </div>
  );
}
