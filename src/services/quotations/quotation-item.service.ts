import { authorizeClient } from "@/lib/auth/authorize-client";
import { assertCan } from "@/lib/rbac/can";
import { toMinorUnits } from "@/lib/money";
import { useQuotationStore } from "@/stores/quotation-store";
import { useProductStore } from "@/stores/product-store";
import { assertCanEditQuotation, getQuotationById } from "@/services/quotations/quotation.service";
import { calculateLine } from "@/services/quotations/quotation-calculation.service";
import type { QuotationChargeValues, QuotationItemValues, QuotationTermsValues } from "@/schemas/quotations";
import type { AuthenticatedUser } from "@/types/rbac";
import type { CurrencyCode } from "@/types/common";
import type { CrmQuotation, QuotationCharge, QuotationLine } from "@/types/quotations";

function moneyCurrency(currency: string): CurrencyCode {
  if (currency === "USD" || currency === "EUR" || currency === "GBP") return currency;
  return "INR";
}

export function listQuotationItems(quotationId: string): QuotationLine[] {
  return useQuotationStore.getState().items
    .filter((item) => item.quotationId === quotationId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function listQuotationCharges(quotationId: string): QuotationCharge[] {
  return useQuotationStore.getState().charges.filter((item) => item.quotationId === quotationId);
}

export async function saveQuotationItems(quotationId: string, lines: QuotationItemValues[], actor: AuthenticatedUser): Promise<CrmQuotation> {
  assertCan(actor, "quotations.update");
  await authorizeClient("quotations.update");
  const quotation = getQuotationById(quotationId, actor);
  assertCanEditQuotation(quotation);
  const currency = moneyCurrency(quotation.currency);
  const next = lines.map((line, index) => {
    const unitPriceMinor = toMinorUnits(line.unitPrice, currency);
    const calc = calculateLine({
      quantity: line.quantity,
      unitPriceMinor,
      discountType: line.discountType,
      discountValue: line.discountValue,
      taxRate: line.taxRate,
    });
    const product = line.productId ? useProductStore.getState().products.find((item) => item.id === line.productId) : undefined;
    return {
      id: `qitem_${crypto.randomUUID().slice(0, 8)}`,
      quotationId,
      productId: line.productId || undefined,
      productName: line.productName || product?.productName || "Product",
      description: line.description || product?.genericName,
      dosageForm: line.dosageForm || product?.dosageForm,
      strength: line.strength || product?.strength,
      packaging: line.packaging,
      packSize: line.packSize,
      quantity: line.quantity,
      quantityUnit: line.quantityUnit,
      unitPriceMinor,
      discountType: line.discountType,
      discountValue: line.discountValue,
      taxType: line.taxType,
      taxRate: line.taxRate,
      costingId: line.costingId || quotation.costingId,
      moq: line.moq,
      remarks: line.remarks,
      sortOrder: index,
      ...calc,
    } satisfies QuotationLine;
  });
  useQuotationStore.getState().replaceItems(quotationId, next);
  return useQuotationStore.getState().recalculate(quotationId);
}

export async function saveQuotationCharges(quotationId: string, charges: QuotationChargeValues[], actor: AuthenticatedUser): Promise<CrmQuotation> {
  assertCan(actor, "quotations.update");
  await authorizeClient("quotations.update");
  const quotation = getQuotationById(quotationId, actor);
  assertCanEditQuotation(quotation);
  const currency = moneyCurrency(quotation.currency);
  useQuotationStore.getState().replaceCharges(
    quotationId,
    charges.map((line) => ({
      id: `qch_${crypto.randomUUID().slice(0, 8)}`,
      quotationId,
      chargeType: line.chargeType,
      description: line.description,
      amountMinor: toMinorUnits(line.amount, currency),
    })),
  );
  return useQuotationStore.getState().recalculate(quotationId);
}

export async function saveQuotationTerms(quotationId: string, values: QuotationTermsValues, actor: AuthenticatedUser): Promise<CrmQuotation> {
  assertCan(actor, "quotations.update");
  if (values.headerDiscountValue > 0) assertCan(actor, "quotations.discount");
  await authorizeClient("quotations.update");
  const quotation = getQuotationById(quotationId, actor);
  assertCanEditQuotation(quotation);
  useQuotationStore.getState().updateQuotation(quotationId, {
    headerDiscountType: values.headerDiscountType,
    headerDiscountValue: values.headerDiscountValue,
    customerNotes: values.customerNotes,
    terms: {
      paymentTerms: values.paymentTerms,
      paymentTermsCustom: values.paymentTermsCustom || undefined,
      deliveryTerms: values.deliveryTerms,
      deliveryTermsCustom: values.deliveryTermsCustom || undefined,
      shippingTerms: values.shippingTerms || undefined,
      priceBasis: values.priceBasis || undefined,
      estimatedLeadTime: values.estimatedLeadTime,
      leadTimeUnit: values.leadTimeUnit,
      packagingTerms: values.packagingTerms,
      artworkTerms: values.artworkTerms,
      sampleTerms: values.sampleTerms,
      regulatoryTerms: values.regulatoryTerms,
      cancellationTerms: values.cancellationTerms,
      otherTerms: values.otherTerms,
      taxesNote: values.taxesNote,
      freightNote: values.freightNote,
      moqNote: values.moqNote,
    },
  }, actor);
  return useQuotationStore.getState().recalculate(quotationId);
}
