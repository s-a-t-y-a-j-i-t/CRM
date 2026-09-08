"use client";

import type { Route } from "next";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useLeadStore } from "@/stores/lead-store";
import { visibleLeads } from "@/services/leads/lead.service";
import { formatDate } from "@/lib/dates";
import type { CrmLead } from "@/types/leads";

export default function ProspectsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const leads = useLeadStore((state) => state.leads);
  const rows = useMemo(() => {
    if (!user) return [];
    return visibleLeads(user, leads).filter((lead) => lead.status === "QUALIFIED" || lead.status === "REQUIREMENT_PENDING");
  }, [user, leads]);

  if (!user) return null;

  const columns: DataTableColumn<CrmLead>[] = [
    { key: "code", header: "Lead Code", render: (row) => row.leadCode },
    { key: "company", header: "Company", render: (row) => row.companyName },
    { key: "contact", header: "Contact", render: (row) => row.contactName },
    { key: "product", header: "Product", hideOnTablet: true, render: (row) => row.productInterest ?? "—" },
    { key: "status", header: "Status", render: (row) => <StatusBadge value={row.status} /> },
    { key: "follow", header: "Next Follow-up", hideOnMobile: true, render: (row) => formatDate(row.nextFollowUpDate) },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Prospects"
        description="Qualified and requirement-pending leads that are not yet converted customers."
        actions={<Button variant="outline" onClick={() => router.push("/crm/leads" as Route)}>All leads</Button>}
      />
      {rows.length === 0 ? (
        <EmptyState title="No prospects found." description="Qualified manufacturing leads will appear here." />
      ) : (
        <div className="rounded-xl border border-border bg-card">
          <DataTable columns={columns} rows={rows} onRowClick={(row) => router.push(`/crm/leads/${row.id}` as Route)} />
        </div>
      )}
    </div>
  );
}
