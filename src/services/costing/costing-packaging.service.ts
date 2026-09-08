import { authorizeClient } from "@/lib/auth/authorize-client";
import { assertCan } from "@/lib/rbac/can";
import { toMinorUnits } from "@/lib/money";
import { useCostingStore } from "@/stores/costing-store";
import { assertCanEditCosting, getCostingById } from "@/services/costing/costing.service";
import { calculateMaterialLine } from "@/services/costing/cost-calculation.service";
import type { PackagingLineValues } from "@/schemas/costing";
import type { AuthenticatedUser } from "@/types/rbac";
import type { CostingPackagingLine, CostSheet } from "@/types/costing";

export function listPackaging(costingId: string): CostingPackagingLine[] {
  return useCostingStore.getState().packaging
    .filter((item) => item.costingId === costingId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function savePackaging(costingId: string, lines: PackagingLineValues[], actor: AuthenticatedUser): Promise<CostSheet> {
  assertCan(actor, "costing.update");
  await authorizeClient("costing.update");
  const costing = getCostingById(costingId, actor);
  assertCanEditCosting(costing);
  const currency = costing.currency === "OTHER" || costing.currency === "AED" ? "INR" : costing.currency;
  const next = lines.map((line, index) => {
    const unitCostMinor = toMinorUnits(line.unitCost, currency);
    const calc = calculateMaterialLine({
      quantityRequired: line.quantityRequired,
      unitCostMinor,
      wastagePercent: line.wastagePercent,
    });
    return {
      id: `cpack_${crypto.randomUUID().slice(0, 8)}`,
      costingId,
      level: line.level,
      materialName: line.materialName,
      packagingType: line.packagingType || undefined,
      packSize: line.packSize || undefined,
      quantityRequired: line.quantityRequired,
      unit: line.unit,
      unitCostMinor,
      wastagePercent: line.wastagePercent,
      effectiveQuantity: calc.effectiveQuantity,
      totalCostMinor: calc.totalCostMinor,
      remarks: line.remarks,
      sortOrder: index,
    } satisfies CostingPackagingLine;
  });
  useCostingStore.getState().replacePackaging(costingId, next);
  return useCostingStore.getState().recalculate(costingId);
}
