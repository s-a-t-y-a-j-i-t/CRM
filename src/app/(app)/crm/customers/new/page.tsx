"use client";

import { useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { CustomerForm, emptyCustomerForm } from "@/features/crm/customer-form";
import { useAuth } from "@/hooks/useAuth";
import { checkDuplicateCustomer, createCustomer } from "@/services/crm/customer.service";
import { toUserMessage } from "@/lib/errors";
import { isAppError } from "@/lib/errors";
import type { CustomerFormValues } from "@/schemas/crm";
import type { DuplicateMatch } from "@/types/crm";

export default function NewCustomerPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [pending, setPending] = useState<{ values: CustomerFormValues; matches: DuplicateMatch[] } | null>(null);

  async function submit(values: CustomerFormValues, acknowledge = false) {
    if (!user) return;
    setSubmitting(true);
    try {
      if (!acknowledge) {
        const matches = checkDuplicateCustomer(values);
        if (matches.length > 0) {
          setPending({ values, matches });
          setSubmitting(false);
          return;
        }
      }
      const created = await createCustomer(values, user, { acknowledgeDuplicates: acknowledge });
      toast.success(`Customer created · ${created.customerCode}`);
      router.push(`/crm/customers/${created.id}` as Route);
    } catch (error) {
      toast.error(isAppError(error) ? error.message : toUserMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="New customer" description="Customer codes are assigned on save (CUS-00001). Duplicate GSTIN, PAN, email, phone, or company name is flagged." />
      <CustomerForm defaultValues={emptyCustomerForm} submitting={submitting} onSubmit={(values) => submit(values)} />
      {pending ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-5 shadow-xl">
            <h2 className="text-lg font-semibold">Possible duplicate customer found.</h2>
            <p className="mt-1 text-sm text-muted-foreground">Review the matches before continuing.</p>
            <ul className="mt-4 space-y-2 text-sm">
              {pending.matches.map((match) => (
                <li key={match.customer.id} className="rounded-lg border border-border p-3">
                  <p className="font-medium">{match.customer.companyName}</p>
                  <p className="text-xs text-muted-foreground">{match.customer.customerCode} · matched on {match.matchedOn.join(", ")}</p>
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
