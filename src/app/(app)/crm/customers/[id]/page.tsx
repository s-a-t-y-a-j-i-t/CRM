"use client";

import { use, useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { Building2, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { StatCard } from "@/components/shared/stat-card";
import { Timeline, TimelineItem } from "@/components/shared/timeline";
import { FileUpload } from "@/components/shared/file-upload";
import { Can } from "@/components/rbac/can";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ContactForm, emptyContactForm } from "@/features/crm/contact-form";
import { useAuth } from "@/hooks/useAuth";
import { useCrmStore } from "@/stores/crm-store";
import { archiveCustomer, emptyCustomerKpis, updateCustomerStatus } from "@/services/crm/customer.service";
import { getCustomerEnquiries } from "@/services/enquiries/enquiry.service";
import { getCustomerFeasibilities } from "@/services/feasibility/feasibility.service";
import { useCostingStore } from "@/stores/costing-store";
import { useQuotationStore } from "@/stores/quotation-store";
import { formatCostingMoney } from "@/lib/money";
import { can } from "@/lib/rbac/can";
import { useEnquiryStore } from "@/stores/enquiry-store";
import { useProductStore } from "@/stores/product-store";
import { createContact, deactivateContact, setPrimaryContact, updateContact } from "@/services/crm/contact.service";
import { createCustomerActivity, createCustomerNote, listCustomerActivities, listCustomerAudit, listCustomerNotes } from "@/services/crm/customer-activity.service";
import { listCustomerDocuments, uploadCustomerDocument } from "@/services/crm/customer-document.service";
import { formatDate, formatDateTime } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { toUserMessage } from "@/lib/errors";
import { CUSTOMER_STATUS_OPTIONS, labelForType } from "@/constants/customers";
import type { ContactFormValues } from "@/schemas/crm";
import type { CrmContact, CustomerStatus } from "@/types/crm";

const TABS = [
  "Overview",
  "Contacts",
  "Products",
  "Enquiries",
  "Feasibilities",
  "Costings",
  "Quotations",
  "Orders",
  "Manufacturing",
  "Invoices",
  "Payments",
  "Complaints",
  "Documents",
  "Activities",
] as const;

const FUTURE: Partial<Record<(typeof TABS)[number], string>> = {
  Orders: "Purchase orders will appear here once the Order module is enabled.",
  Manufacturing: "Manufacturing orders and batches will appear here in a later phase.",
  Invoices: "Invoices will appear here once Finance is enabled.",
  Payments: "Payments will appear here once Finance is enabled.",
  Complaints: "Complaints will appear here once Quality is enabled.",
};

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const customer = useCrmStore((state) => state.customers.find((item) => item.id === id));
  const contacts = useCrmStore((state) => state.contacts.filter((item) => item.customerId === id));
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");
  const [contactOpen, setContactOpen] = useState<"create" | CrmContact | "view" | null>(null);
  const [viewing, setViewing] = useState<CrmContact | null>(null);
  const [statusOpen, setStatusOpen] = useState(false);
  const [nextStatus, setNextStatus] = useState<CustomerStatus>("ACTIVE");
  const [note, setNote] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const customerEnquiries = user ? getCustomerEnquiries(id, user) : [];
  const customerFeasibilities = user && can(user, "feasibility.view") ? getCustomerFeasibilities(id, user) : [];
  const customerCostings = useCostingStore((state) => state.costings.filter((item) => item.customerId === id));
  const customerQuotations = useQuotationStore((state) => state.quotations.filter((item) => item.customerId === id));
  const linkedProducts = useProductStore((state) => {
    const enquiryIds = useEnquiryStore.getState().enquiries.filter((item) => item.customerId === id).map((item) => item.id);
    const masterIds = useEnquiryStore.getState().requirements
      .filter((item) => enquiryIds.includes(item.enquiryId) && !!item.productMasterId)
      .map((item) => item.productMasterId as string);
    return state.products.filter((product) => masterIds.includes(product.id));
  });
  const kpis = { ...emptyCustomerKpis(), totalEnquiries: customerEnquiries.length };
  const activities = listCustomerActivities(id);
  const notes = listCustomerNotes(id);
  const documents = listCustomerDocuments(id);
  const audit = listCustomerAudit(id);

  if (!customer) {
    return <EmptyState title="Customer not found" description="This customer record is unavailable." />;
  }

  const current = customer;

  async function saveContact(values: ContactFormValues) {
    if (!user) return;
    try {
      if (contactOpen && contactOpen !== "create" && contactOpen !== "view") {
        await updateContact(contactOpen.id, values, user);
        toast.success("Contact updated");
      } else {
        await createContact(current.id, values, user);
        toast.success("Contact added");
      }
      setContactOpen(null);
    } catch (error) {
      toast.error(toUserMessage(error));
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Building2 className="size-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight">{customer.companyName}</h1>
                <StatusBadge value={customer.status} />
                {customer.isDemoData ? <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Demo</span> : null}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {customer.customerCode} · {labelForType(customer.customerType)}
                {customer.customerCategory ? ` · ${labelForType(customer.customerCategory)}` : ""}
              </p>
              <p className="mt-2 text-sm">
                {customer.assignedSalesPersonName ?? "Unassigned"} · {customer.primaryContactName ?? "No primary contact"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Can permission="customers.update">
              <Button onClick={() => router.push(`/crm/customers/${customer.id}/edit` as Route)}>Edit</Button>
            </Can>
            <Can permission="customers.change_status">
              <Button variant="outline" onClick={() => { setNextStatus(customer.status); setStatusOpen(true); }}>Change status</Button>
            </Can>
            <Can permission="enquiries.create">
              <Button variant="outline" onClick={() => router.push(`/crm/enquiries/new?customerId=${customer.id}` as Route)}>Create Enquiry</Button>
            </Can>
            <Can permission="contacts.create">
              <Button variant="outline" onClick={() => setContactOpen("create")}>Add contact</Button>
            </Can>
            <Can permission="customer_notes.create">
              <Button variant="outline" onClick={() => setTab("Overview")}>Add note</Button>
            </Can>
            <div className="relative">
              <Button variant="ghost" size="icon" aria-label="More actions" onClick={() => setMoreOpen((value) => !value)}>
                <MoreHorizontal />
              </Button>
              {moreOpen ? (
                <div className="absolute right-0 z-20 mt-1 w-44 rounded-md border border-border bg-card p-1 shadow-lg">
                  <Can permission="customers.delete">
                    <button type="button" className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted" onClick={() => { setMoreOpen(false); setArchiveOpen(true); }}>
                      Archive customer
                    </button>
                  </Can>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard label="Total Enquiries" value={kpis.totalEnquiries} />
        <StatCard label="Total Quotations" value={kpis.totalQuotations} />
        <StatCard label="Total Orders" value={kpis.totalOrders} />
        <StatCard label="Total Revenue" value={formatMoney(kpis.totalRevenueMinor, customer.currency)} />
        <StatCard label="Outstanding" value={formatMoney(kpis.outstandingMinor, customer.currency)} />
        <StatCard label="Open Complaints" value={kpis.openComplaints} />
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-border pb-px">
        {TABS.map((item) => (
          <button
            key={item}
            type="button"
            className={`shrink-0 rounded-t-md px-3 py-2 text-sm ${tab === item ? "bg-card font-medium text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => setTab(item)}
          >
            {item}
          </button>
        ))}
      </div>

      {tab === "Overview" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <InfoCard title="Customer information" rows={[
            ["Legal name", customer.legalName],
            ["Short name", customer.shortName],
            ["Website", customer.website],
            ["Customer since", formatDate(customer.customerSince)],
          ]} />
          <InfoCard title="Contact information" rows={[
            ["Email", customer.primaryEmail],
            ["Phone", customer.primaryPhone],
            ["Alternate phone", customer.alternatePhone],
          ]} />
          <InfoCard title="Address" rows={[
            ["Billing", customer.billingAddress],
            ["Shipping", customer.shippingAddress],
            ["City / State", [customer.city, customer.state].filter(Boolean).join(", ")],
            ["Country", customer.country],
          ]} />
          <InfoCard title="Business information" rows={[
            ["GSTIN", customer.gstin],
            ["PAN", customer.pan],
            ["Drug license", customer.drugLicenseNumber],
            ["License expiry", formatDate(customer.licenseExpiryDate)],
            ["Payment terms", customer.paymentTerms],
            ["Credit limit", formatMoney(customer.creditLimitMinor, customer.currency)],
          ]} />
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {customer.notes ? <p className="text-sm">{customer.notes}</p> : <p className="text-sm text-muted-foreground">No account-level notes.</p>}
              <Can permission="customer_notes.create">
                <div className="space-y-2">
                  <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add an internal note…" />
                  <Button
                    size="sm"
                    disabled={!note.trim()}
                    onClick={async () => {
                      if (!user) return;
                      try {
                        await createCustomerNote(customer.id, note, user);
                        setNote("");
                        toast.success("Note added");
                      } catch (error) {
                        toast.error(toUserMessage(error));
                      }
                    }}
                  >
                    Add note
                  </Button>
                </div>
              </Can>
              {notes.length === 0 ? null : (
                <ul className="space-y-2 text-sm">
                  {notes.map((item) => (
                    <li key={item.id} className="rounded-lg border border-border p-3">
                      <p>{item.text}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{item.createdByName} · {formatDateTime(item.createdAt)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {tab === "Contacts" ? (
        contacts.length === 0 ? (
          <EmptyState
            title="No contacts have been added to this customer."
            description="Add a procurement, QA, or finance contact to start correspondence."
            action={
              <Can permission="contacts.create">
                <Button onClick={() => setContactOpen("create")}>Add contact</Button>
              </Can>
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  {["Name", "Designation", "Department", "Type", "Email", "Phone", "WhatsApp", "Primary", "Status", "Actions"].map((header) => (
                    <th key={header} className="px-3 py-2">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {contacts.map((contact) => (
                  <tr key={contact.id} className="border-t border-border">
                    <td className="px-3 py-2 font-medium">{contact.fullName}</td>
                    <td className="px-3 py-2">{contact.designation ?? "—"}</td>
                    <td className="px-3 py-2">{contact.department ?? "—"}</td>
                    <td className="px-3 py-2">{labelForType(contact.contactType)}</td>
                    <td className="px-3 py-2">{contact.email ?? "—"}</td>
                    <td className="px-3 py-2">{contact.phone ?? "—"}</td>
                    <td className="px-3 py-2">{contact.whatsapp ?? "—"}</td>
                    <td className="px-3 py-2">{contact.isPrimary ? "Yes" : "—"}</td>
                    <td className="px-3 py-2"><StatusBadge value={contact.status} /></td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setViewing(contact)}>View</Button>
                        <Can permission="contacts.update">
                          <Button size="sm" variant="ghost" onClick={() => setContactOpen(contact)}>Edit</Button>
                          {contact.isPrimary ? null : (
                            <Button size="sm" variant="ghost" onClick={async () => {
                              if (!user) return;
                              try {
                                await setPrimaryContact(contact.id, user);
                                toast.success("Primary contact updated");
                              } catch (error) {
                                toast.error(toUserMessage(error));
                              }
                            }}>Set primary</Button>
                          )}
                        </Can>
                        <Can permission="contacts.change_status">
                          {contact.status === "ACTIVE" ? (
                            <Button size="sm" variant="ghost" onClick={async () => {
                              if (!user) return;
                              try {
                                await deactivateContact(contact.id, user);
                                toast.success("Contact deactivated");
                              } catch (error) {
                                toast.error(toUserMessage(error));
                              }
                            }}>Deactivate</Button>
                          ) : null}
                        </Can>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : null}

      {tab === "Documents" ? (
        <Card>
          <CardHeader>
            <CardTitle>Documents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Can permission="customer_documents.upload">
              <FileUpload
                label="Upload document"
                onFile={async (file) => {
                  if (!user) return;
                  try {
                    await uploadCustomerDocument(customer.id, file, user);
                    toast.success("Document recorded");
                  } catch (error) {
                    toast.error(toUserMessage(error));
                  }
                }}
              />
            </Can>
            {documents.length === 0 ? (
              <EmptyState title="No documents uploaded." description="Regulatory document control ships in a later phase. This list stores file metadata only." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      {["Document Name", "Type", "Version", "Uploaded By", "Uploaded Date", "Status"].map((header) => (
                        <th key={header} className="py-2">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map((doc) => (
                      <tr key={doc.id} className="border-t border-border">
                        <td className="py-2">{doc.name}</td>
                        <td>{doc.type}</td>
                        <td>{doc.version}</td>
                        <td>{doc.uploadedByName}</td>
                        <td>{formatDateTime(doc.uploadedAt)}</td>
                        <td><StatusBadge value={doc.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {tab === "Activities" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              {activities.length === 0 && audit.length === 0 ? (
                <EmptyState title="No activities recorded yet." description="Calls, meetings, notes and status changes will appear here." />
              ) : (
                <Timeline>
                  {activities.map((item) => (
                    <TimelineItem key={item.id} title={item.subject} meta={`${item.type} · ${item.createdByName} · ${formatDateTime(item.activityDate)}`}>
                      {item.description ? <p className="text-xs text-muted-foreground">{item.description}</p> : null}
                    </TimelineItem>
                  ))}
                  {audit.map((entry) => (
                    <TimelineItem key={entry.id} title={`${entry.action.replaceAll("_", " ")} · ${entry.module}`} meta={`${entry.userEmail} · ${formatDateTime(entry.timestamp)}`}>
                      <p className="text-xs text-muted-foreground">{entry.oldValue || entry.newValue ? `${entry.oldValue ?? "—"} → ${entry.newValue ?? "—"}` : ""}</p>
                    </TimelineItem>
                  ))}
                </Timeline>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Log activity</CardTitle>
            </CardHeader>
            <CardContent>
              <Can permission="activities.create" fallback={<p className="text-sm text-muted-foreground">You do not have permission to log activities.</p>}>
                <Button
                  variant="outline"
                  onClick={async () => {
                    if (!user) return;
                    try {
                      await createCustomerActivity(customer.id, {
                        type: "FOLLOW_UP",
                        subject: "Follow-up created",
                        description: "Logged from customer profile.",
                        activityDate: new Date().toISOString(),
                        status: "OPEN",
                      }, user);
                      toast.success("Follow-up created");
                    } catch (error) {
                      toast.error(toUserMessage(error));
                    }
                  }}
                >
                  Create follow-up
                </Button>
              </Can>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {tab === "Products" ? (
        <Card>
          <CardHeader><CardTitle>Referenced product masters</CardTitle></CardHeader>
          <CardContent>
            {linkedProducts.length === 0 ? (
              <EmptyState title="No product masters linked." description="Selecting a product master on a customer requirement creates this relationship. Product master is not the same as the customer requirement." />
            ) : (
              <ul className="space-y-2 text-sm">
                {linkedProducts.map((product) => (
                  <li key={product.id}>
                    <button type="button" className="flex w-full items-center justify-between rounded-lg border border-border p-3 text-left hover:bg-muted/50" onClick={() => router.push(`/master/products/${product.id}` as Route)}>
                      <span><span className="font-medium">{product.productCode}</span><span className="ml-2 text-muted-foreground">{product.productName}</span></span>
                      <StatusBadge value={product.status} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : null}

      {tab === "Enquiries" ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Enquiries</CardTitle>
              <Can permission="enquiries.create">
                <Button size="sm" onClick={() => router.push(`/crm/enquiries/new?customerId=${current.id}` as Route)}>Create Enquiry</Button>
              </Can>
            </div>
          </CardHeader>
          <CardContent>
            {customerEnquiries.length === 0 ? (
              <EmptyState title="No enquiries found." description="Create an enquiry for this customer without re-entering company details." />
            ) : (
              <ul className="space-y-2 text-sm">
                {customerEnquiries.map((enquiry) => (
                  <li key={enquiry.id}>
                    <button type="button" className="flex w-full items-center justify-between rounded-lg border border-border p-3 text-left hover:bg-muted/50" onClick={() => router.push(`/crm/enquiries/${enquiry.id}` as Route)}>
                      <span>
                        <span className="font-medium">{enquiry.enquiryNumber}</span>
                        <span className="ml-2 text-muted-foreground">{enquiry.contactName}</span>
                      </span>
                      <StatusBadge value={enquiry.status} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : null}

      {tab === "Feasibilities" ? (
        <Card>
          <CardHeader><CardTitle>Feasibilities</CardTitle></CardHeader>
          <CardContent>
            {customerFeasibilities.length === 0 ? (
              <EmptyState title="No feasibility assessments." description="Start feasibility from an enquiry that belongs to this customer." />
            ) : (
              <ul className="space-y-2 text-sm">
                {customerFeasibilities.map((item) => (
                  <li key={item.id}>
                    <button type="button" className="flex w-full items-center justify-between rounded-lg border border-border p-3 text-left hover:bg-muted/50" onClick={() => router.push(`/crm/feasibility/${item.id}` as Route)}>
                      <span>
                        <span className="font-medium">{item.feasibilityNumber}</span>
                        <span className="ml-2 text-muted-foreground">{item.productName}</span>
                      </span>
                      <StatusBadge value={item.status} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : null}

      {tab === "Costings" ? (
        <Card>
          <CardHeader><CardTitle>Costings</CardTitle></CardHeader>
          <CardContent>
            {!user || !can(user, "costing.view") ? (
              <EmptyState title="Costing is restricted" description="Internal pricing is available only to authorized commercial users." />
            ) : customerCostings.length === 0 ? (
              <EmptyState title="No costing sheets." description="Create costing from a feasible assessment for this customer." />
            ) : (
              <ul className="space-y-2 text-sm">
                {customerCostings.map((item) => (
                  <li key={item.id}>
                    <button type="button" className="flex w-full items-center justify-between rounded-lg border border-border p-3 text-left hover:bg-muted/50" onClick={() => router.push(`/crm/costing/${item.id}` as Route)}>
                      <span><span className="font-medium">{item.displayNumber}</span><span className="ml-2 text-muted-foreground">{item.productName}</span></span>
                      <StatusBadge value={item.status} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : null}

      {tab === "Quotations" ? (
        <Card>
          <CardHeader><CardTitle>Quotations</CardTitle></CardHeader>
          <CardContent>
            {!user || !can(user, "quotations.view") ? (
              <EmptyState title="Quotations are restricted" description="Commercial quotations are available only to authorized users." />
            ) : customerQuotations.length === 0 ? (
              <EmptyState title="No quotations." description="Create a quotation from an approved costing for this customer." />
            ) : (
              <ul className="space-y-2 text-sm">
                {customerQuotations.map((item) => (
                  <li key={item.id}>
                    <button type="button" className="flex w-full items-center justify-between rounded-lg border border-border p-3 text-left hover:bg-muted/50" onClick={() => router.push(`/crm/quotations/${item.id}` as Route)}>
                      <span>
                        <span className="font-medium">{item.displayNumber}</span>
                        <span className="ml-2 text-muted-foreground">{item.productName} · {formatCostingMoney(item.totals.grandTotalMinor, item.currency)}</span>
                      </span>
                      <StatusBadge value={item.status} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : null}

      {FUTURE[tab] ? (
        <EmptyState title={tab} description={FUTURE[tab] ?? ""} />
      ) : null}

      {contactOpen && contactOpen !== "view" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-card p-5 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold">{contactOpen === "create" ? "Add contact" : "Edit contact"}</h2>
            <ContactForm
              defaultValues={
                contactOpen === "create"
                  ? { ...emptyContactForm, isPrimary: contacts.length === 0 }
                  : {
                      firstName: contactOpen.firstName,
                      lastName: contactOpen.lastName,
                      designation: contactOpen.designation ?? "",
                      department: contactOpen.department ?? "",
                      email: contactOpen.email ?? "",
                      phone: contactOpen.phone ?? "",
                      alternatePhone: contactOpen.alternatePhone ?? "",
                      whatsapp: contactOpen.whatsapp ?? "",
                      contactType: contactOpen.contactType,
                      isPrimary: contactOpen.isPrimary,
                      status: contactOpen.status,
                      notes: contactOpen.notes ?? "",
                    }
              }
              onCancel={() => setContactOpen(null)}
              onSubmit={saveContact}
            />
          </div>
        </div>
      ) : null}

      {viewing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-5 shadow-xl">
            <h2 className="text-lg font-semibold">{viewing.fullName}</h2>
            <div className="mt-4 grid gap-2 text-sm">
              <Row label="Designation" value={viewing.designation} />
              <Row label="Department" value={viewing.department} />
              <Row label="Type" value={labelForType(viewing.contactType)} />
              <Row label="Email" value={viewing.email} />
              <Row label="Phone" value={viewing.phone} />
              <Row label="WhatsApp" value={viewing.whatsapp} />
              <Row label="Primary" value={viewing.isPrimary ? "Yes" : "No"} />
              <Row label="Status" value={viewing.status} />
              <Row label="Notes" value={viewing.notes} />
              <Row label="Created" value={formatDateTime(viewing.createdAt)} />
            </div>
            <p className="mt-4 text-xs text-muted-foreground">Enquiries, quotations, orders and activities linked to this contact will appear in later modules.</p>
            <div className="mt-4 flex justify-end">
              <Button variant="ghost" onClick={() => setViewing(null)}>Close</Button>
            </div>
          </div>
        </div>
      ) : null}

      {statusOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-xl">
            <h2 className="text-lg font-semibold">Change status</h2>
            <Select className="mt-4" value={nextStatus} onChange={(event) => setNextStatus(event.target.value as CustomerStatus)}>
              {CUSTOMER_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </Select>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setStatusOpen(false)}>Cancel</Button>
              <Button onClick={async () => {
                if (!user) return;
                try {
                  await updateCustomerStatus(customer.id, nextStatus, user);
                  toast.success("Status updated");
                  setStatusOpen(false);
                } catch (error) {
                  toast.error(toUserMessage(error));
                }
              }}>Save</Button>
            </div>
          </div>
        </div>
      ) : null}

      {archiveOpen ? (
        <ConfirmDialog
          title="Archive this customer?"
          description="The account is deactivated and hidden from the default directory. This is audited and is not a silent delete."
          confirmLabel="Archive"
          onCancel={() => setArchiveOpen(false)}
          onConfirm={async () => {
            if (!user) return;
            try {
              await archiveCustomer(customer.id, user);
              toast.success("Customer archived");
              setArchiveOpen(false);
              router.push("/crm/customers" as Route);
            } catch (error) {
              toast.error(toUserMessage(error));
            }
          }}
        />
      ) : null}
    </div>
  );
}

function InfoCard({ title, rows }: { title: string; rows: Array<[string, string | undefined]> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {rows.map(([label, value]) => (
          <Row key={label} label={label} value={value} />
        ))}
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="max-w-[60%] text-right font-medium">{value || "—"}</span>
    </div>
  );
}
