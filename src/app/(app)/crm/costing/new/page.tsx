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
import { EmptyState } from "@/components/shared/empty-state";
import { useAuth } from "@/hooks/useAuth";
import { useFeasibilityStore } from "@/stores/feasibility-store";
import { useIdentityStore } from "@/stores/identity-store";
import { createCosting } from "@/services/costing/costing.service";
import { COSTING_CURRENCY_OPTIONS } from "@/constants/costing";
import { QUANTITY_UNIT_OPTIONS } from "@/constants/pharma";
import { todayIso } from "@/lib/dates";
import { toUserMessage } from "@/lib/errors";

export default function NewCostingPage() {
  return (
    <Suspense fallback={<PageHeader title="Create costing" description="Loading…" />}>
      <NewCostingForm />
    </Suspense>
  );
}

function NewCostingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const assessments = useFeasibilityStore((state) => state.assessments);
  const people = useIdentityStore((state) => state.users);
  const eligible = useMemo(
    () => assessments.filter((item) => item.overallDecision === "FEASIBLE" || item.overallDecision === "PARTIALLY_FEASIBLE" || item.status === "FEASIBLE" || item.status === "PARTIALLY_FEASIBLE"),
    [assessments],
  );
  const [feasibilityId, setFeasibilityId] = useState(searchParams.get("feasibilityId") ?? "");
  const [assignedTo, setAssignedTo] = useState(user?.uid ?? "");
  const [currency, setCurrency] = useState("INR");
  const [quantity, setQuantity] = useState(100000);
  const [unit, setUnit] = useState("TABLETS");
  const [overrideReason, setOverrideReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const selected = assessments.find((item) => item.id === feasibilityId);
  const notEligible = selected && !eligible.some((item) => item.id === selected.id);

  async function submit() {
    if (!user) return;
    setSubmitting(true);
    try {
      const created = await createCosting({
        feasibilityId,
        assignedTo,
        currency: currency as "INR",
        costingDate: todayIso(),
        validUntil: "",
        baseQuantity: quantity,
        quantityUnit: unit as "TABLETS",
        annualQuantity: selected?.annualQuantity,
        overrideReason,
      }, user);
      toast.success(`Costing created · ${created.displayNumber}`);
      router.push(`/crm/costing/${created.id}` as Route);
    } catch (error) {
      toast.error(toUserMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Create costing" description="Numbers are assigned server-side (COST-YYYY-00001). Product master and requirement data are referenced, not copied." />
      <Card>
        <CardHeader><CardTitle>Source assessment</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Select value={feasibilityId} onChange={(event) => {
            const next = event.target.value;
            setFeasibilityId(next);
            const match = assessments.find((item) => item.id === next);
            if (match?.quantity) setQuantity(match.quantity);
          }}>
            <option value="">Select feasibility</option>
            {assessments.map((item) => <option key={item.id} value={item.id}>{item.feasibilityNumber} · {item.customerName} · {item.status}</option>)}
          </Select>
          <Select value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)}>
            <option value="">Owner</option>
            {people.map((person) => <option key={person.id} value={person.id}>{person.displayName}</option>)}
          </Select>
          <Select value={currency} onChange={(event) => setCurrency(event.target.value)}>{COSTING_CURRENCY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select>
          <Input type="number" min={1} value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} />
          <Select value={unit} onChange={(event) => setUnit(event.target.value)}>{QUANTITY_UNIT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select>
          {notEligible ? <Input className="sm:col-span-2" value={overrideReason} onChange={(event) => setOverrideReason(event.target.value)} placeholder="Authorized override reason (not-feasible assessments)" /> : null}
        </CardContent>
      </Card>
      {!feasibilityId ? <EmptyState title="Select a feasibility" description="Costing normally starts from a feasible assessment." /> : (
        <div className="flex justify-end"><Button disabled={!assignedTo || submitting} onClick={() => void submit()}>{submitting ? "Creating…" : "Create costing"}</Button></div>
      )}
    </div>
  );
}
