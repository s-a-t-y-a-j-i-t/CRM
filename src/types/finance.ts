import type { AuditFields, CurrencyCode, EntityId, MoneyMinor } from "@/types/common";

export const INVOICE_STATUSES = [
  "pending",
  "partially_paid",
  "paid",
  "overdue",
  "disputed",
] as const;

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const PAYMENT_METHODS = [
  "bank_transfer",
  "cheque",
  "rtgs",
  "neft",
  "upi",
  "letter_of_credit",
  "other",
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface Invoice extends AuditFields {
  invoiceNumber: string;
  customerId: EntityId;
  purchaseOrderId?: EntityId;
  invoiceDate: string;
  dueDate: string;
  currency: CurrencyCode;
  amountMinor: MoneyMinor;
  taxMinor: MoneyMinor;
  totalMinor: MoneyMinor;
  paidMinor: MoneyMinor;
  outstandingMinor: MoneyMinor;
  invoiceStatus: InvoiceStatus;
  remarks?: string;
}

export interface Payment extends AuditFields {
  paymentNumber: string;
  customerId: EntityId;
  invoiceId: EntityId;
  amountMinor: MoneyMinor;
  paymentDate: string;
  method: PaymentMethod;
  referenceNumber: string;
  remarks?: string;
}

export interface AgingBucket {
  key: "0_30" | "31_60" | "61_90" | "90_plus";
  label: string;
  amountMinor: MoneyMinor;
  invoiceCount: number;
}

export interface CustomerFinancialSummary {
  customerId: EntityId;
  currency: CurrencyCode;
  totalSalesMinor: MoneyMinor;
  totalInvoicedMinor: MoneyMinor;
  totalPaidMinor: MoneyMinor;
  outstandingMinor: MoneyMinor;
  overdueMinor: MoneyMinor;
  creditLimitMinor: MoneyMinor;
  availableCreditMinor: MoneyMinor;
  aging: AgingBucket[];
}
