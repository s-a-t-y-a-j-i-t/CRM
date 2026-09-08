"use client";

import { useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/shared/status-badge";
import { PIPELINE_COLUMNS, pharmaLabel } from "@/constants/enquiries";
import { can } from "@/lib/rbac/can";
import { canTransition } from "@/services/enquiries/enquiry-workflow.service";
import { useEnquiryStore } from "@/stores/enquiry-store";
import type { AuthenticatedUser } from "@/types/rbac";
import type { CrmEnquiry, EnquiryStatus } from "@/types/enquiries";

export function EnquiryPipelineBoard({
  enquiries,
  user,
  onMove,
}: {
  enquiries: CrmEnquiry[];
  user: AuthenticatedUser;
  onMove: (enquiry: CrmEnquiry, status: EnquiryStatus) => void;
}) {
  const router = useRouter();
  const requirements = useEnquiryStore((state) => state.requirements);
  const canDrag = can(user, "enquiries.change_status");
  const [dragging, setDragging] = useState<string | null>(null);

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {PIPELINE_COLUMNS.map((status) => {
        const column = enquiries.filter((enquiry) => enquiry.status === status);
        return (
          <section
            key={status}
            className="w-[260px] shrink-0 rounded-xl border border-border bg-muted/30"
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => {
              const enquiry = enquiries.find((item) => item.id === dragging);
              if (enquiry && canDrag && canTransition(enquiry.status, status)) {
                onMove(enquiry, status);
              }
              setDragging(null);
            }}
          >
            <header className="flex items-center justify-between px-3 py-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide">{pharmaLabel(status)}</h2>
              <span className="text-xs text-muted-foreground">{column.length}</span>
            </header>
            <div className="min-h-24 space-y-2 p-2">
              {column.length === 0 ? (
                <p className="px-2 py-6 text-center text-xs text-muted-foreground">No enquiries</p>
              ) : (
                column.map((enquiry) => {
                  const requirement = requirements.find((item) => item.enquiryId === enquiry.id && item.isCurrent);
                  return (
                    <article
                      key={enquiry.id}
                      draggable={canDrag}
                      onDragStart={() => setDragging(enquiry.id)}
                      onClick={() => router.push(`/crm/enquiries/${enquiry.id}` as Route)}
                      className="cursor-pointer rounded-lg border border-border bg-card p-3 shadow-sm"
                    >
                      <p className="text-sm font-medium">{enquiry.enquiryNumber}</p>
                      <p className="text-xs text-muted-foreground">{enquiry.customerName}</p>
                      <p className="mt-1 text-xs">{requirement?.productName ?? "Requirement TBD"}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {requirement?.requiredQuantity?.toLocaleString() ?? "—"} {requirement?.quantityUnit ? pharmaLabel(requirement.quantityUnit) : ""}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-1">
                        <StatusBadge value={enquiry.priority} />
                      </div>
                      <p className="mt-2 text-[11px] text-muted-foreground">{enquiry.assignedToName}</p>
                    </article>
                  );
                })
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
