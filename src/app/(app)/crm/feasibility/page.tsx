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
import { StatCard } from "@/components/shared/stat-card";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Can } from "@/components/rbac/can";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAuth } from "@/hooks/useAuth";
import { useFeasibilityStore } from "@/stores/feasibility-store";
import { useIdentityStore } from "@/stores/identity-store";
import { useCrmStore } from "@/stores/crm-store";
import {
  assignFeasibility,
  changeFeasibilityStatus,
  computeFeasibilityKpis,
  exportFeasibilitiesCsv,
  isOverdue,
  listFeasibilities,
} from "@/services/feasibility/feasibility.service";
import { formatDate } from "@/lib/dates";
import { toUserMessage } from "@/lib/errors";
import { DEFAULT_PAGE_SIZE } from "@/config/app";
import { can } from "@/lib/rbac/can";
import {
  DEPARTMENT_OPTIONS,
  FEASIBILITY_DECISION_OPTIONS,
  FEASIBILITY_STATUS_OPTIONS,
  pharmaLabel,
} from "@/constants/feasibility";
import { FEASIBILITY_TRANSITIONS } from "@/services/feasibility/feasibility-workflow.service";
import { ENQUIRY_PRIORITY_OPTIONS } from "@/constants/enquiries";
import type { FeasibilityAssessment } from "@/types/feasibility";
import type { FeasibilityStatus } from "@/constants/feasibility";

const PAGE_SIZES = [20, 50, 100] as const;
const emptyFilters = { search: "", status: "", decision: "", priority: "", department: "", assignedTo: "", product: "", customerId: "", createdFrom: "", createdTo: "", targetFrom: "", targetTo: "" };

export default function FeasibilityListPage() {
  const router = useRouter();
  const { user } = useAuth();
  const assessments = useFeasibilityStore((state) => state.assessments);
  const salesPeople = useIdentityStore((state) => state.users);
  const customers = useCrmStore((state) => state.customers);
  const [draft, setDraft] = useState(emptyFilters);
  const [applied, setApplied] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const [cursors, setCursors] = useState<string[]>([""]);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(DEFAULT_PAGE_SIZE as 20);
  const [assignTarget, setAssignTarget] = useState<FeasibilityAssessment | null>(null);
  const [nextOwner, setNextOwner] = useState("");
  const [statusTarget, setStatusTarget] = useState<FeasibilityAssessment | null>(null);
  const [nextStatus, setNextStatus] = useState<FeasibilityStatus>("DOCUMENT_REVIEW");

  const kpis = useMemo(() => (user ? computeFeasibilityKpis(user, assessments) : null), [user, assessments]);
  const result = useMemo(() => {
    if (!user) return { items: [], total: 0, page: 1, pageSize, hasMore: false, nextCursor: undefined };
    return listFeasibilities({ ...applied, page, pageSize, cursor: cursors[page - 1] || undefined }, user, assessments);
  }, [user, assessments, applied, page, pageSize, cursors]);
  const activeFilterCount = Object.entries(applied).filter(([key, value]) => key !== "search" && value).length;

  if (!user) return null;
  const actor = user;

  const columns: DataTableColumn<FeasibilityAssessment>[] = [
    { key: "number", header: "Feasibility Number", render: (row) => row.feasibilityNumber },
    { key: "enquiry", header: "Enquiry", hideOnMobile: true, render: (row) => row.enquiryNumber },
    { key: "customer", header: "Customer", render: (row) => row.customerName },
    { key: "product", header: "Product", hideOnTablet: true, render: (row) => row.productName },
    { key: "owner", header: "Assigned User", hideOnMobile: true, render: (row) => row.assignedToName },
    { key: "priority", header: "Priority", render: (row) => <StatusBadge value={row.priority} /> },
    { key: "status", header: "Status", render: (row) => <span className="inline-flex flex-wrap items-center gap-1"><StatusBadge value={row.status} />{isOverdue(row) ? <StatusBadge value="OVERDUE" /> : null}</span> },
    { key: "target", header: "Target Completion", hideOnTablet: true, render: (row) => formatDate(row.targetCompletionDate) },
    { key: "decision", header: "Decision", hideOnTablet: true, render: (row) => row.overallDecision ? <StatusBadge value={row.overallDecision} /> : "—" },
    { key: "created", header: "Created Date", hideOnTablet: true, render: (row) => formatDate(row.createdAt) },
    {
      key: "actions",
      header: "Actions",
      hideOnMobile: true,
      render: (row) => (
        <div className="flex flex-wrap gap-1" onClick={(event) => event.stopPropagation()}>
          <Button size="sm" variant="ghost" onClick={() => router.push(`/crm/feasibility/${row.id}` as Route)}>View</Button>
          <Can permission="feasibility.assign"><Button size="sm" variant="ghost" onClick={() => { setAssignTarget(row); setNextOwner(row.assignedTo); }}>Assign</Button></Can>
          <Can permission="feasibility.review"><Button size="sm" variant="ghost" onClick={() => router.push(`/crm/feasibility/${row.id}/review` as Route)}>Review</Button></Can>
          <Can permission="feasibility.change_status"><Button size="sm" variant="ghost" onClick={() => { setStatusTarget(row); setNextStatus(FEASIBILITY_TRANSITIONS[row.status][0] ?? row.status); }}>Change Status</Button></Can>
        </div>
      ),
    },
  ];

  const byStatus = Object.entries(assessments.reduce<Record<string, number>>((acc, item) => { acc[item.status] = (acc[item.status] ?? 0) + 1; return acc; }, {})).map(([name, value]) => ({ name: pharmaLabel(name), value }));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Feasibility"
        description="Technical evaluation from enquiry requirement through a controlled decision. Costing is a later phase."
        actions={
          <>
            <Can permission="feasibility.export">
              <Button variant="outline" onClick={() => {
                if (!can(actor, "feasibility.export")) return;
                const blob = new Blob([exportFeasibilitiesCsv(result.items)], { type: "text/csv;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = "patri-cmo-feasibility.csv";
                link.click();
                URL.revokeObjectURL(url);
              }}>Export CSV</Button>
            </Can>
            <Can permission="feasibility.create">
              <Button onClick={() => router.push("/crm/feasibility/new" as Route)}>Start feasibility</Button>
            </Can>
          </>
        }
      />
      {kpis ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard label="Total feasibilities" value={kpis.total} />
          <StatCard label="Pending review" value={kpis.pendingReview} />
          <StatCard label="Under evaluation" value={kpis.underEvaluation} />
          <StatCard label="Clarification required" value={kpis.clarificationRequired} />
          <StatCard label="Approval pending" value={kpis.approvalPending} />
          <StatCard label="Feasible" value={kpis.feasible} />
          <StatCard label="Partially feasible" value={kpis.partiallyFeasible} />
          <StatCard label="Not feasible" value={kpis.notFeasible} />
          <StatCard label="Overdue" value={kpis.overdue} />
        </div>
      ) : null}
      {assessments.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card><CardHeader><CardTitle>Feasibility by status</CardTitle></CardHeader><CardContent className="h-56">
            <ResponsiveContainer width="100%" height="100%"><BarChart data={byStatus}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" hide={byStatus.length > 6} /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="value" fill="var(--color-primary)" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer>
          </CardContent></Card>
          <Card><CardHeader><CardTitle>Feasibility by customer</CardTitle></CardHeader><CardContent className="h-56">
            <ResponsiveContainer width="100%" height="100%"><BarChart data={Object.entries(assessments.reduce<Record<string, number>>((acc, item) => { acc[item.customerName] = (acc[item.customerName] ?? 0) + 1; return acc; }, {})).map(([name, value]) => ({ name, value }))}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" hide /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="value" fill="var(--color-primary)" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer>
          </CardContent></Card>
        </div>
      ) : null}
      <FilterPanel>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SearchInput value={draft.search} onChange={(value) => setDraft((current) => ({ ...current, search: value }))} placeholder="Number, enquiry, customer, product, generic" />
          <Select value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))}><option value="">All statuses</option>{FEASIBILITY_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select>
          <Select value={draft.decision} onChange={(event) => setDraft((current) => ({ ...current, decision: event.target.value }))}><option value="">All decisions</option>{FEASIBILITY_DECISION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select>
          <Select value={draft.priority} onChange={(event) => setDraft((current) => ({ ...current, priority: event.target.value }))}><option value="">All priorities</option>{ENQUIRY_PRIORITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select>
          <Select value={draft.department} onChange={(event) => setDraft((current) => ({ ...current, department: event.target.value }))}><option value="">All departments</option>{DEPARTMENT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select>
          <Select value={draft.assignedTo} onChange={(event) => setDraft((current) => ({ ...current, assignedTo: event.target.value }))}><option value="">All owners</option>{salesPeople.map((person) => <option key={person.id} value={person.id}>{person.displayName}</option>)}</Select>
          <Select value={draft.customerId} onChange={(event) => setDraft((current) => ({ ...current, customerId: event.target.value }))}><option value="">All customers</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.companyName}</option>)}</Select>
          <Input placeholder="Product" value={draft.product} onChange={(event) => setDraft((current) => ({ ...current, product: event.target.value }))} />
          <div className="grid grid-cols-2 gap-2"><Input type="date" value={draft.createdFrom} onChange={(event) => setDraft((current) => ({ ...current, createdFrom: event.target.value }))} /><Input type="date" value={draft.createdTo} onChange={(event) => setDraft((current) => ({ ...current, createdTo: event.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-2"><Input type="date" value={draft.targetFrom} onChange={(event) => setDraft((current) => ({ ...current, targetFrom: event.target.value }))} /><Input type="date" value={draft.targetTo} onChange={(event) => setDraft((current) => ({ ...current, targetTo: event.target.value }))} /></div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => { setApplied(draft); setPage(1); setCursors([""]); }}>Apply filters</Button>
          <Button size="sm" variant="ghost" onClick={() => { const next = { ...emptyFilters, search: draft.search }; setDraft(next); setApplied(next); setPage(1); setCursors([""]); }}>Clear filters</Button>
          {activeFilterCount > 0 ? <span className="text-xs text-muted-foreground">{activeFilterCount} active</span> : null}
          <Select className="ml-auto" value={String(pageSize)} onChange={(event) => { setPageSize(Number(event.target.value) as 20); setPage(1); setCursors([""]); }}>{PAGE_SIZES.map((size) => <option key={size} value={size}>{size} / page</option>)}</Select>
        </div>
      </FilterPanel>
      {result.items.length === 0 ? <EmptyState title="No feasibilities found." description="Start from an enquiry that already has a product requirement." /> : (
        <div className="rounded-xl border border-border bg-card">
          <DataTable columns={columns} rows={result.items} onRowClick={(row) => router.push(`/crm/feasibility/${row.id}` as Route)} />
          <div className="border-t border-border px-4 py-3">
            <Pagination page={result.page} hasMore={result.hasMore} total={result.total} onPageChange={(nextPage) => {
              if (nextPage > page && result.nextCursor) setCursors((current) => { const copy = [...current]; copy[nextPage - 1] = result.nextCursor ?? ""; return copy; });
              setPage(nextPage);
            }} />
          </div>
        </div>
      )}
      {assignTarget ? (
        <>
          <ConfirmDialog title="Assign feasibility" description="Owner, technical reviewer and department reviewers are notified." confirmLabel="Assign" onCancel={() => setAssignTarget(null)} onConfirm={async () => {
            try { await assignFeasibility(assignTarget.id, nextOwner, actor); toast.success("Assigned"); } catch (error) { toast.error(toUserMessage(error)); } finally { setAssignTarget(null); }
          }} />
          <div className="fixed inset-x-0 bottom-6 z-[60] mx-auto w-full max-w-sm rounded-xl border border-border bg-card p-3 shadow-lg">
            <Select value={nextOwner} onChange={(event) => setNextOwner(event.target.value)}>{salesPeople.map((person) => <option key={person.id} value={person.id}>{person.displayName}</option>)}</Select>
          </div>
        </>
      ) : null}
      {statusTarget ? (
        <>
          <ConfirmDialog title="Change status" description="Transitions are validated by feasibility-workflow.service." confirmLabel="Update" onCancel={() => setStatusTarget(null)} onConfirm={async () => {
            try { await changeFeasibilityStatus(statusTarget.id, nextStatus, actor); toast.success("Status updated"); } catch (error) { toast.error(toUserMessage(error)); } finally { setStatusTarget(null); }
          }} />
          <div className="fixed inset-x-0 bottom-6 z-[60] mx-auto w-full max-w-sm rounded-xl border border-border bg-card p-3 shadow-lg">
            <Select value={nextStatus} onChange={(event) => setNextStatus(event.target.value as FeasibilityStatus)}>
              {FEASIBILITY_TRANSITIONS[statusTarget.status].map((status) => <option key={status} value={status}>{pharmaLabel(status)}</option>)}
            </Select>
          </div>
        </>
      ) : null}
    </div>
  );
}
