"use client";

import { Suspense, useMemo, useState } from "react";
import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useCostingStore } from "@/stores/costing-store";
import { useIdentityStore } from "@/stores/identity-store";
import { useCrmStore } from "@/stores/crm-store";
import { createQuotation } from "@/services/quotations/quotation.service";
import { QUOTATION_CURRENCY_OPTIONS } from "@/constants/quotations";
import { todayIso } from "@/lib/dates";
import { toUserMessage } from "@/lib/errors";

export default function NewQuotationPage() {
  return (
    <Suspense fallback={<PageHeader title="Create quotation" description="Loading…" />}>
      <NewQuotationForm />
    </Suspense>
  );
}

function NewQuotationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const costings = useCostingStore((state) => state.costings);
  const people = useIdentityStore((state) => state.users);
  const contacts = useCrmStore((state) => state.contacts);
  const approved = useMemo(() => costings.filter((item) => item.status === "APPROVED"), [costings]);
  const [costingId, setCostingId] = useState(searchParams.get("costingId") ?? "");
  const [salesOwner, setSalesOwner] = useState(user?.uid ?? "");
  const [contactId, setContactId] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [validUntil, setValidUntil] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const selected = costings.find((item) => item.id === costingId);
  const notApproved = selected && selected.status !== "APPROVED";
  const relatedContacts = contacts.filter((item) => item.customerId === selected?.customerId);

  async function submit() {
    if (!user) return;
    setSubmitting(true);
    try {
      const created = await createQuotation({
        costingId,
        contactId,
        salesOwner,
        currency: currency as "INR",
        quotationDate: todayIso(),
        validUntil,
        overrideReason,
      }, user);
      toast.success(`Quotation created · ${created.displayNumber}`);
      router.push(`/crm/quotations/${created.id}` as Route);
    } catch (error) {
      toast.error(toUserMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Create quotation" description="Numbers are assigned server-side (QUO-YYYY-00001). Approved costing prices are snapshotted." />
      <Card>
        <CardHeader><CardTitle>Source costing</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Select value={costingId} onChange={(event) => setCostingId(event.target.value)}>
            <option value="">Select costing</option>
            {costings.map((item) => <option key={item.id} value={item.id}>{item.displayNumber} · {item.customerName} · {item.status}</option>)}
          </Select>
          <Select value={salesOwner} onChange={(event) => setSalesOwner(event.target.value)}>{people.map((person) => <option key={person.id} value={person.id}>{person.displayName}</option>)}</Select>
          <Select value={contactId} onChange={(event) => setContactId(event.target.value)}>
            <option value="">Primary contact</option>
            {relatedContacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.fullName}</option>)}
          </Select>
          <Select value={currency} onChange={(event) => setCurrency(event.target.value)}>{QUOTATION_CURRENCY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select>
          <Input type="date" value={validUntil} onChange={(event) => setValidUntil(event.target.value)} />
          {notApproved ? <Input value={overrideReason} onChange={(event) => setOverrideReason(event.target.value)} placeholder="Override reason (authorized users only)" className="sm:col-span-2" /> : null}
          {selected ? <p className="text-sm text-muted-foreground sm:col-span-2">{selected.productName} · {selected.baseQuantity} {selected.quantityUnit} · {approved.length} approved costings available</p> : null}
          <Button className="sm:col-span-2" disabled={submitting || !costingId || !validUntil} onClick={() => void submit()}>Create quotation</Button>
        </CardContent>
      </Card>
    </div>
  );
}
