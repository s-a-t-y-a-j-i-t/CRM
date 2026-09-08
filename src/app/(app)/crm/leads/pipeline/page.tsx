"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { PipelineBoard } from "@/features/leads/pipeline-board";
import { useAuth } from "@/hooks/useAuth";
import { useLeadStore } from "@/stores/lead-store";
import { changeLeadStatus, visibleLeads } from "@/services/leads/lead.service";
import { toUserMessage } from "@/lib/errors";
import type { CrmLead, LeadStatus } from "@/types/leads";

export default function LeadPipelinePage() {
  const router = useRouter();
  const { user } = useAuth();
  const leads = useLeadStore((state) => state.leads);
  if (!user) return null;
  const actor = user;
  const scoped = visibleLeads(actor, leads);

  async function onMove(lead: CrmLead, status: LeadStatus) {
    try {
      await changeLeadStatus(lead.id, status, actor);
      toast.success(`${lead.leadCode} moved to ${status.replaceAll("_", " ")}`);
    } catch (error) {
      toast.error(toUserMessage(error));
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Lead pipeline"
        description="Drag a card only if you can change status. Invalid transitions are rejected."
        actions={<Button variant="outline" onClick={() => router.push("/crm/leads" as Route)}>Table view</Button>}
      />
      {scoped.length === 0 ? (
        <EmptyState title="No leads found." description="Create a lead to populate the kanban board." />
      ) : (
        <PipelineBoard leads={scoped} user={actor} onMove={(lead, status) => void onMove(lead, status)} />
      )}
    </div>
  );
}
