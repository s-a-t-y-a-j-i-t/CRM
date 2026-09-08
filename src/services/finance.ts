import { addMinor, agingBucketKey, deriveInvoiceStatus, maxMinor, subtractMinor } from "@/lib/money";
import type { Customer } from "@/types/entities";
import type { AgingBucket, CustomerFinancialSummary, Invoice, Payment } from "@/types/finance";

const EMPTY_AGING: AgingBucket[] = [
  { key: "0_30", label: "0–30 days", amountMinor: 0, invoiceCount: 0 },
  { key: "31_60", label: "31–60 days", amountMinor: 0, invoiceCount: 0 },
  { key: "61_90", label: "61–90 days", amountMinor: 0, invoiceCount: 0 },
  { key: "90_plus", label: "90+ days", amountMinor: 0, invoiceCount: 0 },
];

export function applyPaymentToInvoice(invoice: Invoice, payments: Payment[]): Invoice {
  const paidMinor = payments
    .filter((payment) => payment.invoiceId === invoice.id && payment.status !== "archived")
    .reduce((sum, payment) => addMinor(sum, payment.amountMinor), 0);
  const outstandingMinor = maxMinor(0, subtractMinor(invoice.totalMinor, paidMinor));
  const invoiceStatus = deriveInvoiceStatus({
    totalMinor: invoice.totalMinor,
    paidMinor,
    dueDate: invoice.dueDate,
    disputed: invoice.invoiceStatus === "disputed" && outstandingMinor > 0,
  });

  return {
    ...invoice,
    paidMinor,
    outstandingMinor,
    invoiceStatus,
    updatedAt: new Date().toISOString(),
  };
}

export function buildCustomerFinancialSummary(
  customer: Customer,
  invoices: Invoice[],
  payments: Payment[],
): CustomerFinancialSummary {
  const customerInvoices = invoices.filter((invoice) => invoice.customerId === customer.id);
  const customerPayments = payments.filter((payment) => payment.customerId === customer.id);
  const settled = customerInvoices.map((invoice) => applyPaymentToInvoice(invoice, customerPayments));

  const totalInvoicedMinor = settled.reduce((sum, invoice) => addMinor(sum, invoice.totalMinor), 0);
  const totalPaidMinor = settled.reduce((sum, invoice) => addMinor(sum, invoice.paidMinor), 0);
  const outstandingMinor = settled.reduce((sum, invoice) => addMinor(sum, invoice.outstandingMinor), 0);
  const overdueMinor = settled
    .filter((invoice) => invoice.invoiceStatus === "overdue")
    .reduce((sum, invoice) => addMinor(sum, invoice.outstandingMinor), 0);

  const agingMap = new Map(EMPTY_AGING.map((bucket) => [bucket.key, { ...bucket }]));
  for (const invoice of settled) {
    if (invoice.outstandingMinor <= 0) continue;
    const key = agingBucketKey(invoice.dueDate);
    const bucket = agingMap.get(key);
    if (bucket) {
      bucket.amountMinor = addMinor(bucket.amountMinor, invoice.outstandingMinor);
      bucket.invoiceCount += 1;
    }
  }

  return {
    customerId: customer.id,
    currency: customer.currency,
    totalSalesMinor: totalInvoicedMinor,
    totalInvoicedMinor,
    totalPaidMinor,
    outstandingMinor,
    overdueMinor,
    creditLimitMinor: customer.creditLimitMinor,
    availableCreditMinor: maxMinor(0, subtractMinor(customer.creditLimitMinor, outstandingMinor)),
    aging: [...agingMap.values()],
  };
}
