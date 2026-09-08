"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useCrmStore } from "@/stores/crm-store";
import { listCustomers } from "@/services/crm/customer.service";
import { listContacts } from "@/services/crm/contact.service";
import type { CrmLead } from "@/types/leads";
import type { LeadConvertValues } from "@/schemas/leads";

export function ConvertDialog({
  lead,
  onCancel,
  onConfirm,
}: {
  lead: CrmLead;
  onCancel: () => void;
  onConfirm: (values: LeadConvertValues) => void;
}) {
  const customers = useCrmStore((state) => state.customers);
  const [customerMode, setCustomerMode] = useState<"existing" | "new">(lead.customerId ? "existing" : "new");
  const [contactMode, setContactMode] = useState<"existing" | "new">(lead.contactId ? "existing" : "new");
  const [customerId, setCustomerId] = useState(lead.customerId ?? "");
  const [contactId, setContactId] = useState(lead.contactId ?? "");
  const [search, setSearch] = useState("");
  const [createEnquiry, setCreateEnquiry] = useState(true);
  const matches = useMemo(() => listCustomers({ search, pageSize: 8 }, customers).items, [search, customers]);
  const contacts = customerId ? listContacts(customerId) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div role="dialog" aria-modal="true" className="w-full max-w-lg rounded-xl border border-border bg-card p-5 shadow-xl">
        <h2 className="text-lg font-semibold">Convert lead</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {lead.leadCode} · {lead.companyName}. Conversion creates a customer, contact, and a real enquiry with a product requirement. The lead then moves to Enquiry Created.
        </p>
        <div className="mt-4 space-y-4 text-sm">
          <div>
            <p className="mb-2 font-medium">Customer</p>
            <Select value={customerMode} onChange={(event) => setCustomerMode(event.target.value as "existing" | "new")}>
              <option value="existing">Use existing customer</option>
              <option value="new">Create new customer</option>
            </Select>
            {customerMode === "existing" ? (
              <div className="mt-2 space-y-2">
                <Input placeholder="Search customers" value={search} onChange={(event) => setSearch(event.target.value)} />
                <Select value={customerId} onChange={(event) => { setCustomerId(event.target.value); setContactId(""); }}>
                  <option value="">Select customer</option>
                  {(search ? matches : customers.slice(0, 8)).map((customer) => (
                    <option key={customer.id} value={customer.id}>{customer.companyName}</option>
                  ))}
                </Select>
              </div>
            ) : (
              <p className="mt-2 text-muted-foreground">A prospect customer will be created from this lead. Duplicate customers are blocked by the existing customer service.</p>
            )}
          </div>
          <div>
            <p className="mb-2 font-medium">Contact</p>
            <Select value={contactMode} onChange={(event) => setContactMode(event.target.value as "existing" | "new")}>
              <option value="existing">Use existing contact</option>
              <option value="new">Create new contact</option>
            </Select>
            {contactMode === "existing" ? (
              <Select className="mt-2" value={contactId} onChange={(event) => setContactId(event.target.value)}>
                <option value="">Select contact</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>{contact.fullName}</option>
                ))}
              </Select>
            ) : (
              <p className="mt-2 text-muted-foreground">A contact will be created from {lead.contactName}.</p>
            )}
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={createEnquiry} onChange={(event) => setCreateEnquiry(event.target.checked)} />
            Create enquiry and transfer relevant product requirement data
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button
            onClick={() =>
              onConfirm({
                customerMode,
                customerId,
                contactMode,
                contactId,
                createEnquiry,
              })
            }
          >
            Convert
          </Button>
        </div>
      </div>
    </div>
  );
}
