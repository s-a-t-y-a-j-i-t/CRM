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
import { useProductStore } from "@/stores/product-store";
import { changeProductStatus, exportProductsCsv, listProducts } from "@/services/products/product.service";
import { formatDate } from "@/lib/dates";
import { toUserMessage } from "@/lib/errors";
import { DEFAULT_PAGE_SIZE } from "@/config/app";
import { can } from "@/lib/rbac/can";
import { DOSAGE_FORM_OPTIONS } from "@/constants/pharma";
import { MANUFACTURING_SITE_OPTIONS, PRODUCT_CATEGORY_OPTIONS, PRODUCT_MARKET_OPTIONS, PRODUCT_STATUS_OPTIONS, pharmaLabel } from "@/constants/products";
import type { CrmProduct } from "@/types/products";
import type { ProductStatus } from "@/constants/products";

const PAGE_SIZES = [20, 50, 100] as const;
const emptyFilters = { search: "", productType: "", productCategory: "", dosageForm: "", status: "", therapeuticCategory: "", manufacturingSite: "", marketType: "" };

export default function ProductsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const products = useProductStore((state) => state.products);
  const [draft, setDraft] = useState(emptyFilters);
  const [applied, setApplied] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const [cursors, setCursors] = useState<string[]>([""]);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(DEFAULT_PAGE_SIZE as 20);
  const [statusTarget, setStatusTarget] = useState<CrmProduct | null>(null);
  const [nextStatus, setNextStatus] = useState<ProductStatus>("ACTIVE");
  const activeFilterCount = Object.entries(applied).filter(([key, value]) => key !== "search" && value).length;
  const result = useMemo(() => {
    if (!user) return { items: [], total: 0, page: 1, pageSize, hasMore: false, nextCursor: undefined };
    return listProducts({ ...applied, page, pageSize, cursor: cursors[page - 1] || undefined }, user, products);
  }, [user, products, applied, page, pageSize, cursors]);

  if (!user) return null;
  const actor = user;

  const columns: DataTableColumn<CrmProduct>[] = [
    { key: "code", header: "Product Code", render: (row) => row.productCode },
    { key: "name", header: "Product Name", render: (row) => row.productName },
    { key: "generic", header: "Generic Name", hideOnMobile: true, render: (row) => row.genericName },
    { key: "dosage", header: "Dosage Form", hideOnTablet: true, render: (row) => pharmaLabel(row.dosageForm) },
    { key: "strength", header: "Strength", hideOnTablet: true, render: (row) => `${row.strength ?? "—"} ${row.strengthUnit ?? ""}`.trim() },
    { key: "category", header: "Category", hideOnTablet: true, render: (row) => pharmaLabel(row.productCategory) },
    { key: "site", header: "Manufacturing Site", hideOnTablet: true, render: (row) => row.manufacturingSite ?? "—" },
    { key: "status", header: "Status", render: (row) => <StatusBadge value={row.status} /> },
    { key: "created", header: "Created Date", hideOnTablet: true, render: (row) => formatDate(row.createdAt) },
    {
      key: "actions",
      header: "Actions",
      hideOnMobile: true,
      render: (row) => (
        <div className="flex flex-wrap gap-1" onClick={(event) => event.stopPropagation()}>
          <Button size="sm" variant="ghost" onClick={() => router.push(`/master/products/${row.id}` as Route)}>View</Button>
          <Can permission="products.update">
            <Button size="sm" variant="ghost" onClick={() => router.push(`/master/products/${row.id}/edit` as Route)}>Edit</Button>
          </Can>
          <Can permission="products.change_status">
            <Button size="sm" variant="ghost" onClick={() => { setStatusTarget(row); setNextStatus(row.status); }}>Change Status</Button>
          </Can>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Product master"
        description="Company catalogue products. Customer requirements stay on the enquiry."
        actions={
          <>
            <Can permission="products.export">
              <Button variant="outline" onClick={() => {
                if (!can(actor, "products.export")) return;
                const blob = new Blob([exportProductsCsv(result.items)], { type: "text/csv;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = "patri-cmo-products.csv";
                link.click();
                URL.revokeObjectURL(url);
              }}>Export CSV</Button>
            </Can>
            <Can permission="products.create">
              <Button onClick={() => router.push("/master/products/new" as Route)}>Add product</Button>
            </Can>
          </>
        }
      />
      <FilterPanel>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SearchInput value={draft.search} onChange={(value) => setDraft((current) => ({ ...current, search: value }))} placeholder="Code, name, generic, brand, dosage, strength" />
          <Select value={draft.productType} onChange={(event) => setDraft((current) => ({ ...current, productType: event.target.value }))}><option value="">All types</option>{DOSAGE_FORM_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select>
          <Select value={draft.productCategory} onChange={(event) => setDraft((current) => ({ ...current, productCategory: event.target.value }))}><option value="">All categories</option>{PRODUCT_CATEGORY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select>
          <Select value={draft.dosageForm} onChange={(event) => setDraft((current) => ({ ...current, dosageForm: event.target.value }))}><option value="">All dosage forms</option>{DOSAGE_FORM_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select>
          <Select value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))}><option value="">All statuses</option>{PRODUCT_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select>
          <Input placeholder="Therapeutic category" value={draft.therapeuticCategory} onChange={(event) => setDraft((current) => ({ ...current, therapeuticCategory: event.target.value }))} />
          <Select value={draft.manufacturingSite} onChange={(event) => setDraft((current) => ({ ...current, manufacturingSite: event.target.value }))}><option value="">All sites</option>{MANUFACTURING_SITE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select>
          <Select value={draft.marketType} onChange={(event) => setDraft((current) => ({ ...current, marketType: event.target.value }))}><option value="">All markets</option>{PRODUCT_MARKET_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => { setApplied(draft); setPage(1); setCursors([""]); }}>Apply filters</Button>
          <Button size="sm" variant="ghost" onClick={() => { const next = { ...emptyFilters, search: draft.search }; setDraft(next); setApplied(next); setPage(1); setCursors([""]); }}>Clear filters</Button>
          {activeFilterCount > 0 ? <span className="text-xs text-muted-foreground">{activeFilterCount} active</span> : null}
          <Select className="ml-auto" value={String(pageSize)} onChange={(event) => { setPageSize(Number(event.target.value) as 20); setPage(1); setCursors([""]); }}>
            {PAGE_SIZES.map((size) => <option key={size} value={size}>{size} / page</option>)}
          </Select>
        </div>
      </FilterPanel>
      {result.items.length === 0 ? (
        <EmptyState title="No products found." description="Create a product master without turning a customer requirement into a catalogue item." />
      ) : (
        <div className="rounded-xl border border-border bg-card">
          <DataTable columns={columns} rows={result.items} onRowClick={(row) => router.push(`/master/products/${row.id}` as Route)} />
          <div className="border-t border-border px-4 py-3">
            <Pagination page={result.page} hasMore={result.hasMore} total={result.total} onPageChange={(nextPage) => {
              if (nextPage > page && result.nextCursor) setCursors((current) => { const copy = [...current]; copy[nextPage - 1] = result.nextCursor ?? ""; return copy; });
              setPage(nextPage);
            }} />
          </div>
        </div>
      )}
      {statusTarget ? (
        <>
          <ConfirmDialog title="Change product status" description="Status changes are audited." confirmLabel="Update" onCancel={() => setStatusTarget(null)} onConfirm={async () => {
            try {
              await changeProductStatus(statusTarget.id, nextStatus, actor);
              toast.success("Product status updated");
            } catch (error) {
              toast.error(toUserMessage(error));
            } finally {
              setStatusTarget(null);
            }
          }} />
          <div className="fixed inset-x-0 bottom-6 z-[60] mx-auto w-full max-w-sm rounded-xl border border-border bg-card p-3 shadow-lg">
            <Select value={nextStatus} onChange={(event) => setNextStatus(event.target.value as ProductStatus)}>
              {PRODUCT_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </Select>
          </div>
        </>
      ) : null}
    </div>
  );
}
