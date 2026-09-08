"use client";

import { useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { LeadForm, emptyLeadForm } from "@/features/leads/lead-form";
import { useAuth } from "@/hooks/useAuth";
import { checkDuplicateLead, createLead } from "@/services/leads/lead.service";
import { isAppError, toUserMessage } from "@/lib/errors";
import type { LeadFormValues } from "@/schemas/leads";
import type { LeadDuplicateMatch } from "@/types/leads";

export default function NewLeadPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [pending, setPending] = useState<{ values: LeadFormValues; matches: LeadDuplicateMatch[] } | null>(null);

  async function submit(values: LeadFormValues, acknowledge = false) {
    if (!user) return;
    setSubmitting(true);
    try {
      if (!acknowledge) {
        const matches = checkDuplicateLead({
          companyName: values.companyName,
          email: values.email || undefined,
          phone: values.phone || undefined,
          productInterest: values.productInterest || undefined,
          customerId: values.customerId || undefined,
        });
        if (matches.length > 0) {
          setPending({ values, matches });
          setSubmitting(false);
          return;
        }
      }
      const created = await createLead(values, user, { acknowledgeDuplicates: acknowledge });
      toast.success(`Lead created · ${created.leadCode}`);
      router.push(`/crm/leads/${created.id}` as Route);
    } catch (error) {
      toast.error(isAppError(error) ? error.message : toUserMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="New lead" description="Lead codes are assigned server-side (LEAD-00001). Potential duplicates are flagged before save." />
      <LeadForm defaultValues={emptyLeadForm} submitting={submitting} submitLabel="Create lead" onSubmit={(values) => submit(values)} />
      {pending ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-5 shadow-xl">
            <h2 className="text-lg font-semibold">Potential duplicate lead found.</h2>
            <p className="mt-1 text-sm text-muted-foreground">Review the matches before continuing.</p>
            <ul className="mt-4 space-y-2 text-sm">
              {pending.matches.map((match) => (
                <li key={match.lead.id} className="rounded-lg border border-border p-3">
                  <p className="font-medium">{match.lead.companyName}</p>
                  <p className="text-xs text-muted-foreground">
                    {match.lead.leadCode} · {match.lead.status} · matched on {match.matchedOn.join(", ")}
                  </p>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setPending(null)}>Back to form</Button>
              <Button onClick={() => void submit(pending.values, true)}>Create anyway</Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
