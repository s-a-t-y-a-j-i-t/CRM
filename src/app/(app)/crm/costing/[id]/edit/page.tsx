"use client";

import { use, useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/empty-state";
import { useAuth } from "@/hooks/useAuth";
import { useCostingStore } from "@/stores/costing-store";
import { useIdentityStore } from "@/stores/identity-store";
import { updateCosting } from "@/services/costing/costing.service";
import { COSTING_CURRENCY_OPTIONS } from "@/constants/costing";
import { QUANTITY_UNIT_OPTIONS } from "@/constants/pharma";
import { toUserMessage } from "@/lib/errors";
import type { QuantityUnit } from "@/constants/pharma";
import type { CostingCurrency } from "@/constants/costing";

export default function EditCostingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const item = useCostingStore((state) => state.costings.find((row) => row.id === id));
  const people = useIdentityStore((state) => state.users);
  const [assignedTo, setAssignedTo] = useState(item?.assignedTo ?? "");
  const [currency, setCurrency] = useState<CostingCurrency>(item?.currency ?? "INR");
  const [date, setDate] = useState(item?.costingDate ?? "");
  const [validUntil, setValidUntil] = useState(item?.validUntil ?? "");
  const [quantity, setQuantity] = useState(item?.baseQuantity ?? 1);
  const [unit, setUnit] = useState<QuantityUnit>(item?.quantityUnit ?? "TABLETS");
  const [remarks, setRemarks] = useState(item?.remarks ?? "");
  const [submitting, setSubmitting] = useState(false);

  if (!item) return <EmptyState title="Costing not found" description="This sheet is unavailable." />;
  if (!user) return null;
  const current = item;
  const actor = user;

  async function save() {
    setSubmitting(true);
    try {
      await updateCosting(current.id, {
        assignedTo,
        currency,
        costingDate: date,
        validUntil,
        baseQuantity: quantity,
        quantityUnit: unit,
        batchSize: current.batchSize,
        numberOfBatches: current.numberOfBatches,
        annualQuantity: current.annualQuantity,
        remarks,
        market: current.commercial.market,
        paymentTermsPlaceholder: current.commercial.paymentTermsPlaceholder,
        deliveryTermsPlaceholder: current.commercial.deliveryTermsPlaceholder,
        specialRequirement: current.commercial.specialRequirement,
        expectedYieldPercent: current.yield.expectedYieldPercent,
        materialWastagePercent: current.yield.materialWastagePercent,
        productionLossPercent: current.yield.productionLossPercent,
        packagingLossPercent: current.yield.packagingLossPercent,
      }, actor);
      toast.success("Costing updated");
      router.push(`/crm/costing/${current.id}` as Route);
    } catch (error) {
      toast.error(toUserMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title={`Edit ${current.displayNumber}`} description="Header and basis only. Approved sheets must be versioned." />
      <Card>
        <CardHeader><CardTitle>Basis</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Select value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)}>{people.map((person) => <option key={person.id} value={person.id}>{person.displayName}</option>)}</Select>
          <Select value={currency} onChange={(event) => setCurrency(event.target.value as CostingCurrency)}>{COSTING_CURRENCY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select>
          <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          <Input type="date" value={validUntil} onChange={(event) => setValidUntil(event.target.value)} />
          <Input type="number" min={1} value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} />
          <Select value={unit} onChange={(event) => setUnit(event.target.value as QuantityUnit)}>{QUANTITY_UNIT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select>
          <Textarea className="sm:col-span-2" value={remarks} onChange={(event) => setRemarks(event.target.value)} placeholder="Remarks" />
        </CardContent>
      </Card>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.push(`/crm/costing/${current.id}` as Route)}>Cancel</Button>
        <Button disabled={!assignedTo || submitting} onClick={() => void save()}>{submitting ? "Saving…" : "Save"}</Button>
      </div>
    </div>
  );
}
