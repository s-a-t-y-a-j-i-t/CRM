import { assertCan } from "@/lib/rbac/can";
import { formatCostingMoney } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import { A4Document } from "@/lib/pdf-a4";
import { COMPANY_PROFILE } from "@/constants/company";
import { pharmaLabel } from "@/constants/quotations";
import { useQuotationStore } from "@/stores/quotation-store";
import { getQuotationById } from "@/services/quotations/quotation.service";
import type { AuthenticatedUser } from "@/types/rbac";
import type { CrmQuotation } from "@/types/quotations";

export interface QuotationPdfModel {
  header: typeof COMPANY_PROFILE;
  quotationNumber: string;
  version: number;
  displayNumber: string;
  quotationDate: string;
  validUntil: string;
  customer: CrmQuotation["customer"];
  items: Array<{
    sr: number;
    productName: string;
    description: string;
    dosageForm: string;
    strength: string;
    packSize: string;
    quantity: string;
    unitPrice: string;
    discount: string;
    tax: string;
    total: string;
  }>;
  summary: {
    subtotal: string;
    discount: string;
    charges: string;
    cgst: string;
    sgst: string;
    igst: string;
    otherTax: string;
    tax: string;
    grandTotal: string;
    amountInWords: string;
    currency: string;
  };
  terms: string[];
  customerNotes?: string;
}

export function buildCustomerFacingPdfModel(quotation: CrmQuotation): QuotationPdfModel {
  const items = useQuotationStore.getState().items
    .filter((item) => item.quotationId === quotation.id)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const charges = useQuotationStore.getState().charges.filter((item) => item.quotationId === quotation.id);
  const money = (value: number) => formatCostingMoney(value, quotation.currency);
  return {
    header: COMPANY_PROFILE,
    quotationNumber: quotation.quotationNumber,
    version: quotation.version,
    displayNumber: quotation.displayNumber,
    quotationDate: formatDate(quotation.quotationDate),
    validUntil: formatDate(quotation.validUntil),
    customer: quotation.customer,
    items: items.map((item, index) => ({
      sr: index + 1,
      productName: item.productName,
      description: item.description ?? "",
      dosageForm: item.dosageForm ?? "",
      strength: item.strength ?? "",
      packSize: item.packSize ?? item.packaging ?? "",
      quantity: `${item.quantity} ${item.quantityUnit}`,
      unitPrice: money(item.unitPriceMinor),
      discount: money(item.discountAmountMinor),
      tax: `${item.taxType} ${item.taxRate}%`,
      total: money(item.lineTotalMinor),
    })),
    summary: {
      subtotal: money(quotation.totals.subtotalMinor),
      discount: money(quotation.totals.discountAmountMinor),
      charges: money(quotation.totals.additionalChargesMinor),
      cgst: money(quotation.totals.cgstMinor),
      sgst: money(quotation.totals.sgstMinor),
      igst: money(quotation.totals.igstMinor),
      otherTax: money(quotation.totals.otherTaxMinor),
      tax: money(quotation.totals.taxAmountMinor),
      grandTotal: money(quotation.totals.grandTotalMinor),
      amountInWords: quotation.totals.amountInWords,
      currency: quotation.currency,
    },
    terms: [
      `Payment: ${pharmaLabel(quotation.terms.paymentTerms)}${quotation.terms.paymentTermsCustom ? ` — ${quotation.terms.paymentTermsCustom}` : ""}`,
      `Delivery: ${pharmaLabel(quotation.terms.deliveryTerms)}${quotation.terms.deliveryTermsCustom ? ` — ${quotation.terms.deliveryTermsCustom}` : ""}`,
      quotation.terms.estimatedLeadTime ? `Estimated lead time: ${quotation.terms.estimatedLeadTime} ${quotation.terms.leadTimeUnit ?? "DAYS"} (estimate only)` : "",
      quotation.terms.taxesNote ?? "",
      quotation.terms.freightNote ?? "",
      quotation.terms.moqNote ?? "",
      quotation.terms.packagingTerms ?? "",
      quotation.terms.artworkTerms ?? "",
      quotation.terms.sampleTerms ?? "",
      quotation.terms.regulatoryTerms ?? "",
      quotation.terms.cancellationTerms ?? "",
      quotation.terms.otherTerms ?? "",
      charges.length ? `Additional charges: ${charges.map((line) => `${line.description} ${money(line.amountMinor)}`).join("; ")}` : "",
    ].filter(Boolean),
    customerNotes: quotation.customerNotes,
  };
}

export function renderQuotationPdf(model: QuotationPdfModel): Uint8Array {
  const doc = new A4Document();
  doc.heading(model.header.name);
  doc.text(model.header.legalName, 48, 10);
  doc.text(model.header.address, 48, 9);
  doc.text(`${model.header.phone}  ·  ${model.header.email}  ·  GSTIN ${model.header.gstin}`, 48, 9);
  doc.rule();
  doc.text("QUOTATION", 48, 14, "F2");
  doc.text(`${model.displayNumber}    Version ${model.version}`, 48, 11, "F2");
  doc.text(`Date ${model.quotationDate}    Valid until ${model.validUntil}`);
  doc.spacer();
  doc.text("Bill to", 48, 10, "F2");
  doc.text(model.customer.customerName, 48, 10, "F2");
  if (model.customer.billingAddress) doc.text(model.customer.billingAddress);
  doc.text([model.customer.city, model.customer.state, model.customer.country].filter(Boolean).join(", "));
  if (model.customer.gstin) doc.text(`GSTIN ${model.customer.gstin}`);
  if (model.customer.contactName) doc.text(`Contact ${model.customer.contactName}  ${model.customer.contactEmail ?? ""} ${model.customer.contactPhone ?? ""}`);
  doc.spacer();
  doc.row(["Sr", "Product", "Pack", "Qty", "Price", "Disc", "Tax", "Total"], [24, 120, 70, 70, 60, 50, 55, 60], 8);
  doc.rule();
  model.items.forEach((item) => {
    doc.row([
      String(item.sr),
      item.productName,
      item.packSize,
      item.quantity,
      item.unitPrice,
      item.discount,
      item.tax,
      item.total,
    ], [24, 120, 70, 70, 60, 50, 55, 60], 8);
    if (item.description) doc.text(item.description, 72, 8);
  });
  doc.rule();
  doc.text(`Subtotal  ${model.summary.subtotal}`);
  doc.text(`Discount  ${model.summary.discount}`);
  doc.text(`Additional charges  ${model.summary.charges}`);
  if (model.summary.cgst !== formatCostingMoney(0, model.summary.currency)) doc.text(`CGST  ${model.summary.cgst}`);
  if (model.summary.sgst !== formatCostingMoney(0, model.summary.currency)) doc.text(`SGST  ${model.summary.sgst}`);
  if (model.summary.igst !== formatCostingMoney(0, model.summary.currency)) doc.text(`IGST  ${model.summary.igst}`);
  doc.text(`Tax  ${model.summary.tax}`, 48, 10, "F2");
  doc.text(`Grand total  ${model.summary.grandTotal}`, 48, 12, "F2");
  doc.text(model.summary.amountInWords, 48, 9);
  doc.spacer();
  if (model.customerNotes) {
    doc.text("Customer notes", 48, 10, "F2");
    doc.text(model.customerNotes);
  }
  doc.text("Terms and conditions", 48, 10, "F2");
  model.terms.forEach((term) => doc.text(term, 48, 8));
  doc.spacer(16);
  doc.text(model.header.signatoryTitle, 48, 9);
  doc.text(model.header.signatoryName);
  doc.text("This quotation is commercial only and does not constitute a production commitment.");
  return doc.build();
}

export function generateQuotationPdf(quotationId: string, actor: AuthenticatedUser): { bytes: Uint8Array; fileName: string; model: QuotationPdfModel } {
  assertCan(actor, "quotation_pdf.view");
  const quotation = getQuotationById(quotationId, actor);
  const model = buildCustomerFacingPdfModel(quotation);
  return {
    bytes: renderQuotationPdf(model),
    fileName: `${quotation.displayNumber}.pdf`,
    model,
  };
}

export function downloadQuotationPdf(quotationId: string, actor: AuthenticatedUser): { bytes: Uint8Array; fileName: string } {
  assertCan(actor, "quotation_pdf.export");
  const generated = generateQuotationPdf(quotationId, actor);
  return { bytes: generated.bytes, fileName: generated.fileName };
}
