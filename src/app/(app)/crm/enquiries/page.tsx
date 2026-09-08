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
import { useAuth } from "@/hooks/useAuth";
import { useEnquiryStore } from "@/stores/enquiry-store";
import { useIdentityStore } from "@/stores/identity-store";
import { useCrmStore } from "@/stores/crm-store";
import {
  assignEnquiry,
  changeEnquiryStatus,
  computeEnquiryKpis,
  exportEnquiriesCsv,
  listEnquiries,
} from "@/services/enquiries/enquiry.service";
import { formatDate } from "@/lib/dates";
import { toUserMessage } from "@/lib/errors";
import { DEFAULT_PAGE_SIZE } from "@/config/app";
import {
  ENQUIRY_PRIORITY_OPTIONS,
  ENQUIRY_SOURCE_OPTIONS,
  ENQUIRY_STATUS_OPTIONS,
  ENQUIRY_TYPE_OPTIONS,
  pharmaLabel,
} from "@/constants/enquiries";
import { DOSAGE_FORM_OPTIONS } from "@/constants/pharma";
import { COUNTRY_OPTIONS } from "@/constants/customers";
import { can } from "@/lib/rbac/can";
import { ENQUIRY_TRANSITIONS } from "@/services/enquiries/enquiry-workflow.service";
import type { CrmEnquiry, EnquiryStatus } from "@/types/enquiries";

const PAGE_SIZES = [20, 50, 100] as const;

const emptyFilters = {
  search: "",
  status: "",
  priority: "",
  enquirySource: "",
  enquiryType: "",
  assignedTo: "",
  customerId: "",
  product: "",
  dosageForm: "",
  country: "",
  receivedFrom: "",
  receivedTo: "",
  decisionFrom: "",
  decisionTo: "",
};

export default function EnquiriesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const enquiries = useEnquiryStore((state) => state.enquiries);
  const requirements = useEnquiryStore((state) => state.requirements);
  const salesPeople = useIdentityStore((state) => state.users);
  const customers = useCrmStore((state) => state.customers);
  const [draft, setDraft] = useState(emptyFilters);
  const [applied, setApplied] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const [cursors, setCursors] = useState<string[]>([""]);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(DEFAULT_PAGE_SIZE as 20);
  const [sortBy, setSortBy] = useState<"enquiryNumber" | "customerName" | "receivedDate" | "expectedDecisionDate" | "priority" | "status">("receivedDate");
  const [assignTarget, setAssignTarget] = useState<CrmEnquiry | null>(null);
  const [nextOwner, setNextOwner] = useState("");
  const [statusTarget, setStatusTarget] = useState<CrmEnquiry | null>(null);
  const [nextStatus, setNextStatus] = useState<EnquiryStatus>("UNDER_REVIEW");

  const activeFilterCount = Object.entries(applied).filter(([key, value]) => key !== "search" && value).length;
  const kpis = useMemo(() => (user ? computeEnquiryKpis(user, enquiries) : null), [user, enquiries]);

  const result = useMemo(() => {
    if (!user) return { items: [], total: 0, page: 1, pageSize, hasMore: false, nextCursor: undefined };
    return listEnquiries(
      {
        ...applied,
        page,
        pageSize,
        cursor: cursors[page - 1] || undefined,
        sortBy,
        sortDirection: sortBy === "customerName" || sortBy === "enquiryNumber" ? "asc" : "desc",
      },
      user,
      enquiries,
    );
  }, [user, enquiries, applied, page, pageSize, sortBy, cursors]);

  if (!user) return null;
  const actor = user;

  function requirementFor(enquiryId: string) {
    return requirements.find((item) => item.enquiryId === enquiryId && item.isCurrent);
  }

  const columns: DataTableColumn<CrmEnquiry>[] = [
    { key: "number", header: "Enquiry Number", render: (row) => row.enquiryNumber },
    { key: "customer", header: "Customer", render: (row) => row.customerName },
    { key: "contact", header: "Contact", hideOnMobile: true, render: (row) => row.contactName || "—" },
    { key: "product", header: "Product", hideOnTablet: true, render: (row) => requirementFor(row.id)?.productName ?? "—" },
    { key: "dosage", header: "Dosage Form", hideOnTablet: true, render: (row) => requirementFor(row.id)?.dosageForm ? pharmaLabel(requirementFor(row.id)!.dosageForm) : "—" },
    { key: "qty", header: "Required Quantity", hideOnTablet: true, render: (row) => requirementFor(row.id)?.requiredQuantity?.toLocaleString() ?? "—" },
    { key: "priority", header: "Priority", render: (row) => <StatusBadge value={row.priority} /> },
    { key: "owner", header: "Assigned To", hideOnMobile: true, render: (row) => row.assignedToName },
    { key: "status", header: "Status", render: (row) => <StatusBadge value={row.status} /> },
    { key: "received", header: "Received Date", hideOnTablet: true, render: (row) => formatDate(row.receivedDate) },
    { key: "decision", header: "Expected Decision Date", hideOnTablet: true, render: (row) => formatDate(row.expectedDecisionDate) },
    {
      key: "actions",
      header: "Actions",
      hideOnMobile: true,
      render: (row) => (
        <div className="flex flex-wrap gap-1" onClick={(event) => event.stopPropagation()}>
          <Button size="sm" variant="ghost" onClick={() => router.push(`/crm/enquiries/${row.id}` as Route)}>View</Button>
          <Can permission="enquiries.update">
            <Button size="sm" variant="ghost" onClick={() => router.push(`/crm/enquiries/${row.id}/edit` as Route)}>Edit</Button>
          </Can>
          <Can permission="enquiries.assign">
            <Button size="sm" variant="ghost" onClick={() => { setAssignTarget(row); setNextOwner(row.assignedTo); }}>Assign</Button>
          </Can>
          <Can permission="enquiries.change_status">
            <Button size="sm" variant="ghost" onClick={() => { setStatusTarget(row); setNextStatus(ENQUIRY_TRANSITIONS[row.status][0] ?? row.status); }}>Change Status</Button>
          </Can>
          <Can permission="activities.create">
            <Button size="sm" variant="ghost" onClick={() => router.push(`/crm/enquiries/${row.id}/activities` as Route)}>Add Activity</Button>
          </Can>
          <Can permission="product_requirements.update">
            <Button size="sm" variant="ghost" onClick={() => router.push(`/crm/enquiries/${row.id}/edit-requirements` as Route)}>Add Requirement</Button>
          </Can>
          <Can permission="enquiry_documents.view">
            <Button size="sm" variant="ghost" onClick={() => router.push(`/crm/enquiries/${row.id}/documents` as Route)}>Documents</Button>
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
      await assignEnquiry(assignTarget.id, nextOwner, actor);
      toast.success("Enquiry assignment updated");
    } catch (error) {
      toast.error(toUserMessage(error));
    } finally {
      setAssignTarget(null);
    }
  }

  async function confirmStatus() {
    if (!statusTarget) return;
    try {
      await changeEnquiryStatus(statusTarget.id, nextStatus, actor);
      toast.success("Enquiry status updated");
    } catch (error) {
      toast.error(toUserMessage(error));
    } finally {
      setStatusTarget(null);
    }
  }

  function downloadCsv() {
    if (!can(actor, "enquiries.export")) return;
    const csv = exportEnquiriesCsv(result.items);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "patri-cmo-enquiries.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Enquiries"
        description="Pharmaceutical product requirements from first customer request through technical review."
        actions={
          <>
            <Button variant="outline" onClick={() => router.push("/crm/enquiries/pipeline" as Route)}>Pipeline</Button>
            <Button variant="outline" onClick={() => router.push("/crm/enquiries/analytics" as Route)}>Analytics</Button>
            <Can permission="enquiries.export">
              <Button variant="outline" onClick={downloadCsv}>Export CSV</Button>
            </Can>
            <Can permission="enquiries.create">
              <Button onClick={() => router.push("/crm/enquiries/new" as Route)}>Create enquiry</Button>
            </Can>
          </>
        }
      />
      {kpis ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total enquiries" value={kpis.total} />
          <StatCard label="New" value={kpis.newer} />
          <StatCard label="Technical review" value={kpis.technicalReview} />
          <StatCard label="Won / Lost" value={`${kpis.won} / ${kpis.lost}`} />
        </div>
      ) : null}
      <FilterPanel>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SearchInput value={draft.search} onChange={(value) => setDraft((current) => ({ ...current, search: value }))} placeholder="Number, customer, contact, product, generic, brand" />
          <Select value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))}>
            <option value="">All statuses</option>
            {ENQUIRY_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Select>
          <Select value={draft.priority} onChange={(event) => setDraft((current) => ({ ...current, priority: event.target.value }))}>
            <option value="">All priorities</option>
            {ENQUIRY_PRIORITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Select>
          <Select value={draft.enquirySource} onChange={(event) => setDraft((current) => ({ ...current, enquirySource: event.target.value }))}>
            <option value="">All sources</option>
            {ENQUIRY_SOURCE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Select>
          <Select value={draft.enquiryType} onChange={(event) => setDraft((current) => ({ ...current, enquiryType: event.target.value }))}>
            <option value="">All types</option>
            {ENQUIRY_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Select>
          <Select value={draft.assignedTo} onChange={(event) => setDraft((current) => ({ ...current, assignedTo: event.target.value }))}>
            <option value="">All owners</option>
            {salesPeople.map((person) => <option key={person.id} value={person.id}>{person.displayName}</option>)}
          </Select>
          <Select value={draft.customerId} onChange={(event) => setDraft((current) => ({ ...current, customerId: event.target.value }))}>
            <option value="">All customers</option>
            {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.companyName}</option>)}
          </Select>
          <Input placeholder="Product" value={draft.product} onChange={(event) => setDraft((current) => ({ ...current, product: event.target.value }))} />
          <Select value={draft.dosageForm} onChange={(event) => setDraft((current) => ({ ...current, dosageForm: event.target.value }))}>
            <option value="">All dosage forms</option>
            {DOSAGE_FORM_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Select>
          <Select value={draft.country} onChange={(event) => setDraft((current) => ({ ...current, country: event.target.value }))}>
            <option value="">All countries</option>
            {COUNTRY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-2">
            <Input type="date" value={draft.receivedFrom} onChange={(event) => setDraft((current) => ({ ...current, receivedFrom: event.target.value }))} />
            <Input type="date" value={draft.receivedTo} onChange={(event) => setDraft((current) => ({ ...current, receivedTo: event.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input type="date" value={draft.decisionFrom} onChange={(event) => setDraft((current) => ({ ...current, decisionFrom: event.target.value }))} />
            <Input type="date" value={draft.decisionTo} onChange={(event) => setDraft((current) => ({ ...current, decisionTo: event.target.value }))} />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={applyFilters}>Apply filters</Button>
          <Button size="sm" variant="ghost" onClick={clearFilters}>Clear filters</Button>
          {activeFilterCount > 0 ? <span className="text-xs text-muted-foreground">{activeFilterCount} active filter{activeFilterCount === 1 ? "" : "s"}</span> : null}
          <div className="ml-auto flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Sort</span>
            <Select value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)}>
              <option value="receivedDate">Received date</option>
              <option value="enquiryNumber">Enquiry number</option>
              <option value="customerName">Customer</option>
              <option value="expectedDecisionDate">Expected decision</option>
              <option value="priority">Priority</option>
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
          title="No enquiries found."
          description="Adjust filters or create a product requirement enquiry."
          action={
            <Can permission="enquiries.create">
              <Button onClick={() => router.push("/crm/enquiries/new" as Route)}>Create enquiry</Button>
            </Can>
          }
        />
      ) : (
        <div className="rounded-xl border border-border bg-card">
          <DataTable columns={columns} rows={result.items} onRowClick={(row) => router.push(`/crm/enquiries/${row.id}` as Route)} />
          <div className="border-t border-border px-4 py-3">
            <Pagination page={result.page} hasMore={result.hasMore} total={result.total} onPageChange={goToPage} />
          </div>
        </div>
      )}
      {assignTarget ? (
        <>
          <ConfirmDialog
            title="Assign enquiry"
            description={`Reassign ${assignTarget.enquiryNumber}. This change is audited and the new owner is notified.`}
            confirmLabel="Assign"
            onCancel={() => setAssignTarget(null)}
            onConfirm={() => void confirmAssign()}
          />
          <div className="fixed inset-x-0 bottom-6 z-[60] mx-auto w-full max-w-sm rounded-xl border border-border bg-card p-3 shadow-lg">
            <Select value={nextOwner} onChange={(event) => setNextOwner(event.target.value)}>
              {salesPeople.map((person) => <option key={person.id} value={person.id}>{person.displayName} · {person.departmentName}</option>)}
            </Select>
          </div>
        </>
      ) : null}
      {statusTarget ? (
        <>
          <ConfirmDialog
            title="Change enquiry status"
            description="Invalid transitions are rejected by enquiry-workflow.service."
            confirmLabel="Update status"
            onCancel={() => setStatusTarget(null)}
            onConfirm={() => void confirmStatus()}
          />
          <div className="fixed inset-x-0 bottom-6 z-[60] mx-auto w-full max-w-sm rounded-xl border border-border bg-card p-3 shadow-lg">
            <Select value={nextStatus} onChange={(event) => setNextStatus(event.target.value as EnquiryStatus)}>
              {ENQUIRY_TRANSITIONS[statusTarget.status].map((status) => (
                <option key={status} value={status}>{pharmaLabel(status)}</option>
              ))}
            </Select>
          </div>
        </>
      ) : null}
    </div>
  );
}
