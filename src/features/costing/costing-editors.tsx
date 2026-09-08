"use client";

import { useState, type ReactNode } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { useAuth } from "@/hooks/useAuth";
import { useCostingStore } from "@/stores/costing-store";
import { listMaterials, saveMaterials } from "@/services/costing/costing-material.service";
import { listPackaging, savePackaging } from "@/services/costing/costing-packaging.service";
import {
  applyPriceAdjustment,
  saveActivityCostLines,
  saveManufacturing,
  saveOverhead,
  savePricing,
  saveQualityLines,
  saveVolumeTiers,
} from "@/services/costing/costing-pricing.service";
import { fromMinorUnits } from "@/lib/money";
import { toUserMessage } from "@/lib/errors";
import {
  LABOR_CATEGORY_OPTIONS,
  MARGIN_TYPE_OPTIONS,
  MATERIAL_TYPE_OPTIONS,
  PACKAGING_LEVEL_OPTIONS,
  PRICE_ADJUSTMENT_TYPE_OPTIONS,
  UTILITY_TYPE_OPTIONS,
} from "@/constants/costing";
import type { MarginType, MaterialType, PackagingLevel } from "@/constants/costing";
import type { CurrencyCode } from "@/types/common";

function moneyCurrency(currency: string): CurrencyCode {
  if (currency === "USD" || currency === "EUR" || currency === "GBP") return currency;
  return "INR";
}

export function CostingEditorShell({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  const router = useRouter();
  const item = useCostingStore((state) => state.costings.find((row) => row.id === id));
  if (!item) return <EmptyState title="Costing not found" description="This sheet is unavailable." />;
  return (
    <div className="space-y-6">
      <PageHeader title={`${title} · ${item.displayNumber}`} description="Authoritative totals are recalculated in the costing engine." actions={<Button variant="outline" onClick={() => router.push(`/crm/costing/${id}` as Route)}>Back</Button>} />
      {children}
    </div>
  );
}

export function MaterialsEditor({ id }: { id: string }) {
  const { user } = useAuth();
  const item = useCostingStore((state) => state.costings.find((row) => row.id === id));
  const existing = listMaterials(id);
  const [rows, setRows] = useState(existing.map((line) => ({
    materialType: line.materialType,
    materialName: line.materialName,
    quantityRequired: line.quantityRequired,
    unit: line.unit,
    unitCost: Number(fromMinorUnits(line.unitCostMinor, moneyCurrency(item?.currency ?? "INR"))),
    wastagePercent: line.wastagePercent,
    supplierId: line.supplierId ?? "",
    remarks: line.remarks ?? "",
  })));
  if (!user || !item) return null;
  return (
    <CostingEditorShell id={id} title="Materials">
      <Card><CardContent className="space-y-3 p-5">
        {rows.map((row, index) => (
          <div key={index} className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-6">
            <Select value={row.materialType} onChange={(event) => setRows((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, materialType: event.target.value as MaterialType } : item))}>{MATERIAL_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select>
            <Input value={row.materialName} placeholder="Name" onChange={(event) => setRows((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, materialName: event.target.value } : item))} />
            <Input type="number" min={0} step="0.0001" value={row.quantityRequired} onChange={(event) => setRows((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, quantityRequired: Number(event.target.value) } : item))} />
            <Input value={row.unit} onChange={(event) => setRows((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, unit: event.target.value } : item))} />
            <Input type="number" min={0} step="0.01" value={row.unitCost} onChange={(event) => setRows((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, unitCost: Number(event.target.value) } : item))} />
            <Input type="number" min={0} step="0.01" value={row.wastagePercent} placeholder="Wastage %" onChange={(event) => setRows((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, wastagePercent: Number(event.target.value) } : item))} />
          </div>
        ))}
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setRows((current) => [...current, { materialType: "EXCIPIENT", materialName: "", quantityRequired: 1, unit: "kg", unitCost: 0, wastagePercent: 0, supplierId: "", remarks: "" }])}>Add line</Button>
          <Button onClick={async () => { try { await saveMaterials(id, rows, user); toast.success("Materials recalculated"); } catch (error) { toast.error(toUserMessage(error)); } }}>Save materials</Button>
        </div>
      </CardContent></Card>
    </CostingEditorShell>
  );
}

export function PackagingEditor({ id }: { id: string }) {
  const { user } = useAuth();
  const item = useCostingStore((state) => state.costings.find((row) => row.id === id));
  const existing = listPackaging(id);
  const [rows, setRows] = useState(existing.map((line) => ({
    level: line.level,
    materialName: line.materialName,
    packagingType: line.packagingType ?? "",
    packSize: line.packSize ?? "",
    quantityRequired: line.quantityRequired,
    unit: line.unit,
    unitCost: Number(fromMinorUnits(line.unitCostMinor, moneyCurrency(item?.currency ?? "INR"))),
    wastagePercent: line.wastagePercent,
    remarks: line.remarks ?? "",
  })));
  if (!user || !item) return null;
  return (
    <CostingEditorShell id={id} title="Packaging">
      <Card><CardContent className="space-y-3 p-5">
        {rows.map((row, index) => (
          <div key={index} className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-6">
            <Select value={row.level} onChange={(event) => setRows((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, level: event.target.value as PackagingLevel } : item))}>{PACKAGING_LEVEL_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select>
            <Input value={row.materialName} placeholder="Material" onChange={(event) => setRows((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, materialName: event.target.value } : item))} />
            <Input type="number" min={0} value={row.quantityRequired} onChange={(event) => setRows((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, quantityRequired: Number(event.target.value) } : item))} />
            <Input value={row.unit} onChange={(event) => setRows((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, unit: event.target.value } : item))} />
            <Input type="number" min={0} step="0.01" value={row.unitCost} onChange={(event) => setRows((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, unitCost: Number(event.target.value) } : item))} />
            <Input type="number" min={0} step="0.01" value={row.wastagePercent} onChange={(event) => setRows((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, wastagePercent: Number(event.target.value) } : item))} />
          </div>
        ))}
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setRows((current) => [...current, { level: "PRIMARY", materialName: "", packagingType: "", packSize: "", quantityRequired: 1, unit: "nos", unitCost: 0, wastagePercent: 0, remarks: "" }])}>Add line</Button>
          <Button onClick={async () => { try { await savePackaging(id, rows, user); toast.success("Packaging recalculated"); } catch (error) { toast.error(toUserMessage(error)); } }}>Save packaging</Button>
        </div>
      </CardContent></Card>
    </CostingEditorShell>
  );
}

export function ManufacturingEditor({ id }: { id: string }) {
  const { user } = useAuth();
  const manufacturing = useCostingStore((state) => state.manufacturing.find((row) => row.costingId === id));
  const item = useCostingStore((state) => state.costings.find((row) => row.id === id));
  const currency = moneyCurrency(item?.currency ?? "INR");
  const [site, setSite] = useState(manufacturing?.manufacturingSite ?? "");
  const [line, setLine] = useState(manufacturing?.productionLine ?? "");
  const [setup, setSetup] = useState(manufacturing ? Number(fromMinorUnits(manufacturing.setupCostMinor, currency)) : 0);
  const [hours, setHours] = useState(manufacturing?.labor[0]?.hours ?? 8);
  const [hourly, setHourly] = useState(manufacturing?.labor[0] ? Number(fromMinorUnits(manufacturing.labor[0].hourlyCostMinor, currency)) : 0);
  const [machineHours, setMachineHours] = useState(manufacturing?.machines[0]?.machineHours ?? 0);
  const [machineRate, setMachineRate] = useState(manufacturing?.machines[0] ? Number(fromMinorUnits(manufacturing.machines[0].hourlyRateMinor, currency)) : 0);
  const [consumption, setConsumption] = useState(manufacturing?.utilities[0]?.consumption ?? 0);
  const [rate, setRate] = useState(manufacturing?.utilities[0] ? Number(fromMinorUnits(manufacturing.utilities[0].rateMinor, currency)) : 0);
  if (!user) return null;
  return (
    <CostingEditorShell id={id} title="Manufacturing">
      <Card><CardContent className="grid gap-3 p-5 sm:grid-cols-2">
        <Input value={site} onChange={(event) => setSite(event.target.value)} placeholder="Manufacturing site" />
        <Input value={line} onChange={(event) => setLine(event.target.value)} placeholder="Production line" />
        <Input type="number" min={0} value={setup} onChange={(event) => setSetup(Number(event.target.value))} placeholder="Setup cost" />
        <Select defaultValue="PRODUCTION_OPERATOR">{LABOR_CATEGORY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select>
        <Input type="number" min={0} value={hours} onChange={(event) => setHours(Number(event.target.value))} placeholder="Labor hours" />
        <Input type="number" min={0} value={hourly} onChange={(event) => setHourly(Number(event.target.value))} placeholder="Hourly cost" />
        <Input type="number" min={0} value={machineHours} onChange={(event) => setMachineHours(Number(event.target.value))} placeholder="Machine hours" />
        <Input type="number" min={0} value={machineRate} onChange={(event) => setMachineRate(Number(event.target.value))} placeholder="Machine rate" />
        <Select defaultValue="ELECTRICITY">{UTILITY_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select>
        <Input type="number" min={0} value={consumption} onChange={(event) => setConsumption(Number(event.target.value))} placeholder="Utility consumption" />
        <Input type="number" min={0} value={rate} onChange={(event) => setRate(Number(event.target.value))} placeholder="Utility rate" />
        <Button className="sm:col-span-2" onClick={async () => {
          try {
            await saveManufacturing(id, {
              manufacturingSite: site,
              productionLine: line,
              setupCost: setup,
              changeoverCost: 0,
              processingCost: 0,
              cleaningCost: 0,
              labor: [{ department: "Production", category: "PRODUCTION_OPERATOR", hours, hourlyCost: hourly }],
              machines: machineHours ? [{ machine: "Production machine", machineHours, hourlyRate: machineRate }] : [],
              utilities: consumption ? [{ utilityType: "ELECTRICITY", consumption, unit: "kWh", rate }] : [],
            }, user);
            toast.success("Manufacturing recalculated");
          } catch (error) { toast.error(toUserMessage(error)); }
        }}>Save manufacturing</Button>
      </CardContent></Card>
    </CostingEditorShell>
  );
}

export function PricingEditor({ id }: { id: string }) {
  const { user } = useAuth();
  const item = useCostingStore((state) => state.costings.find((row) => row.id === id));
  const [marginType, setMarginType] = useState<MarginType>(item?.marginType ?? "PERCENTAGE_MARGIN");
  const [marginValue, setMarginValue] = useState(item?.marginValue ?? 0);
  const [discount, setDiscount] = useState(0);
  const [discountReason, setDiscountReason] = useState("");
  if (!user || !item) return null;
  return (
    <CostingEditorShell id={id} title="Pricing">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card><CardHeader><CardTitle>Margin / markup</CardTitle></CardHeader><CardContent className="space-y-3">
          <Select value={marginType} onChange={(event) => setMarginType(event.target.value as MarginType)}>{MARGIN_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select>
          <Input type="number" min={0} step="0.01" value={marginValue} onChange={(event) => setMarginValue(Number(event.target.value))} />
          <p className="text-xs text-muted-foreground">Percentage margin uses cost / (1 − margin). Markup uses cost × (1 + markup). Fixed margin adds a rupee amount stored in major units.</p>
          <Button onClick={async () => { try { await savePricing(id, { marginType, marginValue }, user); toast.success("Price recalculated"); } catch (error) { toast.error(toUserMessage(error)); } }}>Save pricing</Button>
        </CardContent></Card>
        <Card><CardHeader><CardTitle>Price adjustment</CardTitle></CardHeader><CardContent className="space-y-3">
          <Select defaultValue="DISCOUNT">{PRICE_ADJUSTMENT_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select>
          <Input type="number" min={0} value={discount} onChange={(event) => setDiscount(Number(event.target.value))} placeholder="Percentage" />
          <Input value={discountReason} onChange={(event) => setDiscountReason(event.target.value)} placeholder="Reason" />
          <Button onClick={async () => {
            try {
              await applyPriceAdjustment(id, { type: "DISCOUNT", percentage: discount, reason: discountReason }, user);
              toast.success("Adjustment audited");
            } catch (error) { toast.error(toUserMessage(error)); }
          }}>Apply adjustment</Button>
        </CardContent></Card>
        <Card><CardHeader><CardTitle>Volume tiers</CardTitle></CardHeader><CardContent>
          <Button variant="outline" onClick={async () => {
            try {
              await saveVolumeTiers(id, [
                { minimumQuantity: 0, maximumQuantity: 10000, unitPrice: 1.2, marginPercent: 18 },
                { minimumQuantity: 10001, maximumQuantity: 50000, unitPrice: 1.1, marginPercent: 20 },
                { minimumQuantity: 50001, unitPrice: 1, marginPercent: 22 },
              ], user);
              toast.success("Tiers saved");
            } catch (error) { toast.error(toUserMessage(error)); }
          }}>Save sample non-overlapping tiers</Button>
        </CardContent></Card>
        <Card><CardHeader><CardTitle>Other cost blocks</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={async () => { try { await saveQualityLines(id, [{ activity: "QC_TESTING", quantity: 1, unitCost: 1000 }], user); toast.success("Quality saved"); } catch (error) { toast.error(toUserMessage(error)); } }}>Add QC line</Button>
          <Button variant="outline" onClick={async () => { try { await saveActivityCostLines(id, "regulatory", [{ activity: "REGISTRATION", cost: 500 }], user); toast.success("Regulatory saved"); } catch (error) { toast.error(toUserMessage(error)); } }}>Add regulatory</Button>
          <Button variant="outline" onClick={async () => { try { await saveActivityCostLines(id, "documentation", [{ activity: "BATCH_DOCUMENTATION", cost: 250 }], user); toast.success("Documentation saved"); } catch (error) { toast.error(toUserMessage(error)); } }}>Add documentation</Button>
          <Button variant="outline" onClick={async () => { try { await saveOverhead(id, [{ overheadType: "MANUFACTURING", mode: "PERCENTAGE", percent: 8 }], user); toast.success("Overhead saved"); } catch (error) { toast.error(toUserMessage(error)); } }}>Set 8% overhead</Button>
        </CardContent></Card>
      </div>
    </CostingEditorShell>
  );
}
