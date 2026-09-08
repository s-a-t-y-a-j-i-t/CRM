"use client";

import type { Route } from "next";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { FilterPanel } from "@/components/shared/filter-panel";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Can } from "@/components/rbac/can";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ConvertDialog } from "@/features/leads/convert-dialog";
import { useAuth } from "@/hooks/useAuth";
import { useLeadStore } from "@/stores/lead-store";
import { useIdentityStore } from "@/stores/identity-store";
import {
  assignLead,
  changeLeadStatus,
  computeLeadKpis,
  convertLead,
  exportLeadsCsv,
  listLeads,
} from "@/services/leads/lead.service";
import { formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { toUserMessage } from "@/lib/errors";
import { DEFAULT_PAGE_SIZE } from "@/config/app";
import {
  DOSAGE_FORM_OPTIONS,
  LEAD_PRIORITY_OPTIONS,
  LEAD_SOURCE_OPTIONS,
  LEAD_STATUS_OPTIONS,
  LEAD_TYPE_OPTIONS,
} from "@/constants/leads";
import { COUNTRY_OPTIONS } from "@/constants/customers";
import { can } from "@/lib/rbac/can";
import { LEAD_TRANSITIONS } from "@/services/leads/lead-workflow.service";
import type { CrmLead, LeadStatus } from "@/types/leads";
import type { LeadConvertValues } from "@/schemas/leads";

const PAGE_SIZES = [20, 50, 100] as const;

const emptyFilters = {
  search: "",
  status: "",
  priority: "",
  leadSource: "",
  leadType: "",
  assignedTo: "",
  country: "",
  product: "",
  dosageForm: "",
  createdFrom: "",
  createdTo: "",
  closingFrom: "",
  closingTo: "",
};

export default function LeadsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const leads = useLeadStore((state) => state.leads);
  const salesPeople = useIdentityStore((state) => state.users);
  const [draft, setDraft] = useState(emptyFilters);
  const [applied, setApplied] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const [cursors, setCursors] = useState<string[]>([""]);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(DEFAULT_PAGE_SIZE as 20);
  const [sortBy, setSortBy] = useState<"leadCode" | "companyName" | "createdAt" | "expectedClosingDate" | "priority" | "nextFollowUpDate" | "status">("createdAt");
  const [assignTarget, setAssignTarget] = useState<CrmLead | null>(null);
  const [nextOwner, setNextOwner] = useState("");
  const [statusTarget, setStatusTarget] = useState<CrmLead | null>(null);
  const [nextStatus, setNextStatus] = useState<LeadStatus>("CONTACTED");
  const [convertTarget, setConvertTarget] = useState<CrmLead | null>(null);

  const activeFilterCount = Object.entries(applied).filter(([key, value]) => key !== "search" && value).length;
  const kpis = useMemo(() => (user ? computeLeadKpis(user, leads) : null), [user, leads]);

  const result = useMemo(() => {
    if (!user) return { items: [], total: 0, page: 1, pageSize, hasMore: false, nextCursor: undefined };
    return listLeads(
      {
        ...applied,
        page,
        pageSize,
        cursor: cursors[page - 1] || undefined,
        sortBy,
        sortDirection: sortBy === "companyName" || sortBy === "leadCode" ? "asc" : "desc",
      },
      user,
      leads,
    );
  }, [user, leads, applied, page, pageSize, sortBy, cursors]);

  if (!user) return null;
  const actor = user;

  const columns: DataTableColumn<CrmLead>[] = [
    { key: "code", header: "Lead Code", render: (row) => row.leadCode },
    { key: "company", header: "Company", render: (row) => row.companyName },
    { key: "contact", header: "Contact", hideOnMobile: true, render: (row) => row.contactName },
    { key: "product", header: "Product Interest", hideOnTablet: true, render: (row) => row.productInterest ?? "—" },
    { key: "source", header: "Lead Source", hideOnTablet: true, render: (row) => row.leadSource.replaceAll("_", " ") },
    { key: "owner", header: "Assigned To", hideOnMobile: true, render: (row) => (
      <span className="inline-flex items-center gap-2">
        <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
          {row.assignedToName.slice(0, 2).toUpperCase()}
        </span>
        {row.assignedToName}
      </span>
    ) },
    { key: "priority", header: "Priority", render: (row) => <StatusBadge value={row.priority} /> },
    { key: "status", header: "Status", render: (row) => <StatusBadge value={row.status} /> },
    { key: "follow", header: "Next Follow-up", hideOnTablet: true, render: (row) => formatDate(row.nextFollowUpDate) },
    { key: "created", header: "Created Date", hideOnTablet: true, render: (row) => formatDate(row.createdAt) },
    {
      key: "actions",
      header: "Actions",
      hideOnMobile: true,
      render: (row) => (
        <div className="flex flex-wrap gap-1" onClick={(event) => event.stopPropagation()}>
          <Button size="sm" variant="ghost" onClick={() => router.push(`/crm/leads/${row.id}` as Route)}>View</Button>
          <Can permission="leads.update">
            <Button size="sm" variant="ghost" onClick={() => router.push(`/crm/leads/${row.id}/edit` as Route)}>Edit</Button>
          </Can>
          <Can permission="leads.assign">
            <Button size="sm" variant="ghost" onClick={() => { setAssignTarget(row); setNextOwner(row.assignedTo); }}>Assign</Button>
          </Can>
          <Can permission="leads.change_status">
            <Button size="sm" variant="ghost" onClick={() => { setStatusTarget(row); setNextStatus(LEAD_TRANSITIONS[row.status][0] ?? row.status); }}>Change Status</Button>
          </Can>
          <Can permission="activities.create">
            <Button size="sm" variant="ghost" onClick={() => router.push(`/crm/leads/${row.id}` as Route)}>Add Activity</Button>
          </Can>
          <Can permission="leads.convert">
            {row.status === "WON" && row.convertedCustomerId ? null : (
              <Button size="sm" variant="ghost" onClick={() => setConvertTarget(row)}>Convert</Button>
            )}
          </Can>
        </div>
      ),
    },
  ];

  function applyFilters() {
    setApplied(draft);
    setPage(1);
    setCursors([""]);
  }

  function clearFilters() {
    const next = { ...emptyFilters, search: draft.search };
    setDraft(next);
    setApplied(next);
    setPage(1);
    setCursors([""]);
  }

  function goToPage(nextPage: number) {
    if (nextPage > page && result.nextCursor) {
      setCursors((current) => {
        const copy = [...current];
        copy[nextPage - 1] = result.nextCursor ?? "";
        return copy;
      });
    }
    setPage(nextPage);
  }

  async function confirmAssign() {
    if (!assignTarget || !nextOwner) return;
    try {
      await assignLead(assignTarget.id, nextOwner, actor);
      toast.success("Lead assignment updated");
    } catch (error) {
      toast.error(toUserMessage(error));
    } finally {
      setAssignTarget(null);
    }
  }

  async function confirmStatus() {
    if (!statusTarget) return;
    try {
      await changeLeadStatus(statusTarget.id, nextStatus, actor);
      toast.success("Lead status updated");
    } catch (error) {
      toast.error(toUserMessage(error));
    } finally {
      setStatusTarget(null);
    }
  }

  async function confirmConvert(values: LeadConvertValues) {
    if (!convertTarget) return;
    try {
      await convertLead(convertTarget.id, values, actor);
      toast.success("Lead converted");
      setConvertTarget(null);
    } catch (error) {
      toast.error(toUserMessage(error));
    }
  }

  function downloadCsv() {
    if (!can(actor, "leads.export")) return;
    const csv = exportLeadsCsv(result.items);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "patri-cmo-leads.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Leads"
        description="Pharmaceutical manufacturing pipeline from first contact through conversion."
        actions={
          <>
            <Button variant="outline" onClick={() => router.push("/crm/leads/pipeline" as Route)}>Pipeline</Button>
            <Button variant="outline" onClick={() => router.push("/crm/leads/analytics" as Route)}>Analytics</Button>
            <Can permission="leads.export">
              <Button variant="outline" onClick={downloadCsv}>Export CSV</Button>
            </Can>
            <Can permission="leads.create">
              <Button onClick={() => router.push("/crm/leads/new" as Route)}>Add lead</Button>
            </Can>
          </>
        }
      />
      {kpis ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Open pipeline" value={formatMoney(kpis.openPipelineMinor, "INR")} />
          <StatCard label="Won value" value={formatMoney(kpis.wonValueMinor, "INR")} />
          <StatCard label="Lost value" value={formatMoney(kpis.lostValueMinor, "INR")} />
          <StatCard label="Conversion rate" value={`${kpis.conversionRate}%`} />
        </div>
      ) : null}
      <FilterPanel>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SearchInput value={draft.search} onChange={(value) => setDraft((current) => ({ ...current, search: value }))} placeholder="Code, company, contact, email, phone, product" />
          <Select value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))}>
            <option value="">All statuses</option>
            {LEAD_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Select>
          <Select value={draft.priority} onChange={(event) => setDraft((current) => ({ ...current, priority: event.target.value }))}>
            <option value="">All priorities</option>
            {LEAD_PRIORITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Select>
          <Select value={draft.leadSource} onChange={(event) => setDraft((current) => ({ ...current, leadSource: event.target.value }))}>
            <option value="">All sources</option>
            {LEAD_SOURCE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Select>
          <Select value={draft.leadType} onChange={(event) => setDraft((current) => ({ ...current, leadType: event.target.value }))}>
            <option value="">All types</option>
            {LEAD_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Select>
          <Select value={draft.assignedTo} onChange={(event) => setDraft((current) => ({ ...current, assignedTo: event.target.value }))}>
            <option value="">All sales people</option>
            {salesPeople.map((person) => <option key={person.id} value={person.id}>{person.displayName}</option>)}
          </Select>
          <Select value={draft.country} onChange={(event) => setDraft((current) => ({ ...current, country: event.target.value }))}>
            <option value="">All countries</option>
            {COUNTRY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Select>
          <Input placeholder="Product" value={draft.product} onChange={(event) => setDraft((current) => ({ ...current, product: event.target.value }))} />
          <Select value={draft.dosageForm} onChange={(event) => setDraft((current) => ({ ...current, dosageForm: event.target.value }))}>
            <option value="">All dosage forms</option>
            {DOSAGE_FORM_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-2">
            <Input type="date" value={draft.createdFrom} onChange={(event) => setDraft((current) => ({ ...current, createdFrom: event.target.value }))} />
            <Input type="date" value={draft.createdTo} onChange={(event) => setDraft((current) => ({ ...current, createdTo: event.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input type="date" value={draft.closingFrom} onChange={(event) => setDraft((current) => ({ ...current, closingFrom: event.target.value }))} />
            <Input type="date" value={draft.closingTo} onChange={(event) => setDraft((current) => ({ ...current, closingTo: event.target.value }))} />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={applyFilters}>Apply filters</Button>
          <Button size="sm" variant="ghost" onClick={clearFilters}>Clear filters</Button>
          {activeFilterCount > 0 ? <span className="text-xs text-muted-foreground">{activeFilterCount} active filter{activeFilterCount === 1 ? "" : "s"}</span> : null}
          <div className="ml-auto flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Sort</span>
            <Select value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)}>
              <option value="createdAt">Created date</option>
              <option value="leadCode">Lead code</option>
              <option value="companyName">Company name</option>
              <option value="expectedClosingDate">Expected closing</option>
              <option value="priority">Priority</option>
              <option value="nextFollowUpDate">Next follow-up</option>
              <option value="status">Status</option>
            </Select>
            <Select value={String(pageSize)} onChange={(event) => { setPageSize(Number(event.target.value) as 20); setPage(1); setCursors([""]); }}>
              {PAGE_SIZES.map((size) => <option key={size} value={size}>{size} / page</option>)}
            </Select>
          </div>
        </div>
      </FilterPanel>
      {result.items.length === 0 ? (
        <EmptyState
          title="No leads found."
          description="Adjust filters or add a manufacturing enquiry lead."
          action={
            <Can permission="leads.create">
              <Button onClick={() => router.push("/crm/leads/new" as Route)}>Add lead</Button>
            </Can>
          }
        />
      ) : (
        <div className="rounded-xl border border-border bg-card">
          <DataTable columns={columns} rows={result.items} onRowClick={(row) => router.push(`/crm/leads/${row.id}` as Route)} />
          <div className="border-t border-border px-4 py-3">
            <Pagination page={result.page} hasMore={result.hasMore} total={result.total} onPageChange={goToPage} />
          </div>
        </div>
      )}
      {assignTarget ? (
        <>
          <ConfirmDialog
            title="Assign lead"
            description={`Reassign ${assignTarget.companyName}. This change is audited and the new owner is notified.`}
            confirmLabel="Assign"
            onCancel={() => setAssignTarget(null)}
            onConfirm={() => void confirmAssign()}
          />
          <div className="fixed inset-x-0 bottom-6 z-[60] mx-auto w-full max-w-sm rounded-xl border border-border bg-card p-3 shadow-lg">
            <Select value={nextOwner} onChange={(event) => setNextOwner(event.target.value)}>
              {salesPeople.map((person) => <option key={person.id} value={person.id}>{person.displayName}</option>)}
            </Select>
          </div>
        </>
      ) : null}
      {statusTarget ? (
        <>
          <ConfirmDialog
            title="Change lead status"
            description="Invalid transitions are rejected by the workflow service."
            confirmLabel="Update status"
            onCancel={() => setStatusTarget(null)}
            onConfirm={() => void confirmStatus()}
          />
          <div className="fixed inset-x-0 bottom-6 z-[60] mx-auto w-full max-w-sm rounded-xl border border-border bg-card p-3 shadow-lg">
            <Select value={nextStatus} onChange={(event) => setNextStatus(event.target.value as LeadStatus)}>
              {LEAD_TRANSITIONS[statusTarget.status].map((status) => (
                <option key={status} value={status}>{status.replaceAll("_", " ")}</option>
              ))}
            </Select>
          </div>
        </>
      ) : null}
      {convertTarget ? (
        <ConvertDialog lead={convertTarget} onCancel={() => setConvertTarget(null)} onConfirm={(values) => void confirmConvert(values)} />
      ) : null}
    </div>
  );
}
