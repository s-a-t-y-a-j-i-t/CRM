import { AppError } from "@/lib/errors";
import {
  addMinor,
  applyWastageScaled,
  percentOfMinor,
  qtyCostMinor,
  sellingPriceFromMargin,
  sellingPriceFromMarkup,
  subtractMinor,
  toQtyScaled,
} from "@/lib/money";
import type {
  CostingAdjustment,
  CostingManufacturing,
  CostingMaterialLine,
  CostingOverheadLine,
  CostingPackagingLine,
  CostingQualityLine,
  CostingActivityCostLine,
  CostSheet,
  CostingTotals,
} from "@/types/costing";

function emptyTotals(): CostingTotals {
  return {
    materialCostMinor: 0,
    apiCostMinor: 0,
    excipientCostMinor: 0,
    processMaterialCostMinor: 0,
    packagingCostMinor: 0,
    primaryPackagingCostMinor: 0,
    secondaryPackagingCostMinor: 0,
    tertiaryPackagingCostMinor: 0,
    manufacturingCostMinor: 0,
    qualityCostMinor: 0,
    regulatoryCostMinor: 0,
    documentationCostMinor: 0,
    overheadCostMinor: 0,
    materialAdjustmentMinor: 0,
    totalCostMinor: 0,
    marginAmountMinor: 0,
    sellingPriceMinor: 0,
    unitCostMinor: 0,
    unitPriceMinor: 0,
    priceAdjustmentMinor: 0,
  };
}

export function calculateMaterialLine(input: {
  quantityRequired: number;
  unitCostMinor: number;
  wastagePercent: number;
}): { wastageQuantity: number; effectiveQuantity: number; totalCostMinor: number } {
  if (input.quantityRequired <= 0) {
    throw new AppError("VALIDATION", "Material quantity must be greater than zero.", 400);
  }
  if (input.unitCostMinor < 0 || input.wastagePercent < 0) {
    throw new AppError("VALIDATION", "Unit cost and wastage cannot be negative.", 400);
  }
  const requiredScaled = toQtyScaled(input.quantityRequired);
  const effectiveScaled = applyWastageScaled(requiredScaled, input.wastagePercent);
  const wastageScaled = effectiveScaled - requiredScaled;
  return {
    wastageQuantity: wastageScaled / 10_000,
    effectiveQuantity: effectiveScaled / 10_000,
    totalCostMinor: qtyCostMinor(effectiveScaled, input.unitCostMinor),
  };
}

export function calculateMaterialCost(lines: CostingMaterialLine[], adjustments: CostingAdjustment[]) {
  const apiCostMinor = addMinor(...lines.filter((line) => line.materialType === "API").map((line) => line.totalCostMinor));
  const excipientCostMinor = addMinor(...lines.filter((line) => line.materialType === "EXCIPIENT").map((line) => line.totalCostMinor));
  const processMaterialCostMinor = addMinor(
    ...lines.filter((line) => line.materialType === "PROCESS_MATERIAL" || line.materialType === "OTHER").map((line) => line.totalCostMinor),
  );
  const base = addMinor(apiCostMinor, excipientCostMinor, processMaterialCostMinor);
  const materialAdjustmentMinor = adjustments
    .filter((item) => item.scope === "MATERIAL")
    .reduce((sum, item) => {
      const amount = item.amountMinor ?? 0;
      return item.adjustmentType === "DECREASE" ? subtractMinor(sum, amount) : addMinor(sum, amount);
    }, 0);
  return {
    apiCostMinor,
    excipientCostMinor,
    processMaterialCostMinor,
    materialAdjustmentMinor,
    materialCostMinor: addMinor(base, materialAdjustmentMinor),
  };
}

export function calculatePackagingCost(lines: CostingPackagingLine[]) {
  const primaryPackagingCostMinor = addMinor(...lines.filter((line) => line.level === "PRIMARY").map((line) => line.totalCostMinor));
  const secondaryPackagingCostMinor = addMinor(...lines.filter((line) => line.level === "SECONDARY").map((line) => line.totalCostMinor));
  const tertiaryPackagingCostMinor = addMinor(...lines.filter((line) => line.level === "TERTIARY").map((line) => line.totalCostMinor));
  return {
    primaryPackagingCostMinor,
    secondaryPackagingCostMinor,
    tertiaryPackagingCostMinor,
    packagingCostMinor: addMinor(primaryPackagingCostMinor, secondaryPackagingCostMinor, tertiaryPackagingCostMinor),
  };
}

export function calculateManufacturingCost(manufacturing: CostingManufacturing | undefined) {
  if (!manufacturing) return 0;
  const labor = addMinor(...manufacturing.labor.map((line) => line.totalCostMinor));
  const machines = addMinor(...manufacturing.machines.map((line) => line.totalCostMinor));
  const utilities = addMinor(...manufacturing.utilities.map((line) => line.totalCostMinor));
  return addMinor(
    labor,
    machines,
    utilities,
    manufacturing.setupCostMinor,
    manufacturing.changeoverCostMinor,
    manufacturing.processingCostMinor,
    manufacturing.cleaningCostMinor,
  );
}

export function calculateQualityCost(lines: CostingQualityLine[]) {
  return addMinor(...lines.map((line) => line.totalCostMinor));
}

export function calculateRegulatoryCost(lines: CostingActivityCostLine[]) {
  return addMinor(...lines.map((line) => line.costMinor));
}

export function calculateDocumentationCost(lines: CostingActivityCostLine[]) {
  return addMinor(...lines.map((line) => line.costMinor));
}

export function calculateOverheadCost(
  lines: CostingOverheadLine[],
  baseMinor: number,
): { lines: CostingOverheadLine[]; overheadCostMinor: number } {
  const next = lines.map((line) => ({
    ...line,
    totalCostMinor: line.mode === "PERCENTAGE" ? percentOfMinor(baseMinor, line.percent ?? 0) : Math.round(line.amountMinor ?? 0),
  }));
  return { lines: next, overheadCostMinor: addMinor(...next.map((line) => line.totalCostMinor)) };
}

export function calculateMargin(costMinor: number, marginType: CostSheet["marginType"], marginValue: number): {
  sellingPriceMinor: number;
  marginAmountMinor: number;
} {
  if (costMinor < 0) throw new AppError("VALIDATION", "Total cost cannot be negative.", 400);
  let sellingPriceMinor = costMinor;
  if (marginType === "PERCENTAGE_MARGIN") {
    sellingPriceMinor = sellingPriceFromMargin(costMinor, marginValue);
  } else if (marginType === "MARKUP") {
    sellingPriceMinor = sellingPriceFromMarkup(costMinor, marginValue);
  } else {
    sellingPriceMinor = addMinor(costMinor, Math.round(marginValue));
  }
  return { sellingPriceMinor, marginAmountMinor: subtractMinor(sellingPriceMinor, costMinor) };
}

export function calculateSellingPrice(
  costMinor: number,
  marginType: CostSheet["marginType"],
  marginValue: number,
  priceAdjustments: CostingAdjustment[],
): { sellingPriceMinor: number; marginAmountMinor: number; priceAdjustmentMinor: number } {
  const priced = calculateMargin(costMinor, marginType, marginValue);
  const priceAdjustmentMinor = priceAdjustments
    .filter((item) => item.scope === "PRICE")
    .reduce((sum, item) => {
      const amount = item.amountMinor ?? percentOfMinor(priced.sellingPriceMinor, item.percentage ?? 0);
      if (item.adjustmentType === "DISCOUNT" || item.adjustmentType === "DECREASE") {
        return subtractMinor(sum, amount);
      }
      return addMinor(sum, amount);
    }, 0);
  const sellingPriceMinor = addMinor(priced.sellingPriceMinor, priceAdjustmentMinor);
  return {
    sellingPriceMinor,
    marginAmountMinor: subtractMinor(sellingPriceMinor, costMinor),
    priceAdjustmentMinor,
  };
}

export function calculateTotalCost(input: {
  materials: CostingMaterialLine[];
  packaging: CostingPackagingLine[];
  manufacturing?: CostingManufacturing;
  quality: CostingQualityLine[];
  regulatory: CostingActivityCostLine[];
  documentation: CostingActivityCostLine[];
  overhead: CostingOverheadLine[];
  adjustments: CostingAdjustment[];
  costing: Pick<CostSheet, "baseQuantity" | "marginType" | "marginValue">;
}): { totals: CostingTotals; overhead: CostingOverheadLine[] } {
  const material = calculateMaterialCost(input.materials, input.adjustments);
  const packaging = calculatePackagingCost(input.packaging);
  const manufacturingCostMinor = calculateManufacturingCost(input.manufacturing);
  const qualityCostMinor = calculateQualityCost(input.quality);
  const regulatoryCostMinor = calculateRegulatoryCost(input.regulatory);
  const documentationCostMinor = calculateDocumentationCost(input.documentation);
  const subtotal = addMinor(
    material.materialCostMinor,
    packaging.packagingCostMinor,
    manufacturingCostMinor,
    qualityCostMinor,
    regulatoryCostMinor,
    documentationCostMinor,
  );
  const overhead = calculateOverheadCost(input.overhead, subtotal);
  const totalCostMinor = addMinor(subtotal, overhead.overheadCostMinor);
  const priced = calculateSellingPrice(totalCostMinor, input.costing.marginType, input.costing.marginValue, input.adjustments);
  const qty = input.costing.baseQuantity;
  const unitCostMinor = qty > 0 ? Math.round(totalCostMinor / qty) : 0;
  const unitPriceMinor = qty > 0 ? Math.round(priced.sellingPriceMinor / qty) : 0;
  return {
    overhead: overhead.lines,
    totals: {
      ...emptyTotals(),
      ...material,
      ...packaging,
      manufacturingCostMinor,
      qualityCostMinor,
      regulatoryCostMinor,
      documentationCostMinor,
      overheadCostMinor: overhead.overheadCostMinor,
      totalCostMinor,
      marginAmountMinor: priced.marginAmountMinor,
      sellingPriceMinor: priced.sellingPriceMinor,
      unitCostMinor,
      unitPriceMinor,
      priceAdjustmentMinor: priced.priceAdjustmentMinor,
    },
  };
}

export function unitEconomics(costing: CostSheet) {
  const qty = costing.baseQuantity;
  const batches = costing.numberOfBatches && costing.numberOfBatches > 0 ? costing.numberOfBatches : undefined;
  const annual = costing.annualQuantity && costing.annualQuantity > 0 ? costing.annualQuantity : undefined;
  const perBatchCost = batches ? Math.round(costing.totals.totalCostMinor / batches) : undefined;
  const perBatchPrice = batches ? Math.round(costing.totals.sellingPriceMinor / batches) : undefined;
  return {
    costPerUnitMinor: costing.totals.unitCostMinor,
    sellingPricePerUnitMinor: costing.totals.unitPriceMinor,
    marginPerUnitMinor: qty ? Math.round(costing.totals.marginAmountMinor / qty) : 0,
    costPerBatchMinor: perBatchCost,
    sellingPricePerBatchMinor: perBatchPrice,
    annualCostMinor: annual ? Math.round((costing.totals.unitCostMinor * toQtyScaled(annual)) / 10_000) : undefined,
    annualRevenueMinor: annual ? Math.round((costing.totals.unitPriceMinor * toQtyScaled(annual)) / 10_000) : undefined,
    annualGrossMarginMinor: annual
      ? Math.round((costing.totals.marginAmountMinor / Math.max(qty, 1)) * annual)
      : undefined,
  };
}
