import { addMinor, amountInWords, percentOfMinor, subtractMinor } from "@/lib/money";
import type { DiscountType, TaxType } from "@/constants/quotations";
import type { QuotationCharge, QuotationLine, QuotationTotals } from "@/types/quotations";

export function calculateLineSubtotal(quantity: number, unitPriceMinor: number): number {
  if (quantity <= 0) throw new Error("Quantity must be greater than zero.");
  if (unitPriceMinor < 0) throw new Error("Unit price cannot be negative.");
  return Math.round(quantity * Math.round(unitPriceMinor));
}

export function calculateDiscount(subtotalMinor: number, type: DiscountType, value: number): number {
  if (value < 0) throw new Error("Discount cannot be negative.");
  const discount = type === "PERCENTAGE" ? percentOfMinor(subtotalMinor, value) : Math.round(value * 100);
  if (discount > subtotalMinor) throw new Error("Discount cannot exceed the line subtotal.");
  return discount;
}

export function calculateTax(taxableMinor: number, taxRate: number): number {
  if (taxRate < 0) throw new Error("Tax cannot be below zero.");
  return percentOfMinor(taxableMinor, taxRate);
}

export function calculateLine(input: {
  quantity: number;
  unitPriceMinor: number;
  discountType: DiscountType;
  discountValue: number;
  taxRate: number;
}): Pick<QuotationLine, "lineSubtotalMinor" | "discountAmountMinor" | "taxAmountMinor" | "lineTotalMinor"> {
  const lineSubtotalMinor = calculateLineSubtotal(input.quantity, input.unitPriceMinor);
  const discountAmountMinor = calculateDiscount(lineSubtotalMinor, input.discountType, input.discountValue);
  const taxable = subtractMinor(lineSubtotalMinor, discountAmountMinor);
  const taxAmountMinor = calculateTax(taxable, input.taxRate);
  const lineTotalMinor = addMinor(taxable, taxAmountMinor);
  if (lineTotalMinor < 0) throw new Error("Line total cannot be negative.");
  return { lineSubtotalMinor, discountAmountMinor, taxAmountMinor, lineTotalMinor };
}

export function calculateAdditionalCharges(charges: QuotationCharge[]): number {
  return addMinor(...charges.map((line) => line.amountMinor));
}

export function calculateQuotationSubtotal(lines: QuotationLine[]): number {
  return addMinor(...lines.map((line) => line.lineSubtotalMinor));
}

export function calculateGrandTotal(input: {
  lines: QuotationLine[];
  charges: QuotationCharge[];
  headerDiscountType: DiscountType;
  headerDiscountValue: number;
  currency: string;
}): QuotationTotals {
  const lines = input.lines.map((line) => ({
    ...line,
    ...calculateLine({
      quantity: line.quantity,
      unitPriceMinor: line.unitPriceMinor,
      discountType: line.discountType,
      discountValue: line.discountValue,
      taxRate: line.taxRate,
    }),
  }));
  const subtotalMinor = calculateQuotationSubtotal(lines);
  const itemDiscountMinor = addMinor(...lines.map((line) => line.discountAmountMinor));
  const afterItemDiscount = subtractMinor(subtotalMinor, itemDiscountMinor);
  const headerDiscountMinor = calculateDiscount(afterItemDiscount, input.headerDiscountType, input.headerDiscountValue);
  const additionalChargesMinor = calculateAdditionalCharges(input.charges);
  const taxableAmountMinor = addMinor(subtractMinor(afterItemDiscount, headerDiscountMinor), additionalChargesMinor);
  const taxAmountMinor = addMinor(...lines.map((line) => line.taxAmountMinor));
  const grandTotalMinor = addMinor(taxableAmountMinor, taxAmountMinor);
  if (grandTotalMinor < 0) throw new Error("Grand total cannot be negative.");

  const taxBy = (type: TaxType) => addMinor(...lines.filter((line) => line.taxType === type).map((line) => line.taxAmountMinor));

  return {
    subtotalMinor,
    discountAmountMinor: addMinor(itemDiscountMinor, headerDiscountMinor),
    additionalChargesMinor,
    taxableAmountMinor,
    taxAmountMinor,
    cgstMinor: taxBy("CGST"),
    sgstMinor: taxBy("SGST"),
    igstMinor: taxBy("IGST"),
    otherTaxMinor: taxBy("OTHER"),
    grandTotalMinor,
    amountInWords: amountInWords(grandTotalMinor, input.currency),
  };
}

export function emptyQuotationTotals(currency = "INR"): QuotationTotals {
  return {
    subtotalMinor: 0,
    discountAmountMinor: 0,
    additionalChargesMinor: 0,
    taxableAmountMinor: 0,
    taxAmountMinor: 0,
    cgstMinor: 0,
    sgstMinor: 0,
    igstMinor: 0,
    otherTaxMinor: 0,
    grandTotalMinor: 0,
    amountInWords: amountInWords(0, currency),
  };
}
