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
import { useEnquiryStore } from "@/stores/enquiry-store";
import { useIdentityStore } from "@/stores/identity-store";
import { getActiveFeasibilityForEnquiry, startFeasibility } from "@/services/feasibility/feasibility.service";
import { ENQUIRY_PRIORITY_OPTIONS } from "@/constants/enquiries";
import { toUserMessage } from "@/lib/errors";
import { todayIso } from "@/lib/dates";

export default function NewFeasibilityPage() {
  return (
    <Suspense fallback={<PageHeader title="Start feasibility" description="Loading…" />}>
      <NewFeasibilityForm />
    </Suspense>
  );
}

function NewFeasibilityForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const enquiries = useEnquiryStore((state) => state.enquiries);
  const requirements = useEnquiryStore((state) => state.requirements);
  const people = useIdentityStore((state) => state.users);
  const [enquiryId, setEnquiryId] = useState(searchParams.get("enquiryId") ?? "");
  const [assignedTo, setAssignedTo] = useState(user?.uid ?? "");
  const [technicalReviewer, setTechnicalReviewer] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [target, setTarget] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const eligible = useMemo(
    () => enquiries.filter((item) => requirements.some((req) => req.enquiryId === item.id && req.isCurrent)),
    [enquiries, requirements],
  );
  const existing = enquiryId ? getActiveFeasibilityForEnquiry(enquiryId) : null;

  async function submit() {
    if (!user) return;
    setSubmitting(true);
    try {
      const created = await startFeasibility({
        enquiryId,
        assignedTo,
        technicalReviewer,
        priority: priority as "LOW" | "MEDIUM" | "HIGH" | "URGENT",
        targetCompletionDate: target,
      }, user);
      toast.success(`Feasibility created · ${created.feasibilityNumber}`);
      router.push(`/crm/feasibility/${created.id}` as Route);
    } catch (error) {
      toast.error(toUserMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Start feasibility" description="One active assessment per enquiry. Numbers are assigned server-side (FEAS-YYYY-00001)." />
      <Card>
        <CardHeader><CardTitle>Enquiry context</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Select value={enquiryId} onChange={(event) => setEnquiryId(event.target.value)}>
            <option value="">Select enquiry</option>
            {eligible.map((item) => <option key={item.id} value={item.id}>{item.enquiryNumber} · {item.customerName}</option>)}
          </Select>
          <Select value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)}>
            <option value="">Owner</option>
            {people.map((person) => <option key={person.id} value={person.id}>{person.displayName}</option>)}
          </Select>
          <Select value={technicalReviewer} onChange={(event) => setTechnicalReviewer(event.target.value)}>
            <option value="">Technical reviewer</option>
            {people.map((person) => <option key={person.id} value={person.id}>{person.displayName}</option>)}
          </Select>
          <Select value={priority} onChange={(event) => setPriority(event.target.value)}>
            {ENQUIRY_PRIORITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Select>
          <Input type="date" min={todayIso()} value={target} onChange={(event) => setTarget(event.target.value)} />
        </CardContent>
      </Card>
      {existing ? (
        <EmptyState title={`Active feasibility ${existing.feasibilityNumber}`} description="A second active assessment cannot be created for this enquiry." action={<Button onClick={() => router.push(`/crm/feasibility/${existing.id}` as Route)}>Open existing</Button>} />
      ) : (
        <div className="flex justify-end"><Button disabled={!enquiryId || !assignedTo || submitting} onClick={() => void submit()}>{submitting ? "Starting…" : "Start feasibility"}</Button></div>
      )}
    </div>
  );
}
