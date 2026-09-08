"use client";

import { useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Timeline, TimelineItem } from "@/components/shared/timeline";
import { Can } from "@/components/rbac/can";
import { useAuth } from "@/hooks/useAuth";
import { useQuotationStore } from "@/stores/quotation-store";
import { useAppStore } from "@/services/store";
import { formatCostingMoney } from "@/lib/money";
import { formatDate, formatDateTime } from "@/lib/dates";
import { toUserMessage } from "@/lib/errors";
import {
  changeQuotationStatus,
  compareQuotationVersions,
  getSalesOrderReadyQuotation,
  isQuotationExpired,
} from "@/services/quotations/quotation.service";
import { createQuotationRevision } from "@/services/quotations/quotation-version.service";
import { approveQuotation, getQuotationApprovalHistory, rejectQuotation, requiredQuotationApprovalLevel, submitQuotationForApproval } from "@/services/quotations/quotation-approval.service";
import { acceptQuotation, rejectCustomerQuotation, sendQuotation, startNegotiation } from "@/services/quotations/quotation-send.service";
import { downloadQuotationPdf } from "@/services/quotations/quotation-pdf.service";
import { storeGeneratedQuotationPdf } from "@/services/quotations/quotation-document.service";
import { QUOTATION_TRANSITIONS } from "@/services/quotations/quotation-workflow.service";
import { pharmaLabel } from "@/constants/quotations";
import type { QuotationStatus } from "@/constants/quotations";

const TABS = ["Overview", "Items", "Terms", "Preview", "Versions", "Approval", "Send", "Documents", "Timeline"] as const;

function downloadBytes(bytes: Uint8Array, fileName: string) {
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function QuotationWorkspace({ id, initialTab = "Overview" }: { id: string; initialTab?: (typeof TABS)[number] }) {
  const router = useRouter();
  const { user } = useAuth();
  const item = useQuotationStore((state) => state.quotations.find((row) => row.id === id));
  const lines = useQuotationStore((state) => state.items.filter((row) => row.quotationId === id).sort((a, b) => a.sortOrder - b.sortOrder));
  const charges = useQuotationStore((state) => state.charges.filter((row) => row.quotationId === id));
  const documents = useQuotationStore((state) => state.documents.filter((row) => row.quotationId === id));
  const audit = useAppStore((state) => state.db.auditLogs.filter((entry) => entry.recordId === id).slice(0, 40));
  const [tab, setTab] = useState<(typeof TABS)[number]>(initialTab);
  const [reason, setReason] = useState("");
  const [remarks, setRemarks] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("Please find our quotation attached.");

  if (!item) return <EmptyState title="Quotation not found" description="This quotation is unavailable." />;
  if (!user) return null;
  const actor = user;
  const current = item;
  const expired = isQuotationExpired(item);
  const money = (minor: number) => formatCostingMoney(minor, item.currency);
  const nextStatuses = QUOTATION_TRANSITIONS[item.status];

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold">{item.displayNumber}</h1>
              <StatusBadge value={item.status} />
              {expired ? <StatusBadge value="EXPIRED" /> : null}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{item.customerName} · {item.productName} · {item.enquiryNumber}</p>
            <p className="mt-2 text-sm">Prepared by {item.preparedByName} · Owner {item.salesOwnerName}</p>
          </div>
          <div className="grid gap-2 text-right text-sm">
            <p className="text-muted-foreground">Selling total</p>
            <p className="text-2xl font-semibold">{money(item.totals.grandTotalMinor)}</p>
            <p className="text-muted-foreground">Valid until {formatDate(item.validUntil)}</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Can permission="quotations.update"><Button variant="outline" onClick={() => router.push(`/crm/quotations/${id}/edit` as Route)}>Edit</Button></Can>
          <Can permission="quotation_pdf.view"><Button variant="outline" onClick={() => router.push(`/crm/quotations/${id}/preview` as Route)}>Preview</Button></Can>
          <Can permission="quotations.revise"><Button variant="outline" onClick={async () => {
            const changeReason = window.prompt("Revision reason");
            if (!changeReason) return;
            try {
              const created = await createQuotationRevision(id, changeReason, actor);
              toast.success(created.displayNumber);
              router.push(`/crm/quotations/${created.id}` as Route);
            } catch (error) { toast.error(toUserMessage(error)); }
          }}>Create revision</Button></Can>
          {item.status === "ACCEPTED" ? (
            <Button variant="outline" onClick={() => {
              try {
                const payload = getSalesOrderReadyQuotation(id, actor);
                toast.success(`Sales order integration point · ${payload.quotationId}`);
              } catch (error) { toast.error(toUserMessage(error)); }
            }}>Create Sales Order</Button>
          ) : null}
        </div>
      </section>

      <div className="flex gap-1 overflow-x-auto border-b border-border pb-px">
        {TABS.map((name) => <button key={name} type="button" className={`shrink-0 rounded-t-md px-3 py-2 text-sm ${tab === name ? "bg-card font-medium" : "text-muted-foreground"}`} onClick={() => setTab(name)}>{name}</button>)}
      </div>

      {tab === "Overview" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card><CardHeader><CardTitle>Header</CardTitle></CardHeader><CardContent className="space-y-1 text-sm">
            <p>Customer: {item.customer.customerName}</p>
            <p>Contact: {item.customer.contactName ?? "—"}</p>
            <p>Enquiry: {item.enquiryNumber}</p>
            <p>Feasibility: {item.feasibilityNumber ?? "—"}</p>
            <p>Costing: {item.costingNumber ?? "—"}</p>
            <p>Currency: {item.currency}</p>
            <p>Date: {formatDate(item.quotationDate)}</p>
          </CardContent></Card>
          <Card><CardHeader><CardTitle>Commercial summary</CardTitle></CardHeader><CardContent className="space-y-1 text-sm">
            <p>Subtotal {money(item.totals.subtotalMinor)}</p>
            <p>Discount {money(item.totals.discountAmountMinor)}</p>
            <p>Additional charges {money(item.totals.additionalChargesMinor)}</p>
            <p>Taxable {money(item.totals.taxableAmountMinor)}</p>
            <p>CGST {money(item.totals.cgstMinor)} · SGST {money(item.totals.sgstMinor)} · IGST {money(item.totals.igstMinor)}</p>
            <p className="font-medium">Grand total {money(item.totals.grandTotalMinor)}</p>
            <p className="text-muted-foreground">{item.totals.amountInWords}</p>
          </CardContent></Card>
        </div>
      ) : null}

      {tab === "Items" ? (
        <Card><CardContent className="space-y-3 p-5 text-sm">
          {lines.map((line) => (
            <div key={line.id} className="rounded-lg border border-border p-3">
              <p className="font-medium">{line.productName}</p>
              <p>{line.quantity} {line.quantityUnit} · {money(line.unitPriceMinor)} · {line.taxType} {line.taxRate}%</p>
              <p>Line total {money(line.lineTotalMinor)}{line.moq ? ` · MOQ ${line.moq}` : ""}</p>
            </div>
          ))}
          {charges.map((line) => <p key={line.id}>{line.description} · {money(line.amountMinor)}</p>)}
          <Can permission="quotations.update"><Button size="sm" variant="outline" onClick={() => router.push(`/crm/quotations/${id}/items` as Route)}>Edit items</Button></Can>
        </CardContent></Card>
      ) : null}

      {tab === "Terms" ? (
        <Card><CardContent className="space-y-2 p-5 text-sm">
          <p>Payment {pharmaLabel(item.terms.paymentTerms)}</p>
          <p>Delivery {pharmaLabel(item.terms.deliveryTerms)}</p>
          <p>Estimated lead time {item.terms.estimatedLeadTime ?? "—"} {item.terms.leadTimeUnit ?? ""}</p>
          <p>Customer notes: {item.customerNotes || "—"}</p>
          <p className="text-muted-foreground">Internal notes stay off the PDF: {item.internalNotes || "—"}</p>
          <Can permission="quotations.update"><Button size="sm" variant="outline" onClick={() => router.push(`/crm/quotations/${id}/terms` as Route)}>Edit terms</Button></Can>
        </CardContent></Card>
      ) : null}

      {tab === "Preview" ? (
        <Card><CardContent className="space-y-3 p-5">
          <p className="text-sm text-muted-foreground">Customer-facing preview. Internal costing and internal notes are excluded.</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push(`/crm/quotations/${id}/preview` as Route)}>Open preview</Button>
            <Can permission="quotation_pdf.export"><Button onClick={() => {
              try {
                const file = downloadQuotationPdf(id, actor);
                downloadBytes(file.bytes, file.fileName);
                void storeGeneratedQuotationPdf(id, actor);
              } catch (error) { toast.error(toUserMessage(error)); }
            }}>Download PDF</Button></Can>
          </div>
        </CardContent></Card>
      ) : null}

      {tab === "Versions" ? (
        <Card><CardHeader><CardTitle>Version comparison</CardTitle></CardHeader><CardContent className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead><tr className="text-left text-xs text-muted-foreground">{["Version", "Qty", "Unit price", "Discount", "Tax", "Charges", "Total", "Payment", "Delivery", "Valid"].map((head) => <th key={head} className="py-2 pr-3">{head}</th>)}</tr></thead>
            <tbody>
              {compareQuotationVersions(item.familyId, actor).map((row, index, all) => {
                const prev = all[index - 1];
                const diff = (key: keyof typeof row) => prev && row[key] !== prev[key];
                return (
                  <tr key={row.id} className="border-t border-border">
                    <td className="py-2 pr-3"><Button variant="ghost" size="sm" onClick={() => router.push(`/crm/quotations/${row.id}` as Route)}>{row.displayNumber}</Button></td>
                    <td className={diff("quantity") ? "font-medium text-amber-700" : ""}>{row.quantity}</td>
                    <td className={diff("unitPriceMinor") ? "font-medium text-amber-700" : ""}>{money(row.unitPriceMinor)}</td>
                    <td className={diff("discountAmountMinor") ? "font-medium text-amber-700" : ""}>{money(row.discountAmountMinor)}</td>
                    <td className={diff("taxAmountMinor") ? "font-medium text-amber-700" : ""}>{money(row.taxAmountMinor)}</td>
                    <td className={diff("additionalChargesMinor") ? "font-medium text-amber-700" : ""}>{money(row.additionalChargesMinor)}</td>
                    <td className={diff("grandTotalMinor") ? "font-medium text-amber-700" : ""}>{money(row.grandTotalMinor)}</td>
                    <td className={diff("paymentTerms") ? "font-medium text-amber-700" : ""}>{row.paymentTerms}</td>
                    <td className={diff("deliveryTerms") ? "font-medium text-amber-700" : ""}>{row.deliveryTerms}</td>
                    <td className={diff("validUntil") ? "font-medium text-amber-700" : ""}>{row.validUntil}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent></Card>
      ) : null}

      {tab === "Approval" ? (
        <Card><CardContent className="space-y-3 p-5">
          <p className="text-sm">Required level: {requiredQuotationApprovalLevel(current).name}</p>
          <Textarea value={remarks} onChange={(event) => setRemarks(event.target.value)} placeholder="Remarks" />
          <Input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Rejection reason" />
          <div className="flex flex-wrap gap-2">
            <Can permission="quotations.submit"><Button onClick={async () => { try { await submitQuotationForApproval(id, actor); toast.success("Submitted"); } catch (error) { toast.error(toUserMessage(error)); } }}>Submit</Button></Can>
            <Can permission="quotations.approve"><Button onClick={async () => { try { await approveQuotation(id, { decision: "APPROVED", remarks }, actor); toast.success("Approved"); } catch (error) { toast.error(toUserMessage(error)); } }}>Approve</Button></Can>
            <Can permission="quotations.reject"><Button variant="outline" onClick={async () => { try { await rejectQuotation(id, { decision: "REJECTED", remarks, reason }, actor); toast.success("Rejected"); } catch (error) { toast.error(toUserMessage(error)); } }}>Reject</Button></Can>
          </div>
          <ul className="text-sm">{getQuotationApprovalHistory(id).map((row) => <li key={row.id}>{row.decision} · {row.actorName} · {formatDateTime(row.createdAt)} · {row.remarks}</li>)}</ul>
        </CardContent></Card>
      ) : null}

      {tab === "Send" ? (
        <Card><CardContent className="space-y-3 p-5">
          <Input value={email || item.customer.contactEmail || ""} onChange={(event) => setEmail(event.target.value)} placeholder="Customer email" />
          <Input value={subject || `Quotation ${item.displayNumber}`} onChange={(event) => setSubject(event.target.value)} placeholder="Subject" />
          <Textarea value={message} onChange={(event) => setMessage(event.target.value)} />
          <p className="text-xs text-muted-foreground">No email provider is configured. Send opens a mailto draft after the customer PDF is downloaded. Internal notes are never attached.</p>
          <div className="flex flex-wrap gap-2">
            <Can permission="quotations.send"><Button onClick={async () => {
              try {
                const file = downloadQuotationPdf(id, actor);
                downloadBytes(file.bytes, file.fileName);
                const result = await sendQuotation(id, { recipient: email || item.customer.contactEmail || "", subject: subject || `Quotation ${item.displayNumber}`, message, cc: "" }, actor);
                window.location.href = result.mailto;
              } catch (error) { toast.error(toUserMessage(error)); }
            }}>Send quotation</Button></Can>
            <Can permission="quotations.update"><Button variant="outline" onClick={async () => { try { await startNegotiation(id, actor); toast.success("Negotiation"); } catch (error) { toast.error(toUserMessage(error)); } }}>Start negotiation</Button></Can>
            <Can permission="quotations.approve"><Button variant="outline" onClick={async () => { try { await acceptQuotation(id, remarks, actor); toast.success("Accepted"); } catch (error) { toast.error(toUserMessage(error)); } }}>Accept</Button></Can>
            <Can permission="quotations.reject"><Button variant="outline" onClick={async () => { try { await rejectCustomerQuotation(id, { rejectionReason: "PRICE", rejectionRemarks: reason || "Customer declined" }, actor); toast.success("Commercially rejected"); } catch (error) { toast.error(toUserMessage(error)); } }}>Customer reject</Button></Can>
          </div>
        </CardContent></Card>
      ) : null}

      {tab === "Documents" ? (
        <Card><CardContent className="p-5 text-sm">
          {documents.length === 0 ? <p>No generated PDFs stored yet.</p> : documents.map((doc) => <p key={doc.id}>{doc.fileName} · V{doc.quotationVersion}</p>)}
        </CardContent></Card>
      ) : null}

      {tab === "Timeline" ? (
        <Card><CardContent className="p-5">
          <Timeline>
            {audit.map((entry) => <TimelineItem key={entry.id} title={`${entry.action} · ${entry.userEmail}`} meta={formatDateTime(entry.timestamp)}>{`${entry.oldValue ?? "—"} → ${entry.newValue ?? "—"}`}</TimelineItem>)}
          </Timeline>
          {nextStatuses.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {nextStatuses.map((status) => (
                <Button key={status} size="sm" variant="outline" onClick={async () => { try { await changeQuotationStatus(id, status as QuotationStatus, actor); toast.success(status); } catch (error) { toast.error(toUserMessage(error)); } }}>{status}</Button>
              ))}
            </div>
          ) : null}
        </CardContent></Card>
      ) : null}
    </div>
  );
}
