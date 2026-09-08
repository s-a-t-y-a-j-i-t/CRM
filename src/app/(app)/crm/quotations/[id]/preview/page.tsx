"use client";

import { use } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { Can } from "@/components/rbac/can";
import { useAuth } from "@/hooks/useAuth";
import { useQuotationStore } from "@/stores/quotation-store";
import { buildCustomerFacingPdfModel, downloadQuotationPdf } from "@/services/quotations/quotation-pdf.service";
import { storeGeneratedQuotationPdf } from "@/services/quotations/quotation-document.service";
import { COMPANY_PROFILE } from "@/constants/company";
import { toUserMessage } from "@/lib/errors";

export default function QuotationPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const item = useQuotationStore((state) => state.quotations.find((row) => row.id === id));
  if (!item) return <EmptyState title="Quotation not found" description="This quotation is unavailable." />;
  if (!user) return null;
  const model = buildCustomerFacingPdfModel(item);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Preview · ${item.displayNumber}`}
        description="A4 customer document. Internal notes and costing internals are excluded."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push(`/crm/quotations/${id}` as Route)}>Back</Button>
            <Button variant="outline" onClick={() => window.print()}>Print</Button>
            <Can permission="quotation_pdf.export">
              <Button onClick={() => {
                try {
                  const file = downloadQuotationPdf(id, user);
                  const blob = new Blob([file.bytes as BlobPart], { type: "application/pdf" });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = file.fileName;
                  link.click();
                  URL.revokeObjectURL(url);
                  void storeGeneratedQuotationPdf(id, user);
                } catch (error) { toast.error(toUserMessage(error)); }
              }}>Download PDF</Button>
            </Can>
          </div>
        }
      />
      <article className="mx-auto max-w-[210mm] space-y-5 bg-white p-10 text-zinc-900 shadow-sm print:shadow-none">
        <header className="border-b border-zinc-200 pb-4">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">{COMPANY_PROFILE.name}</p>
          <h1 className="text-2xl font-semibold">{COMPANY_PROFILE.legalName}</h1>
          <p className="text-sm text-zinc-600">{COMPANY_PROFILE.address}</p>
          <p className="text-sm text-zinc-600">{COMPANY_PROFILE.phone} · {COMPANY_PROFILE.email} · GSTIN {COMPANY_PROFILE.gstin}</p>
        </header>
        <section className="flex justify-between gap-6">
          <div>
            <p className="text-xs uppercase text-zinc-500">Quotation</p>
            <p className="text-xl font-semibold">{model.displayNumber}</p>
            <p className="text-sm">Version {model.version}</p>
          </div>
          <div className="text-sm">
            <p>Date {model.quotationDate}</p>
            <p>Valid until {model.validUntil}</p>
          </div>
        </section>
        <section className="text-sm">
          <p className="font-semibold">{model.customer.customerName}</p>
          <p>{model.customer.billingAddress}</p>
          <p>{[model.customer.city, model.customer.state, model.customer.country].filter(Boolean).join(", ")}</p>
          {model.customer.gstin ? <p>GSTIN {model.customer.gstin}</p> : null}
          {model.customer.contactName ? <p>Contact {model.customer.contactName} · {model.customer.contactEmail} · {model.customer.contactPhone}</p> : null}
        </section>
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-y border-zinc-200 text-zinc-500">
              <th className="py-2">Sr</th><th>Product</th><th>Pack</th><th>Qty</th><th>Price</th><th>Disc</th><th>Tax</th><th>Total</th>
            </tr>
          </thead>
          <tbody>
            {model.items.map((line) => (
              <tr key={line.sr} className="border-b border-zinc-100">
                <td className="py-2">{line.sr}</td>
                <td>{line.productName}<div className="text-zinc-500">{line.description}</div></td>
                <td>{line.packSize}</td>
                <td>{line.quantity}</td>
                <td>{line.unitPrice}</td>
                <td>{line.discount}</td>
                <td>{line.tax}</td>
                <td>{line.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <section className="ml-auto max-w-sm space-y-1 text-sm">
          <p>Subtotal {model.summary.subtotal}</p>
          <p>Discount {model.summary.discount}</p>
          <p>Additional charges {model.summary.charges}</p>
          <p>CGST {model.summary.cgst} · SGST {model.summary.sgst} · IGST {model.summary.igst}</p>
          <p className="text-lg font-semibold">Grand total {model.summary.grandTotal}</p>
          <p className="text-xs text-zinc-600">{model.summary.amountInWords}</p>
        </section>
        {model.customerNotes ? <p className="text-sm"><span className="font-medium">Notes. </span>{model.customerNotes}</p> : null}
        <section className="text-xs text-zinc-700">
          <p className="font-semibold">Terms and conditions</p>
          <ul className="mt-1 list-disc space-y-1 pl-4">{model.terms.map((term) => <li key={term}>{term}</li>)}</ul>
        </section>
        <footer className="pt-8 text-sm">
          <p>{COMPANY_PROFILE.signatoryTitle}</p>
          <p className="font-medium">{COMPANY_PROFILE.signatoryName}</p>
        </footer>
      </article>
    </div>
  );
}
