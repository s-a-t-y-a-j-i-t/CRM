"use client";

import type { Route } from "next";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { useCrmStore } from "@/stores/crm-store";
import { labelForType } from "@/constants/customers";
import type { CrmContact } from "@/types/crm";

export default function ContactsDirectoryPage() {
  const router = useRouter();
  const contacts = useCrmStore((state) => state.contacts);
  const customers = useCrmStore((state) => state.customers);
  const [search, setSearch] = useState("");

  const rows = useMemo(
    () =>
      contacts.filter((contact) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return [contact.fullName, contact.email, contact.phone, contact.designation].some((value) =>
          value?.toLowerCase().includes(q),
        );
      }),
    [contacts, search],
  );

  const columns: DataTableColumn<CrmContact>[] = [
    { key: "name", header: "Name", render: (row) => row.fullName },
    { key: "customer", header: "Customer", render: (row) => customers.find((item) => item.id === row.customerId)?.companyName ?? row.customerId },
    { key: "type", header: "Type", hideOnTablet: true, render: (row) => labelForType(row.contactType) },
    { key: "email", header: "Email", hideOnMobile: true, render: (row) => row.email ?? "—" },
    { key: "phone", header: "Phone", hideOnMobile: true, render: (row) => row.phone ?? "—" },
    { key: "primary", header: "Primary", render: (row) => (row.isPrimary ? "Yes" : "—") },
    { key: "status", header: "Status", render: (row) => <StatusBadge value={row.status} /> },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Contacts" description="Directory of customer procurement, quality and commercial contacts." />
      <SearchInput value={search} onChange={setSearch} placeholder="Search contacts" />
      {rows.length === 0 ? (
        <EmptyState title="No contacts found." description="Add contacts from a customer profile." />
      ) : (
        <div className="rounded-xl border border-border bg-card">
          <DataTable
            columns={columns}
            rows={rows}
            onRowClick={(row) => router.push(`/crm/customers/${row.customerId}` as Route)}
          />
        </div>
      )}
    </div>
  );
}
