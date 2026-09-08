"use client";

import { useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatMoney } from "@/lib/money";
import { labelForLead, PIPELINE_COLUMNS } from "@/constants/leads";
import { can } from "@/lib/rbac/can";
import { canTransition } from "@/services/leads/lead-workflow.service";
import type { AuthenticatedUser } from "@/types/rbac";
import type { CrmLead, LeadStatus } from "@/types/leads";

export function PipelineBoard({
  leads,
  user,
  onMove,
}: {
  leads: CrmLead[];
  user: AuthenticatedUser;
  onMove: (lead: CrmLead, status: LeadStatus) => void;
}) {
  const router = useRouter();
  const canDrag = can(user, "leads.change_status");
  const [dragging, setDragging] = useState<string | null>(null);

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {PIPELINE_COLUMNS.map((status) => {
        const column = leads.filter((lead) => lead.status === status);
        return (
          <section
            key={status}
            className="w-[260px] shrink-0 rounded-xl border border-border bg-muted/30"
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => {
              const lead = leads.find((item) => item.id === dragging);
              if (lead && canDrag && canTransition(lead.status, status)) {
                onMove(lead, status);
              }
              setDragging(null);
            }}
          >
            <header className="flex items-center justify-between px-3 py-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide">{labelForLead(status)}</h2>
              <span className="text-xs text-muted-foreground">{column.length}</span>
            </header>
            <div className="space-y-2 p-2 min-h-24">
              {column.length === 0 ? (
                <p className="px-2 py-6 text-center text-xs text-muted-foreground">No leads</p>
              ) : (
                column.map((lead) => (
                  <article
                    key={lead.id}
                    draggable={canDrag}
                    onDragStart={() => setDragging(lead.id)}
                    onClick={() => router.push(`/crm/leads/${lead.id}` as Route)}
                    className="cursor-pointer rounded-lg border border-border bg-card p-3 shadow-sm"
                  >
                    <p className="text-sm font-medium">{lead.companyName}</p>
                    <p className="text-xs text-muted-foreground">{lead.contactName}</p>
                    <p className="mt-1 text-xs">{lead.productInterest ?? "Product TBD"}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-1">
                      <StatusBadge value={lead.priority} />
                      <span className="text-[11px] text-muted-foreground">{formatMoney(lead.expectedBusinessValueMinor, "INR")}</span>
                    </div>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      {lead.assignedToName}
                      {lead.nextFollowUpDate ? ` · FU ${lead.nextFollowUpDate}` : ""}
                    </p>
                  </article>
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
