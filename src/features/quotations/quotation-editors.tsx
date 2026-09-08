"use client";

import { useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { useAuth } from "@/hooks/useAuth";
import { useQuotationStore } from "@/stores/quotation-store";
import { useProductStore } from "@/stores/product-store";
import { useIdentityStore } from "@/stores/identity-store";
import { updateQuotation } from "@/services/quotations/quotation.service";
import { listQuotationCharges, listQuotationItems, saveQuotationCharges, saveQuotationItems, saveQuotationTerms } from "@/services/quotations/quotation-item.service";
import { fromMinorUnits } from "@/lib/money";
import { toUserMessage } from "@/lib/errors";
import { QUANTITY_UNIT_OPTIONS } from "@/constants/pharma";
import { CHARGE_TYPE_OPTIONS, DELIVERY_TERM_OPTIONS, DISCOUNT_TYPE_OPTIONS, LEAD_TIME_UNIT_OPTIONS, PAYMENT_TERM_OPTIONS, TAX_TYPE_OPTIONS } from "@/constants/quotations";
import type { ChargeType, DeliveryTermCode, DiscountType, PaymentTermCode, TaxType } from "@/constants/quotations";
import type { CurrencyCode } from "@/types/common";
import type { QuantityUnit } from "@/constants/pharma";

function moneyCurrency(currency: string): CurrencyCode {
  if (currency === "USD" || currency === "EUR" || currency === "GBP") return currency;
  return "INR";
}

export function QuotationItemsEditor({ id }: { id: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const item = useQuotationStore((state) => state.quotations.find((row) => row.id === id));
  const products = useProductStore((state) => state.products);
  const existing = listQuotationItems(id);
  const charges = listQuotationCharges(id);
  const [rows, setRows] = useState(existing.map((line) => ({
    productId: line.productId ?? "",
    productName: line.productName,
    description: line.description ?? "",
    quantity: line.quantity,
    quantityUnit: line.quantityUnit,
    unitPrice: Number(fromMinorUnits(line.unitPriceMinor, moneyCurrency(item?.currency ?? "INR"))),
    discountType: line.discountType,
    discountValue: line.discountValue,
    taxType: line.taxType,
    taxRate: line.taxRate,
  })));
  const [chargeRows, setChargeRows] = useState(charges.map((line) => ({
    chargeType: line.chargeType,
    description: line.description,
    amount: Number(fromMinorUnits(line.amountMinor, moneyCurrency(item?.currency ?? "INR"))),
  })));
  if (!user || !item) return <EmptyState title="Quotation not found" description="This quotation is unavailable." />;
  return (
    <div className="space-y-6">
      <PageHeader title={`Items · ${item.displayNumber}`} description="Line prices are snapshotted. Later costing changes do not rewrite this quotation." actions={<Button variant="outline" onClick={() => router.push(`/crm/quotations/${id}` as Route)}>Back</Button>} />
      <Card><CardContent className="space-y-3 p-5">
        {rows.map((row, index) => (
          <div key={index} className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-6">
            <Select value={row.productId} onChange={(event) => {
              const product = products.find((item) => item.id === event.target.value);
              setRows((current) => current.map((line, lineIndex) => lineIndex === index ? {
                ...line,
                productId: event.target.value,
                productName: product?.productName ?? line.productName,
                description: product?.genericName ?? line.description,
              } : line));
            }}>
              <option value="">Product master (optional)</option>
              {products.map((product) => <option key={product.id} value={product.id}>{product.productName}</option>)}
            </Select>
            <Input value={row.productName} onChange={(event) => setRows((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, productName: event.target.value } : line))} />
            <Input type="number" min={0} value={row.quantity} onChange={(event) => setRows((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, quantity: Number(event.target.value) } : line))} />
            <Select value={row.quantityUnit} onChange={(event) => setRows((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, quantityUnit: event.target.value as QuantityUnit } : line))}>{QUANTITY_UNIT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select>
            <Input type="number" min={0} step="0.01" value={row.unitPrice} onChange={(event) => setRows((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, unitPrice: Number(event.target.value) } : line))} />
            <Select value={row.taxType} onChange={(event) => setRows((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, taxType: event.target.value as TaxType } : line))}>{TAX_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select>
            <Input type="number" min={0} value={row.taxRate} onChange={(event) => setRows((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, taxRate: Number(event.target.value) } : line))} placeholder="Tax %" />
            <Select value={row.discountType} onChange={(event) => setRows((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, discountType: event.target.value as DiscountType } : line))}>{DISCOUNT_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select>
            <Input type="number" min={0} value={row.discountValue} onChange={(event) => setRows((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, discountValue: Number(event.target.value) } : line))} placeholder="Discount" />
          </div>
        ))}
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setRows((current) => [...current, { productId: "", productName: "", description: "", quantity: 1, quantityUnit: "TABLETS", unitPrice: 0, discountType: "PERCENTAGE", discountValue: 0, taxType: "IGST", taxRate: 12 }])}>Add item</Button>
          <Button variant="outline" onClick={() => setRows((current) => current.slice(0, -1))}>Remove last</Button>
        </div>
        {chargeRows.map((row, index) => (
          <div key={index} className="grid gap-2 sm:grid-cols-3">
            <Select value={row.chargeType} onChange={(event) => setChargeRows((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, chargeType: event.target.value as ChargeType } : line))}>{CHARGE_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select>
            <Input value={row.description} onChange={(event) => setChargeRows((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, description: event.target.value } : line))} />
            <Input type="number" min={0} value={row.amount} onChange={(event) => setChargeRows((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, amount: Number(event.target.value) } : line))} />
          </div>
        ))}
        <Button variant="outline" onClick={() => setChargeRows((current) => [...current, { chargeType: "FREIGHT", description: "Freight", amount: 0 }])}>Add charge</Button>
        <Button onClick={async () => {
          try {
            await saveQuotationItems(id, rows.map((row) => ({ ...row, remarks: "" })), user);
            await saveQuotationCharges(id, chargeRows, user);
            toast.success("Items recalculated");
          } catch (error) { toast.error(toUserMessage(error)); }
        }}>Save items</Button>
      </CardContent></Card>
    </div>
  );
}

export function QuotationTermsEditor({ id }: { id: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const item = useQuotationStore((state) => state.quotations.find((row) => row.id === id));
  const [paymentTerms, setPaymentTerms] = useState<PaymentTermCode>(item?.terms.paymentTerms ?? "NET_30");
  const [deliveryTerms, setDeliveryTerms] = useState<DeliveryTermCode>(item?.terms.deliveryTerms ?? "EX_WORKS");
  const [leadTime, setLeadTime] = useState(item?.terms.estimatedLeadTime ?? 45);
  const [headerDiscount, setHeaderDiscount] = useState(item?.headerDiscountValue ?? 0);
  const [customerNotes, setCustomerNotes] = useState(item?.customerNotes ?? "");
  if (!user || !item) return <EmptyState title="Quotation not found" description="This quotation is unavailable." />;
  return (
    <div className="space-y-6">
      <PageHeader title={`Terms · ${item.displayNumber}`} description="Commercial terms are configurable. Lead time is an estimate only." actions={<Button variant="outline" onClick={() => router.push(`/crm/quotations/${id}` as Route)}>Back</Button>} />
      <Card><CardContent className="grid gap-3 p-5 sm:grid-cols-2">
        <Select value={paymentTerms} onChange={(event) => setPaymentTerms(event.target.value as PaymentTermCode)}>{PAYMENT_TERM_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select>
        <Select value={deliveryTerms} onChange={(event) => setDeliveryTerms(event.target.value as DeliveryTermCode)}>{DELIVERY_TERM_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select>
        <Input type="number" min={0} value={leadTime} onChange={(event) => setLeadTime(Number(event.target.value))} placeholder="Estimated lead time" />
        <Select defaultValue="DAYS">{LEAD_TIME_UNIT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select>
        <Input type="number" min={0} value={headerDiscount} onChange={(event) => setHeaderDiscount(Number(event.target.value))} placeholder="Header discount %" />
        <Input value={customerNotes} onChange={(event) => setCustomerNotes(event.target.value)} placeholder="Customer-facing notes" />
        <Button className="sm:col-span-2" onClick={async () => {
          try {
            await saveQuotationTerms(id, {
              paymentTerms,
              deliveryTerms,
              estimatedLeadTime: leadTime,
              leadTimeUnit: "DAYS",
              headerDiscountType: "PERCENTAGE",
              headerDiscountValue: headerDiscount,
              customerNotes,
            }, user);
            toast.success("Terms saved");
          } catch (error) { toast.error(toUserMessage(error)); }
        }}>Save terms</Button>
      </CardContent></Card>
    </div>
  );
}

export function QuotationHeaderEditor({ id }: { id: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const item = useQuotationStore((state) => state.quotations.find((row) => row.id === id));
  const people = useIdentityStore((state) => state.users);
  const [salesOwner, setSalesOwner] = useState(item?.salesOwner ?? "");
  const [validUntil, setValidUntil] = useState(item?.validUntil ?? "");
  const [customerNotes, setCustomerNotes] = useState(item?.customerNotes ?? "");
  const [internalNotes, setInternalNotes] = useState(item?.internalNotes ?? "");
  if (!user || !item) return <EmptyState title="Quotation not found" description="This quotation is unavailable." />;
  return (
    <div className="space-y-6">
      <PageHeader title={`Edit · ${item.displayNumber}`} description="Source customer, enquiry and costing remain read-only references." actions={<Button variant="outline" onClick={() => router.push(`/crm/quotations/${id}` as Route)}>Back</Button>} />
      <Card><CardContent className="grid gap-3 p-5 sm:grid-cols-2">
        <Select value={salesOwner} onChange={(event) => setSalesOwner(event.target.value)}>{people.map((person) => <option key={person.id} value={person.id}>{person.displayName}</option>)}</Select>
        <Input type="date" value={validUntil} onChange={(event) => setValidUntil(event.target.value)} />
        <Input value={customerNotes} onChange={(event) => setCustomerNotes(event.target.value)} placeholder="Customer notes" />
        <Input value={internalNotes} onChange={(event) => setInternalNotes(event.target.value)} placeholder="Internal notes" />
        <Button className="sm:col-span-2" onClick={async () => {
          try {
            await updateQuotation(id, {
              salesOwner,
              quotationDate: item.quotationDate,
              validUntil,
              customerNotes,
              internalNotes,
              contactId: item.contactId ?? "",
              notes: item.notes ?? "",
              billingAddress: item.customer.billingAddress ?? "",
              shippingAddress: item.customer.shippingAddress ?? "",
            }, user);
            toast.success("Quotation updated");
          } catch (error) { toast.error(toUserMessage(error)); }
        }}>Save header</Button>
      </CardContent></Card>
    </div>
  );
}
