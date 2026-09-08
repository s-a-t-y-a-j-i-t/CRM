import { authorizeClient } from "@/lib/auth/authorize-client";
import { assertCan } from "@/lib/rbac/can";
import { toMinorUnits } from "@/lib/money";
import { AppError } from "@/lib/errors";
import type { CurrencyCode } from "@/types/common";

function moneyCurrency(currency: string): CurrencyCode {
  if (currency === "USD" || currency === "EUR" || currency === "GBP") return currency;
  return "INR";
}
import { useCostingStore } from "@/stores/costing-store";
import { assertCanEditCosting, getCostingById } from "@/services/costing/costing.service";
import { calculateMaterialLine } from "@/services/costing/cost-calculation.service";
import type { MaterialAdjustmentValues, MaterialLineValues } from "@/schemas/costing";
import type { AuthenticatedUser } from "@/types/rbac";
import type { CostingMaterialLine, CostSheet } from "@/types/costing";

export function listMaterials(costingId: string): CostingMaterialLine[] {
  return useCostingStore.getState().materials
    .filter((item) => item.costingId === costingId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function saveMaterials(costingId: string, lines: MaterialLineValues[], actor: AuthenticatedUser): Promise<CostSheet> {
  assertCan(actor, "costing.update");
  await authorizeClient("costing.update");
  const costing = getCostingById(costingId, actor);
  assertCanEditCosting(costing);
  const next = lines.map((line, index) => {
    const unitCostMinor = toMinorUnits(line.unitCost, moneyCurrency(costing.currency));
    const calc = calculateMaterialLine({
      quantityRequired: line.quantityRequired,
      unitCostMinor,
      wastagePercent: line.wastagePercent,
    });
    return {
      id: `cmat_${crypto.randomUUID().slice(0, 8)}`,
      costingId,
      materialType: line.materialType,
      materialName: line.materialName,
      quantityRequired: line.quantityRequired,
      unit: line.unit,
      unitCostMinor,
      wastagePercent: line.wastagePercent,
      wastageQuantity: calc.wastageQuantity,
      effectiveQuantity: calc.effectiveQuantity,
      totalCostMinor: calc.totalCostMinor,
      supplierId: line.supplierId || undefined,
      remarks: line.remarks,
      sortOrder: index,
    } satisfies CostingMaterialLine;
  });
  useCostingStore.getState().replaceMaterials(costingId, next);
  return useCostingStore.getState().recalculate(costingId);
}

export async function applyMaterialAdjustment(costingId: string, values: MaterialAdjustmentValues, actor: AuthenticatedUser): Promise<CostSheet> {
  assertCan(actor, "costing.adjust");
  await authorizeClient("costing.adjust");
  const costing = getCostingById(costingId, actor);
  assertCanEditCosting(costing);
  if (!values.reason.trim()) throw new AppError("VALIDATION", "An adjustment reason is required.", 400);
  const amountMinor = toMinorUnits(values.amount, moneyCurrency(costing.currency));
  useCostingStore.getState().addAdjustment(
    {
      costingId,
      scope: "MATERIAL",
      adjustmentType: values.adjustmentType,
      amountMinor,
      reason: values.reason,
      approvedBy: actor.uid,
      approvedByName: actor.displayName,
    },
    actor,
  );
  return useCostingStore.getState().recalculate(costingId);
}
