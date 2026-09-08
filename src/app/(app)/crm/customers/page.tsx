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
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Can } from "@/components/rbac/can";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useAuth } from "@/hooks/useAuth";
import { useCrmStore } from "@/stores/crm-store";
import { useIdentityStore } from "@/stores/identity-store";
import { exportCustomersCsv, listCustomers, updateCustomerStatus } from "@/services/crm/customer.service";
import { formatDate } from "@/lib/dates";
import { toUserMessage } from "@/lib/errors";
import { DEFAULT_PAGE_SIZE } from "@/config/app";
import {
  COUNTRY_OPTIONS,
  CUSTOMER_CATEGORY_OPTIONS,
  CUSTOMER_STATUS_OPTIONS,
  CUSTOMER_TYPE_OPTIONS,
  labelForType,
} from "@/constants/customers";
import type { CrmCustomer, CustomerStatus } from "@/types/crm";

const PAGE_SIZES = [20, 50, 100] as const;

export default function CustomersPage() {
  const router = useRouter();
  const { user } = useAuth();
  const customers = useCrmStore((state) => state.customers);
  const salesPeople = useIdentityStore((state) => state.users);
  const [draft, setDraft] = useState({
    search: "",
    customerType: "",
    customerCategory: "",
    status: "",
    country: "",
    state: "",
    assignedSalesPersonId: "",
    createdFrom: "",
    createdTo: "",
  });
  const [applied, setApplied] = useState(draft);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(DEFAULT_PAGE_SIZE as 20);
  const [sortBy, setSortBy] = useState<"companyName" | "createdAt" | "customerCode" | "status">("createdAt");
  const [statusTarget, setStatusTarget] = useState<CrmCustomer | null>(null);
  const [nextStatus, setNextStatus] = useState<CustomerStatus>("ACTIVE");

  const activeFilterCount = Object.entries(applied).filter(([key, value]) => key !== "search" && value).length;

  const result = useMemo(
    () =>
      listCustomers(
        {
          ...applied,
          page,
          pageSize,
          sortBy,
          sortDirection: sortBy === "companyName" || sortBy === "customerCode" ? "asc" : "desc",
        },
        customers,
      ),
    [customers, applied, page, pageSize, sortBy],
  );

  const columns: DataTableColumn<CrmCustomer>[] = [
    { key: "code", header: "Customer Code", render: (row) => row.customerCode },
    { key: "name", header: "Company Name", render: (row) => row.companyName },
    { key: "type", header: "Customer Type", hideOnTablet: true, render: (row) => labelForType(row.customerType) },
    { key: "contact", header: "Primary Contact", hideOnMobile: true, render: (row) => row.primaryContactName ?? "—" },
    { key: "phone", header: "Phone", hideOnTablet: true, render: (row) => row.primaryPhone ?? "—" },
    { key: "email", header: "Email", hideOnTablet: true, render: (row) => row.primaryEmail ?? "—" },
    { key: "owner", header: "Assigned Sales Person", hideOnMobile: true, render: (row) => row.assignedSalesPersonName ?? "—" },
    { key: "status", header: "Status", render: (row) => <StatusBadge value={row.status} /> },
    { key: "created", header: "Created Date", hideOnTablet: true, render: (row) => formatDate(row.createdAt) },
    {
      key: "actions",
      header: "Actions",
      hideOnMobile: true,
      render: (row) => (
        <div className="flex flex-wrap gap-1" onClick={(event) => event.stopPropagation()}>
          <Button size="sm" variant="ghost" onClick={() => router.push(`/crm/customers/${row.id}` as Route)}>View</Button>
          <Can permission="customers.update">
            <Button size="sm" variant="ghost" onClick={() => router.push(`/crm/customers/${row.id}/edit` as Route)}>Edit</Button>
          </Can>
          <Can permission="customers.change_status">
            <Button size="sm" variant="ghost" onClick={() => { setStatusTarget(row); setNextStatus(row.status); }}>
              Change Status
            </Button>
          </Can>
        </div>
      ),
    },
  ];

  function applyFilters() {
    setApplied(draft);
    setPage(1);
  }

  function clearFilters() {
    const empty = { search: draft.search, customerType: "", customerCategory: "", status: "", country: "", state: "", assignedSalesPersonId: "", createdFrom: "", createdTo: "" };
    setDraft(empty);
    setApplied(empty);
    setPage(1);
  }

  async function changeStatus() {
    if (!statusTarget || !user) return;
    try {
      await updateCustomerStatus(statusTarget.id, nextStatus, user);
      toast.success("Customer status updated");
    } catch (error) {
      toast.error(toUserMessage(error));
    } finally {
      setStatusTarget(null);
    }
  }

  function downloadCsv() {
    const csv = exportCustomersCsv(result.items);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "patri-cmo-customers.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Customers"
        description="Marketers, manufacturers, export partners and institutional accounts."
        actions={
          <>
            <Can permission="customers.export">
              <Button variant="outline" onClick={downloadCsv}>Export CSV</Button>
            </Can>
            <Can permission="customers.create">
              <Button onClick={() => router.push("/crm/customers/new" as Route)}>Add customer</Button>
            </Can>
          </>
        }
      />
      <FilterPanel>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SearchInput value={draft.search} onChange={(value) => setDraft((current) => ({ ...current, search: value }))} placeholder="Code, name, email, phone, GSTIN" />
          <Select value={draft.customerType} onChange={(event) => setDraft((current) => ({ ...current, customerType: event.target.value }))}>
            <option value="">All types</option>
            {CUSTOMER_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Select>
          <Select value={draft.customerCategory} onChange={(event) => setDraft((current) => ({ ...current, customerCategory: event.target.value }))}>
            <option value="">All categories</option>
            {CUSTOMER_CATEGORY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Select>
          <Select value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))}>
            <option value="">All statuses</option>
            {CUSTOMER_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Select>
          <Select value={draft.country} onChange={(event) => setDraft((current) => ({ ...current, country: event.target.value }))}>
            <option value="">All countries</option>
            {COUNTRY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Select>
          <Input placeholder="State" value={draft.state} onChange={(event) => setDraft((current) => ({ ...current, state: event.target.value }))} />
          <Select value={draft.assignedSalesPersonId} onChange={(event) => setDraft((current) => ({ ...current, assignedSalesPersonId: event.target.value }))}>
            <option value="">All sales people</option>
            {salesPeople.map((person) => <option key={person.id} value={person.id}>{person.displayName}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-2">
            <Input type="date" value={draft.createdFrom} onChange={(event) => setDraft((current) => ({ ...current, createdFrom: event.target.value }))} />
            <Input type="date" value={draft.createdTo} onChange={(event) => setDraft((current) => ({ ...current, createdTo: event.target.value }))} />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={applyFilters}>Apply filters</Button>
          <Button size="sm" variant="ghost" onClick={clearFilters}>Clear filters</Button>
          {activeFilterCount > 0 ? (
            <span className="text-xs text-muted-foreground">{activeFilterCount} active filter{activeFilterCount === 1 ? "" : "s"}</span>
          ) : null}
          <div className="ml-auto flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Sort</span>
            <Select value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)}>
              <option value="createdAt">Created date</option>
              <option value="companyName">Company name</option>
              <option value="customerCode">Customer code</option>
              <option value="status">Status</option>
            </Select>
            <Select value={String(pageSize)} onChange={(event) => { setPageSize(Number(event.target.value) as 20); setPage(1); }}>
              {PAGE_SIZES.map((size) => <option key={size} value={size}>{size} / page</option>)}
            </Select>
          </div>
        </div>
      </FilterPanel>
      {result.items.length === 0 ? (
        <EmptyState
          title="No customers found."
          description="Adjust filters or add a pharmaceutical account."
          action={
            <Can permission="customers.create">
              <Button onClick={() => router.push("/crm/customers/new" as Route)}>Add customer</Button>
            </Can>
          }
        />
      ) : (
        <div className="rounded-xl border border-border bg-card">
          <DataTable columns={columns} rows={result.items} onRowClick={(row) => router.push(`/crm/customers/${row.id}` as Route)} />
          <div className="border-t border-border px-4 py-3">
            <Pagination page={result.page} hasMore={result.hasMore} total={result.total} onPageChange={setPage} />
          </div>
        </div>
      )}
      {statusTarget ? (
        <ConfirmDialog
          title="Change customer status"
          description={`Update ${statusTarget.companyName}. This change is audited.`}
          confirmLabel="Update status"
          onCancel={() => setStatusTarget(null)}
          onConfirm={() => void changeStatus()}
        />
      ) : null}
      {statusTarget ? (
        <div className="fixed inset-x-0 bottom-6 z-[60] mx-auto w-full max-w-sm rounded-xl border border-border bg-card p-3 shadow-lg">
          <Select value={nextStatus} onChange={(event) => setNextStatus(event.target.value as CustomerStatus)}>
            {CUSTOMER_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </Select>
        </div>
      ) : null}
    </div>
  );
}
