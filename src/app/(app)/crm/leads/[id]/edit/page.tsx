"use client";

import { use, useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { LeadForm } from "@/features/leads/lead-form";
import { useAuth } from "@/hooks/useAuth";
import { useLeadStore } from "@/stores/lead-store";
import { fromMinorUnits } from "@/lib/money";
import { updateLead } from "@/services/leads/lead.service";
import { toUserMessage } from "@/lib/errors";
import type { LeadFormValues } from "@/schemas/leads";

export default function EditLeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const lead = useLeadStore((state) => state.leads.find((item) => item.id === id));
  const [submitting, setSubmitting] = useState(false);

  if (!lead) {
    return <EmptyState title="Lead not found" description="This lead record is no longer available." />;
  }

  const current = lead;

  async function onSubmit(values: LeadFormValues) {
    if (!user) return;
    setSubmitting(true);
    try {
      await updateLead(current.id, values, user);
      toast.success("Lead updated");
      router.push(`/crm/leads/${current.id}` as Route);
    } catch (error) {
      toast.error(toUserMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  const defaults: LeadFormValues = {
    companyName: lead.companyName,
    website: lead.website ?? "",
    country: lead.country ?? "",
    state: lead.state ?? "",
    contactName: lead.contactName,
    contactDesignation: lead.contactDesignation ?? "",
    email: lead.email ?? "",
    phone: lead.phone ?? "",
    alternatePhone: lead.alternatePhone ?? "",
    whatsapp: lead.whatsapp ?? "",
    leadSource: lead.leadSource,
    leadType: lead.leadType ?? "",
    assignedTo: lead.assignedTo,
    priority: lead.priority,
    customerId: lead.customerId ?? "",
    contactId: lead.contactId ?? "",
    productInterest: lead.productInterest ?? "",
    dosageForm: lead.dosageForm ?? "",
    strength: lead.strength ?? "",
    composition: lead.composition ?? "",
    requiredQuantity: lead.requiredQuantity,
    annualQuantity: lead.annualQuantity,
    targetPrice: lead.targetPriceMinor ? Number(fromMinorUnits(lead.targetPriceMinor, "INR")) : undefined,
    expectedBusinessValue: Number(fromMinorUnits(lead.expectedBusinessValueMinor, "INR")),
    expectedClosingDate: lead.expectedClosingDate ?? "",
    nextFollowUpDate: lead.nextFollowUpDate ?? "",
    description: lead.description ?? "",
    notes: lead.notes ?? "",
    status: lead.status,
  };

  return (
    <div className="space-y-6">
      <PageHeader title={`Edit ${lead.companyName}`} description={`${lead.leadCode} · lead code cannot be changed.`} />
      <LeadForm defaultValues={defaults} submitting={submitting} onSubmit={onSubmit} />
    </div>
  );
}
