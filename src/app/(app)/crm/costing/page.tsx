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
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAuth } from "@/hooks/useAuth";
import { useCostingStore } from "@/stores/costing-store";
import { useIdentityStore } from "@/stores/identity-store";
import { useCrmStore } from "@/stores/crm-store";
import {
  computeCostingKpis,
  createCostingVersion,
  exportCostingsCsv,
  isCostingExpired,
  listCostings,
} from "@/services/costing/costing.service";
import { submitForApproval } from "@/services/costing/costing-approval.service";
import { formatCostingMoney } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import { toUserMessage } from "@/lib/errors";
import { DEFAULT_PAGE_SIZE } from "@/config/app";
import { can } from "@/lib/rbac/can";
import { COSTING_CURRENCY_OPTIONS, COSTING_STATUS_OPTIONS, pharmaLabel } from "@/constants/costing";
import type { CostSheet } from "@/types/costing";

const PAGE_SIZES = [20, 50, 100] as const;
const emptyFilters = { search: "", status: "", customerId: "", product: "", preparedBy: "", approvalStatus: "", currency: "", createdFrom: "", createdTo: "", validFrom: "", validTo: "" };

export default function CostingListPage() {
  const router = useRouter();
  const { user } = useAuth();
  const costings = useCostingStore((state) => state.costings);
  const people = useIdentityStore((state) => state.users);
  const customers = useCrmStore((state) => state.customers);
  const [draft, setDraft] = useState(emptyFilters);
  const [applied, setApplied] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const [cursors, setCursors] = useState<string[]>([""]);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(DEFAULT_PAGE_SIZE as 20);

  const kpis = useMemo(() => (user ? computeCostingKpis(user, costings) : null), [user, costings]);
  const result = useMemo(() => {
    if (!user) return { items: [], total: 0, page: 1, pageSize, hasMore: false, nextCursor: undefined };
    return listCostings({ ...applied, page, pageSize, cursor: cursors[page - 1] || undefined }, user, costings);
  }, [user, costings, applied, page, pageSize, cursors]);
  const activeFilterCount = Object.entries(applied).filter(([key, value]) => key !== "search" && value).length;
  const showInternal = user ? can(user, "costing.calculate") : false;

  if (!user) return null;
  const actor = user;

  const columns: DataTableColumn<CostSheet>[] = [
    { key: "number", header: "Costing Number", render: (row) => row.displayNumber },
    { key: "customer", header: "Customer", render: (row) => row.customerName },
    { key: "product", header: "Product", hideOnTablet: true, render: (row) => row.productName },
    { key: "enquiry", header: "Enquiry", hideOnMobile: true, render: (row) => row.enquiryNumber },
    { key: "version", header: "Version", render: (row) => `V${row.version}` },
    { key: "total", header: "Total Cost", hideOnMobile: true, render: (row) => showInternal ? formatCostingMoney(row.totals.totalCostMinor, row.currency) : "—" },
    { key: "price", header: "Selling Price", render: (row) => formatCostingMoney(row.totals.sellingPriceMinor, row.currency) },
    { key: "margin", header: "Margin", hideOnTablet: true, render: (row) => showInternal ? formatCostingMoney(row.totals.marginAmountMinor, row.currency) : "—" },
    { key: "status", header: "Status", render: (row) => <span className="inline-flex flex-wrap gap-1"><StatusBadge value={row.status} />{isCostingExpired(row) ? <StatusBadge value="EXPIRED" /> : null}</span> },
    { key: "prepared", header: "Prepared By", hideOnMobile: true, render: (row) => row.preparedByName },
    { key: "created", header: "Created Date", hideOnTablet: true, render: (row) => formatDate(row.createdAt) },
    {
      key: "actions",
      header: "Actions",
      hideOnMobile: true,
      render: (row) => (
        <div className="flex flex-wrap gap-1" onClick={(event) => event.stopPropagation()}>
          <Button size="sm" variant="ghost" onClick={() => router.push(`/crm/costing/${row.id}` as Route)}>View</Button>
          <Can permission="costing.update"><Button size="sm" variant="ghost" onClick={() => router.push(`/crm/costing/${row.id}/edit` as Route)}>Edit</Button></Can>
          <Can permission="costing.version"><Button size="sm" variant="ghost" onClick={async () => {
            const reason = window.prompt("Change reason");
            if (!reason) return;
            try {
              const created = await createCostingVersion(row.id, reason, actor);
              toast.success(created.displayNumber);
              router.push(`/crm/costing/${created.id}` as Route);
            } catch (error) { toast.error(toUserMessage(error)); }
          }}>Duplicate version</Button></Can>
          <Can permission="costing.submit"><Button size="sm" variant="ghost" onClick={async () => { try { await submitForApproval(row.id, actor); toast.success("Submitted"); } catch (error) { toast.error(toUserMessage(error)); } }}>Submit approval</Button></Can>
          <Can permission="costing.review"><Button size="sm" variant="ghost" onClick={() => router.push(`/crm/costing/${row.id}/approval` as Route)}>View approval</Button></Can>
        </div>
      ),
    },
  ];

  const byStatus = Object.entries(costings.reduce<Record<string, number>>((acc, item) => { acc[item.status] = (acc[item.status] ?? 0) + 1; return acc; }, {})).map(([name, value]) => ({ name: pharmaLabel(name), value }));
  const byCustomer = Object.entries(costings.reduce<Record<string, number>>((acc, item) => { acc[item.customerName] = (acc[item.customerName] ?? 0) + 1; return acc; }, {})).map(([name, value]) => ({ name, value }));
  const byProduct = Object.entries(costings.reduce<Record<string, number>>((acc, item) => { acc[item.productName] = (acc[item.productName] ?? 0) + 1; return acc; }, {})).map(([name, value]) => ({ name, value }));
  const componentDist = showInternal && costings[0] ? [
    { name: "Material", value: costings.reduce((sum, item) => sum + item.totals.materialCostMinor, 0) },
    { name: "Packaging", value: costings.reduce((sum, item) => sum + item.totals.packagingCostMinor, 0) },
    { name: "Manufacturing", value: costings.reduce((sum, item) => sum + item.totals.manufacturingCostMinor, 0) },
    { name: "Quality", value: costings.reduce((sum, item) => sum + item.totals.qualityCostMinor, 0) },
    { name: "Overhead", value: costings.reduce((sum, item) => sum + item.totals.overheadCostMinor, 0) },
  ] : [];
  const avgMargin = showInternal && costings.length
    ? Math.round(costings.reduce((sum, item) => sum + item.totals.marginAmountMinor, 0) / costings.length)
    : 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Costing"
        description="Pharmaceutical cost sheets from feasible assessments. Quotation generation is the next phase."
        actions={
          <>
            <Can permission="costing.export">
              <Button variant="outline" onClick={() => {
                const blob = new Blob([exportCostingsCsv(result.items, actor)], { type: "text/csv;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = "patri-cmo-costing.csv";
                link.click();
                URL.revokeObjectURL(url);
              }}>Export CSV</Button>
            </Can>
            <Can permission="costing.create">
              <Button onClick={() => router.push("/crm/costing/new" as Route)}>Create costing</Button>
            </Can>
          </>
        }
      />
      {kpis ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total costings" value={kpis.total} />
          <StatCard label="Draft" value={kpis.draft} />
          <StatCard label="In progress" value={kpis.inProgress} />
          <StatCard label="Approval pending" value={kpis.approvalPending} />
          <StatCard label="Approved" value={kpis.approved} />
          <StatCard label="Rejected" value={kpis.rejected} />
          <StatCard label="Expired" value={kpis.expired} />
          {showInternal ? <StatCard label="Average margin" value={formatCostingMoney(avgMargin, "INR")} /> : null}
        </div>
      ) : null}
      {costings.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card><CardHeader><CardTitle>Costing by status</CardTitle></CardHeader><CardContent className="h-56">
            <ResponsiveContainer width="100%" height="100%"><BarChart data={byStatus}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" hide={byStatus.length > 6} /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="value" fill="var(--color-primary)" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer>
          </CardContent></Card>
          <Card><CardHeader><CardTitle>Costing by customer</CardTitle></CardHeader><CardContent className="h-56">
            <ResponsiveContainer width="100%" height="100%"><BarChart data={byCustomer}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" hide /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="value" fill="var(--color-primary)" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer>
          </CardContent></Card>
          <Card><CardHeader><CardTitle>Costing by product</CardTitle></CardHeader><CardContent className="h-56">
            <ResponsiveContainer width="100%" height="100%"><BarChart data={byProduct}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" hide /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="value" fill="var(--color-primary)" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer>
          </CardContent></Card>
          {showInternal ? (
            <Card><CardHeader><CardTitle>Cost component distribution</CardTitle></CardHeader><CardContent className="h-56">
              <ResponsiveContainer width="100%" height="100%"><BarChart data={componentDist}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="value" fill="var(--color-primary)" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer>
            </CardContent></Card>
          ) : null}
        </div>
      ) : null}
      <FilterPanel>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SearchInput value={draft.search} onChange={(value) => setDraft((current) => ({ ...current, search: value }))} placeholder="Number, customer, product, enquiry, feasibility" />
          <Select value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))}><option value="">All statuses</option>{COSTING_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select>
          <Select value={draft.customerId} onChange={(event) => setDraft((current) => ({ ...current, customerId: event.target.value }))}><option value="">All customers</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.companyName}</option>)}</Select>
          <Input placeholder="Product" value={draft.product} onChange={(event) => setDraft((current) => ({ ...current, product: event.target.value }))} />
          <Select value={draft.preparedBy} onChange={(event) => setDraft((current) => ({ ...current, preparedBy: event.target.value }))}><option value="">All preparers</option>{people.map((person) => <option key={person.id} value={person.id}>{person.displayName}</option>)}</Select>
          <Select value={draft.currency} onChange={(event) => setDraft((current) => ({ ...current, currency: event.target.value }))}><option value="">All currencies</option>{COSTING_CURRENCY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select>
          <div className="grid grid-cols-2 gap-2"><Input type="date" value={draft.createdFrom} onChange={(event) => setDraft((current) => ({ ...current, createdFrom: event.target.value }))} /><Input type="date" value={draft.createdTo} onChange={(event) => setDraft((current) => ({ ...current, createdTo: event.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-2"><Input type="date" value={draft.validFrom} onChange={(event) => setDraft((current) => ({ ...current, validFrom: event.target.value }))} /><Input type="date" value={draft.validTo} onChange={(event) => setDraft((current) => ({ ...current, validTo: event.target.value }))} /></div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => { setApplied(draft); setPage(1); setCursors([""]); }}>Apply filters</Button>
          <Button size="sm" variant="ghost" onClick={() => { const next = { ...emptyFilters, search: draft.search }; setDraft(next); setApplied(next); setPage(1); setCursors([""]); }}>Clear filters</Button>
          {activeFilterCount > 0 ? <span className="text-xs text-muted-foreground">{activeFilterCount} active</span> : null}
          <Select className="ml-auto" value={String(pageSize)} onChange={(event) => { setPageSize(Number(event.target.value) as 20); setPage(1); setCursors([""]); }}>{PAGE_SIZES.map((size) => <option key={size} value={size}>{size} / page</option>)}</Select>
        </div>
      </FilterPanel>
      {result.items.length === 0 ? <EmptyState title="No costings found." description="Create a costing from an approved or feasible assessment." /> : (
        <div className="rounded-xl border border-border bg-card">
          <DataTable columns={columns} rows={result.items} onRowClick={(row) => router.push(`/crm/costing/${row.id}` as Route)} />
          <div className="border-t border-border px-4 py-3">
            <Pagination page={result.page} hasMore={result.hasMore} total={result.total} onPageChange={(nextPage) => {
              if (nextPage > page && result.nextCursor) setCursors((current) => { const copy = [...current]; copy[nextPage - 1] = result.nextCursor ?? ""; return copy; });
              setPage(nextPage);
            }} />
          </div>
        </div>
      )}
    </div>
  );
}
