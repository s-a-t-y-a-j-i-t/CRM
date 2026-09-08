import { authorizeClient } from "@/lib/auth/authorize-client";
import { assertCan } from "@/lib/rbac/can";
import { toMinorUnits } from "@/lib/money";
import { AppError } from "@/lib/errors";
import { useCostingStore } from "@/stores/costing-store";
import { assertCanEditCosting, getCostingById } from "@/services/costing/costing.service";
import type { ManufacturingValues, PriceAdjustmentValues, PricingValues } from "@/schemas/costing";
import type { AuthenticatedUser } from "@/types/rbac";
import type { CostSheet, CostingVolumeTier } from "@/types/costing";
import type { OverheadMode, OverheadType, QualityActivity } from "@/constants/costing";
import type { CurrencyCode } from "@/types/common";

function moneyCurrency(currency: string): CurrencyCode {
  if (currency === "USD" || currency === "EUR" || currency === "GBP") return currency;
  return "INR";
}

export async function saveManufacturing(costingId: string, values: ManufacturingValues, actor: AuthenticatedUser): Promise<CostSheet> {
  assertCan(actor, "costing.update");
  await authorizeClient("costing.update");
  const costing = getCostingById(costingId, actor);
  assertCanEditCosting(costing);
  const currency = moneyCurrency(costing.currency);
  useCostingStore.getState().upsertManufacturing({
    costingId,
    manufacturingSite: values.manufacturingSite || undefined,
    manufacturingUnit: values.manufacturingUnit || undefined,
    productionLine: values.productionLine || undefined,
    batchSize: values.batchSize,
    numberOfBatches: values.numberOfBatches,
    setupCostMinor: toMinorUnits(values.setupCost, currency),
    changeoverCostMinor: toMinorUnits(values.changeoverCost, currency),
    processingCostMinor: toMinorUnits(values.processingCost, currency),
    cleaningCostMinor: toMinorUnits(values.cleaningCost, currency),
    labor: values.labor.map((line) => ({
      id: `clab_${crypto.randomUUID().slice(0, 8)}`,
      department: line.department,
      category: line.category,
      hours: line.hours,
      hourlyCostMinor: toMinorUnits(line.hourlyCost, currency),
      totalCostMinor: Math.round(line.hours * toMinorUnits(line.hourlyCost, currency)),
    })),
    machines: values.machines.map((line) => ({
      id: `cmac_${crypto.randomUUID().slice(0, 8)}`,
      machine: line.machine,
      machineHours: line.machineHours,
      hourlyRateMinor: toMinorUnits(line.hourlyRate, currency),
      totalCostMinor: Math.round(line.machineHours * toMinorUnits(line.hourlyRate, currency)),
    })),
    utilities: values.utilities.map((line) => ({
      id: `cutl_${crypto.randomUUID().slice(0, 8)}`,
      utilityType: line.utilityType,
      consumption: line.consumption,
      unit: line.unit,
      rateMinor: toMinorUnits(line.rate, currency),
      totalCostMinor: Math.round(line.consumption * toMinorUnits(line.rate, currency)),
    })),
  });
  return useCostingStore.getState().recalculate(costingId);
}

export async function savePricing(costingId: string, values: PricingValues, actor: AuthenticatedUser): Promise<CostSheet> {
  assertCan(actor, "costing.update");
  await authorizeClient("costing.update");
  const costing = getCostingById(costingId, actor);
  assertCanEditCosting(costing);
  useCostingStore.getState().updateCosting(costingId, { marginType: values.marginType, marginValue: values.marginValue }, actor);
  return useCostingStore.getState().recalculate(costingId);
}

export async function saveVolumeTiers(costingId: string, tiers: Array<{ minimumQuantity: number; maximumQuantity?: number; unitPrice: number; marginPercent?: number }>, actor: AuthenticatedUser): Promise<CostingVolumeTier[]> {
  assertCan(actor, "costing.update");
  await authorizeClient("costing.update");
  const costing = getCostingById(costingId, actor);
  assertCanEditCosting(costing);
  const currency = moneyCurrency(costing.currency);
  const sorted = [...tiers].sort((a, b) => a.minimumQuantity - b.minimumQuantity);
  for (let index = 1; index < sorted.length; index += 1) {
    const prev = sorted[index - 1];
    const current = sorted[index];
    if (!prev || !current) continue;
    if (current.minimumQuantity <= (prev.maximumQuantity ?? Number.POSITIVE_INFINITY)) {
      throw new AppError("VALIDATION", "Quantity tiers cannot overlap.", 400);
    }
  }
  const next = sorted.map((tier) => ({
    id: `ctier_${crypto.randomUUID().slice(0, 8)}`,
    costingId,
    minimumQuantity: tier.minimumQuantity,
    maximumQuantity: tier.maximumQuantity,
    unitPriceMinor: toMinorUnits(tier.unitPrice, currency),
    marginPercent: tier.marginPercent,
  }));
  useCostingStore.getState().replaceTiers(costingId, next);
  return next;
}

export async function saveQualityLines(
  costingId: string,
  lines: Array<{ activity: QualityActivity; quantity: number; unitCost: number; remarks?: string }>,
  actor: AuthenticatedUser,
): Promise<CostSheet> {
  assertCan(actor, "costing.update");
  await authorizeClient("costing.update");
  const costing = getCostingById(costingId, actor);
  assertCanEditCosting(costing);
  const currency = moneyCurrency(costing.currency);
  useCostingStore.getState().replaceQuality(
    costingId,
    lines.map((line) => {
      const unitCostMinor = toMinorUnits(line.unitCost, currency);
      return {
        id: `cqc_${crypto.randomUUID().slice(0, 8)}`,
        costingId,
        activity: line.activity,
        quantity: line.quantity,
        unitCostMinor,
        totalCostMinor: Math.round(line.quantity * unitCostMinor),
        remarks: line.remarks,
      };
    }),
  );
  return useCostingStore.getState().recalculate(costingId);
}

export async function saveActivityCostLines(
  costingId: string,
  kind: "regulatory" | "documentation",
  lines: Array<{ activity: string; cost: number; remarks?: string }>,
  actor: AuthenticatedUser,
): Promise<CostSheet> {
  assertCan(actor, "costing.update");
  await authorizeClient("costing.update");
  const costing = getCostingById(costingId, actor);
  assertCanEditCosting(costing);
  const currency = moneyCurrency(costing.currency);
  const next = lines.map((line) => ({
    id: `cact_${crypto.randomUUID().slice(0, 8)}`,
    costingId,
    activity: line.activity,
    costMinor: toMinorUnits(line.cost, currency),
    remarks: line.remarks,
  }));
  if (kind === "regulatory") useCostingStore.getState().replaceRegulatory(costingId, next);
  else useCostingStore.getState().replaceDocumentation(costingId, next);
  return useCostingStore.getState().recalculate(costingId);
}

export async function saveOverhead(
  costingId: string,
  lines: Array<{ overheadType: OverheadType; mode: OverheadMode; percent?: number; amount?: number; remarks?: string }>,
  actor: AuthenticatedUser,
): Promise<CostSheet> {
  assertCan(actor, "costing.update");
  await authorizeClient("costing.update");
  const costing = getCostingById(costingId, actor);
  assertCanEditCosting(costing);
  const currency = moneyCurrency(costing.currency);
  useCostingStore.getState().replaceOverhead(
    costingId,
    lines.map((line) => ({
      id: `covh_${crypto.randomUUID().slice(0, 8)}`,
      costingId,
      overheadType: line.overheadType,
      mode: line.mode,
      percent: line.percent,
      amountMinor: line.amount != null ? toMinorUnits(line.amount, currency) : undefined,
      totalCostMinor: 0,
      remarks: line.remarks,
    })),
  );
  return useCostingStore.getState().recalculate(costingId);
}

export async function applyPriceAdjustment(costingId: string, values: PriceAdjustmentValues, actor: AuthenticatedUser): Promise<CostSheet> {
  assertCan(actor, "costing.adjust");
  await authorizeClient("costing.adjust");
  const costing = getCostingById(costingId, actor);
  assertCanEditCosting(costing);
  const currency = moneyCurrency(costing.currency);
  useCostingStore.getState().addAdjustment(
    {
      costingId,
      scope: "PRICE",
      adjustmentType: values.type,
      amountMinor: values.amount ? toMinorUnits(values.amount, currency) : undefined,
      percentage: values.percentage,
      reason: values.reason,
      approvedBy: actor.uid,
      approvedByName: actor.displayName,
    },
    actor,
  );
  return useCostingStore.getState().recalculate(costingId);
}
