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
import { EmptyState } from "@/components/shared/empty-state";
import { useAuth } from "@/hooks/useAuth";
import { useFeasibilityStore } from "@/stores/feasibility-store";
import { useIdentityStore } from "@/stores/identity-store";
import { updateFeasibility } from "@/services/feasibility/feasibility.service";
import { ENQUIRY_PRIORITY_OPTIONS } from "@/constants/enquiries";
import { toUserMessage } from "@/lib/errors";
import type { EnquiryPriority } from "@/types/enquiries";

export default function EditFeasibilityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const item = useFeasibilityStore((state) => state.assessments.find((row) => row.id === id));
  const people = useIdentityStore((state) => state.users);
  const [assignedTo, setAssignedTo] = useState(item?.assignedTo ?? "");
  const [technicalReviewer, setTechnicalReviewer] = useState(item?.technicalReviewer ?? "");
  const [priority, setPriority] = useState<EnquiryPriority>(item?.priority ?? "MEDIUM");
  const [target, setTarget] = useState(item?.targetCompletionDate ?? "");
  const [submitting, setSubmitting] = useState(false);

  if (!item) return <EmptyState title="Feasibility not found" description="This assessment is unavailable." />;
  if (!user) return null;
  const current = item;
  const actor = user;

  async function save() {
    setSubmitting(true);
    try {
      await updateFeasibility(current.id, {
        assignedTo,
        technicalReviewer,
        priority,
        targetCompletionDate: target,
      }, actor);
      toast.success("Feasibility updated");
      router.push(`/crm/feasibility/${current.id}` as Route);
    } catch (error) {
      toast.error(toUserMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title={`Edit ${current.feasibilityNumber}`} description="Owner, dates and priority only. Costing is a later phase." />
      <Card>
        <CardHeader><CardTitle>Assignment</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Select value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)}>
            {people.map((person) => <option key={person.id} value={person.id}>{person.displayName}</option>)}
          </Select>
          <Select value={technicalReviewer} onChange={(event) => setTechnicalReviewer(event.target.value)}>
            <option value="">Technical reviewer</option>
            {people.map((person) => <option key={person.id} value={person.id}>{person.displayName}</option>)}
          </Select>
          <Select value={priority} onChange={(event) => setPriority(event.target.value as EnquiryPriority)}>
            {ENQUIRY_PRIORITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Select>
          <Input type="date" value={target} onChange={(event) => setTarget(event.target.value)} />
        </CardContent>
      </Card>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.push(`/crm/feasibility/${current.id}` as Route)}>Cancel</Button>
        <Button disabled={!assignedTo || submitting} onClick={() => void save()}>{submitting ? "Saving…" : "Save"}</Button>
      </div>
    </div>
  );
}
