"use client";

import { useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { Calculator } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Timeline, TimelineItem } from "@/components/shared/timeline";
import { FileUpload } from "@/components/shared/file-upload";
import { Can } from "@/components/rbac/can";
import { useAuth } from "@/hooks/useAuth";
import { useCostingStore } from "@/stores/costing-store";
import { useAppStore } from "@/services/store";
import { useProductStore } from "@/stores/product-store";
import { formatCostingMoney } from "@/lib/money";
import { can as canPerm } from "@/lib/rbac/can";
import { formatDate, formatDateTime } from "@/lib/dates";
import { toUserMessage } from "@/lib/errors";
import {
  changeCostingStatus,
  createCostingVersion,
  getQuotationReadyCosting,
  isCostingExpired,
} from "@/services/costing/costing.service";
import { getQuotationsForCosting } from "@/services/quotations/quotation.service";
import { applyMaterialAdjustment, listMaterials } from "@/services/costing/costing-material.service";
import { listPackaging } from "@/services/costing/costing-packaging.service";
import { approveCosting, getApprovalHistory, rejectCosting, requiredApprovalLevel, submitForApproval } from "@/services/costing/costing-approval.service";
import { compareCostingVersions } from "@/services/costing/costing.service";
import { uploadCostingDocument } from "@/services/costing/costing-document.service";
import { unitEconomics } from "@/services/costing/cost-calculation.service";
import { COSTING_TRANSITIONS } from "@/services/costing/costing-workflow.service";
import {
  ADJUSTMENT_TYPE_OPTIONS,
  pharmaLabel,
} from "@/constants/costing";
import type { CostingStatus } from "@/constants/costing";

const TABS = ["Overview", "Materials", "Packaging", "Manufacturing", "Quality", "Regulatory", "Documentation", "Overhead", "Pricing", "Versions", "Approval", "Documents", "Timeline"] as const;

export function CostingWorkspace({ id, initialTab = "Overview" }: { id: string; initialTab?: (typeof TABS)[number] }) {
  const router = useRouter();
  const { user } = useAuth();
  const item = useCostingStore((state) => state.costings.find((row) => row.id === id));
  const documents = useCostingStore((state) => state.documents.filter((doc) => doc.costingId === id));
  const adjustments = useCostingStore((state) => state.adjustments.filter((row) => row.costingId === id));
  const product = useProductStore((state) => (item?.productId ? state.products.find((row) => row.id === item.productId) : undefined));
  const audit = useAppStore((state) => state.db.auditLogs.filter((entry) => entry.recordId === id).slice(0, 40));
  const [tab, setTab] = useState<(typeof TABS)[number]>(initialTab);
  const [reason, setReason] = useState("");
  const [remarks, setRemarks] = useState("");

  if (!item) return <EmptyState title="Costing not found" description="This costing sheet is unavailable." />;
  if (!user) return null;
  const actor = user;
  const current = item;
  const expired = isCostingExpired(item);
  const showInternal = canPerm(actor, "costing.calculate");
  const materials = listMaterials(id);
  const packaging = listPackaging(id);
  const manufacturing = useCostingStore.getState().manufacturing.find((row) => row.costingId === id);
  const quality = useCostingStore.getState().quality.filter((row) => row.costingId === id);
  const regulatory = useCostingStore.getState().regulatory.filter((row) => row.costingId === id);
  const documentation = useCostingStore.getState().documentation.filter((row) => row.costingId === id);
  const overhead = useCostingStore.getState().overhead.filter((row) => row.costingId === id);
  const economics = unitEconomics(item);
  const money = (minor: number) => formatCostingMoney(minor, item.currency);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:justify-between">
          <div className="flex gap-4">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Calculator className="size-7" /></div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold">{item.displayNumber}</h1>
                <StatusBadge value={item.status} />
                {expired ? <StatusBadge value="EXPIRED" /> : null}
                <StatusBadge value={item.approvalStatus} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{item.customerName} · {item.productName}</p>
              <p className="mt-2 text-sm">{item.preparedByName} · {item.currency} · v{item.version}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => router.push(`/crm/enquiries/${item.enquiryId}` as Route)}>Enquiry</Button>
            <Button variant="outline" onClick={() => router.push(`/crm/feasibility/${item.feasibilityId}` as Route)}>Feasibility</Button>
            <Can permission="costing.update"><Button variant="outline" onClick={() => router.push(`/crm/costing/${item.id}/edit` as Route)}>Edit</Button></Can>
            <Can permission="costing.version">
              <Button variant="outline" onClick={async () => {
                const changeReason = window.prompt("Change reason for the new version");
                if (!changeReason) return;
                try {
                  const created = await createCostingVersion(current.id, changeReason, actor);
                  toast.success(`Version ${created.version} created`);
                  router.push(`/crm/costing/${created.id}` as Route);
                } catch (error) { toast.error(toUserMessage(error)); }
              }}>Duplicate version</Button>
            </Can>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <SummaryChip label="Selling price" value={money(item.totals.sellingPriceMinor)} emphasis />
          <SummaryChip label="Margin" value={money(item.totals.marginAmountMinor)} />
          {showInternal ? <SummaryChip label="Total cost" value={money(item.totals.totalCostMinor)} /> : <SummaryChip label="Version" value={`V${item.version}`} />}
        </div>
      </section>

      <div className="flex gap-1 overflow-x-auto border-b border-border pb-px">
        {TABS.map((name) => (
          <button key={name} type="button" className={`shrink-0 rounded-t-md px-3 py-2 text-sm ${tab === name ? "bg-card font-medium" : "text-muted-foreground"}`} onClick={() => setTab(name)}>{name}</button>
        ))}
      </div>

      {tab === "Overview" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card><CardHeader><CardTitle>Header</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">
            {[["Costing", item.displayNumber], ["Customer", item.customerName], ["Enquiry", item.enquiryNumber], ["Product", item.productName], ["Feasibility", item.feasibilityNumber], ["Version", `V${item.version}`], ["Currency", item.currency], ["Date", formatDate(item.costingDate)], ["Valid until", formatDate(item.validUntil)], ["Prepared by", item.preparedByName], ["Quantity", `${item.baseQuantity.toLocaleString()} ${item.quantityUnit}`], ["Annual qty", item.annualQuantity?.toLocaleString()], ["Target / market", item.commercial.market]].map(([label, value]) => (
              <div key={String(label)} className="flex justify-between gap-4"><span className="text-muted-foreground">{label}</span><span className="text-right">{value || "—"}</span></div>
            ))}
            {product ? <p className="text-xs text-muted-foreground">Product master {product.productCode} is referenced, not copied.</p> : null}
            {canPerm(actor, "quotations.view") ? (
              <div className="border-t border-border pt-2">
                <p className="text-muted-foreground">Quotations {getQuotationsForCosting(current.id, actor).length}</p>
                {getQuotationsForCosting(current.id, actor)[0] ? (
                  <Button size="sm" variant="ghost" onClick={() => router.push(`/crm/quotations/${getQuotationsForCosting(current.id, actor)[0]!.id}` as Route)}>Latest {getQuotationsForCosting(current.id, actor)[0]!.displayNumber}</Button>
                ) : null}
              </div>
            ) : null}
          </CardContent></Card>
          <Card><CardHeader><CardTitle>Breakdown</CardTitle></CardHeader><CardContent>
            {showInternal ? (
              <div className="space-y-2 text-sm">
                <p className="text-xs font-medium uppercase text-muted-foreground">Base cost</p>
                {[["Material", item.totals.materialCostMinor], ["Packaging", item.totals.packagingCostMinor], ["Manufacturing", item.totals.manufacturingCostMinor], ["Quality", item.totals.qualityCostMinor], ["Regulatory", item.totals.regulatoryCostMinor], ["Documentation", item.totals.documentationCostMinor], ["Overhead", item.totals.overheadCostMinor]].map(([label, value]) => (
                  <div key={String(label)} className="flex justify-between"><span>{label}</span><span>{money(Number(value))}</span></div>
                ))}
                {item.totals.materialAdjustmentMinor !== 0 ? <div className="flex justify-between text-amber-700"><span>Material adjustments</span><span>{money(item.totals.materialAdjustmentMinor)}</span></div> : null}
                <div className="flex justify-between border-t border-border pt-2 font-medium"><span>Total cost</span><span>{money(item.totals.totalCostMinor)}</span></div>
                <p className="pt-2 text-xs font-medium uppercase text-muted-foreground">Margin</p>
                <div className="flex justify-between"><span>{pharmaLabel(item.marginType)} {item.marginValue}</span><span>{money(item.totals.marginAmountMinor)}</span></div>
                {item.totals.priceAdjustmentMinor !== 0 ? <div className="flex justify-between text-amber-700"><span>Price adjustments</span><span>{money(item.totals.priceAdjustmentMinor)}</span></div> : null}
                <div className="flex justify-between border-t border-border pt-2 font-semibold"><span>Selling price</span><span>{money(item.totals.sellingPriceMinor)}</span></div>
                <p className="pt-2 text-xs text-muted-foreground">Unit {money(item.totals.unitCostMinor)} cost · {money(item.totals.unitPriceMinor)} price{economics.annualRevenueMinor != null ? ` · Annual revenue ${money(economics.annualRevenueMinor)}` : ""}</p>
              </div>
            ) : (
              <EmptyState title="Internal cost is restricted" description="Selling price is visible. Material, overhead and margin detail requires costing.calculate." />
            )}
          </CardContent></Card>
          <Can permission="costing.update">
            <Card><CardHeader><CardTitle>Workflow</CardTitle></CardHeader><CardContent>
              <Select defaultValue={item.status} onChange={async (event) => {
                try { await changeCostingStatus(current.id, event.target.value as CostingStatus, actor); toast.success("Status updated"); } catch (error) { toast.error(toUserMessage(error)); }
              }}>
                <option value={item.status}>{pharmaLabel(item.status)}</option>
                {COSTING_TRANSITIONS[item.status].map((status) => <option key={status} value={status}>{pharmaLabel(status)}</option>)}
              </Select>
            </CardContent></Card>
          </Can>
        </div>
      ) : null}

      {tab === "Materials" ? (
        showInternal ? (
          <Card><CardHeader><CardTitle>Materials</CardTitle></CardHeader><CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">API {money(item.totals.apiCostMinor)} · Excipient {money(item.totals.excipientCostMinor)} · Process {money(item.totals.processMaterialCostMinor)}</p>
            {materials.map((line) => (
              <p key={line.id} className="text-sm">{line.materialType} · {line.materialName} · {line.effectiveQuantity} {line.unit} · {money(line.totalCostMinor)}</p>
            ))}
            <Can permission="costing.update">
              <Button size="sm" variant="outline" onClick={() => router.push(`/crm/costing/${item.id}/materials` as Route)}>Edit materials</Button>
            </Can>
            <Can permission="costing.adjust">
              <div className="grid gap-2 sm:grid-cols-3">
                <Select id="adj-type" defaultValue="INCREASE">{ADJUSTMENT_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select>
                <Input id="adj-amount" type="number" min={0} step="0.01" placeholder="Amount" />
                <Input id="adj-reason" placeholder="Reason (audited)" />
                <Button size="sm" onClick={async () => {
                  const type = (document.getElementById("adj-type") as HTMLSelectElement)?.value as "INCREASE" | "DECREASE";
                  const amount = Number((document.getElementById("adj-amount") as HTMLInputElement)?.value);
                  const adjReason = (document.getElementById("adj-reason") as HTMLInputElement)?.value ?? "";
                  try { await applyMaterialAdjustment(current.id, { adjustmentType: type, amount, reason: adjReason }, actor); toast.success("Adjustment recorded"); } catch (error) { toast.error(toUserMessage(error)); }
                }}>Add adjustment</Button>
              </div>
            </Can>
            {adjustments.filter((row) => row.scope === "MATERIAL").map((row) => <p key={row.id} className="text-xs text-muted-foreground">{row.adjustmentType} {money(row.amountMinor ?? 0)} · {row.reason}</p>)}
          </CardContent></Card>
        ) : <Restricted />
      ) : null}

      {tab === "Packaging" ? (
        showInternal ? (
          <Card><CardContent className="space-y-2 p-5 text-sm">
            <p>Primary {money(item.totals.primaryPackagingCostMinor)} · Secondary {money(item.totals.secondaryPackagingCostMinor)} · Tertiary {money(item.totals.tertiaryPackagingCostMinor)}</p>
            {packaging.map((line) => <p key={line.id}>{line.level} · {line.materialName} · {money(line.totalCostMinor)}</p>)}
            <Can permission="costing.update"><Button size="sm" variant="outline" onClick={() => router.push(`/crm/costing/${item.id}/packaging` as Route)}>Edit packaging</Button></Can>
          </CardContent></Card>
        ) : <Restricted />
      ) : null}

      {tab === "Manufacturing" ? (
        showInternal ? (
          <Card><CardContent className="space-y-2 p-5 text-sm">
            <p>{manufacturing?.manufacturingSite ?? "—"} · {manufacturing?.productionLine ?? "—"} · {money(item.totals.manufacturingCostMinor)}</p>
            {manufacturing?.labor.map((line) => <p key={line.id}>{line.category} · {line.hours}h · {money(line.totalCostMinor)}</p>)}
            {manufacturing?.machines.map((line) => <p key={line.id}>{line.machine} · {money(line.totalCostMinor)}</p>)}
            {manufacturing?.utilities.map((line) => <p key={line.id}>{line.utilityType} · {money(line.totalCostMinor)}</p>)}
            <Can permission="costing.update"><Button size="sm" variant="outline" onClick={() => router.push(`/crm/costing/${item.id}/manufacturing` as Route)}>Edit manufacturing</Button></Can>
          </CardContent></Card>
        ) : <Restricted />
      ) : null}

      {["Quality", "Regulatory", "Documentation", "Overhead"].includes(tab) && !showInternal ? <Restricted /> : null}
      {tab === "Quality" && showInternal ? <SimpleList title="Quality" rows={quality.map((row) => `${row.activity} · ${money(row.totalCostMinor)}`)} /> : null}
      {tab === "Regulatory" && showInternal ? <SimpleList title="Regulatory" rows={regulatory.map((row) => `${row.activity} · ${money(row.costMinor)}`)} /> : null}
      {tab === "Documentation" && showInternal ? <SimpleList title="Documentation" rows={documentation.map((row) => `${row.activity} · ${money(row.costMinor)}`)} /> : null}
      {tab === "Overhead" && showInternal ? <SimpleList title="Overhead" rows={overhead.map((row) => `${row.overheadType} · ${row.mode} · ${money(row.totalCostMinor)}`)} /> : null}

      {tab === "Pricing" ? (
        <Card><CardHeader><CardTitle>Pricing</CardTitle></CardHeader><CardContent className="space-y-3">
          <p className="text-sm">{pharmaLabel(item.marginType)} {item.marginValue} · Selling {money(item.totals.sellingPriceMinor)}</p>
          <p className="text-xs text-muted-foreground">Margin is profit on selling price. Markup is a percent added to cost. They are not interchangeable.</p>
          <Can permission="costing.update">
            <Button size="sm" variant="outline" onClick={() => router.push(`/crm/costing/${item.id}/pricing` as Route)}>Edit pricing</Button>
          </Can>
          {item.status === "APPROVED" ? (
            <div className="rounded-lg border border-dashed border-border p-3 text-sm">
              <p className="font-medium">Create quotation</p>
              <p className="text-muted-foreground">Approved costing prices are snapshotted. Later costing edits do not change issued quotations.</p>
              <Can permission="quotations.create">
                <Button size="sm" className="mt-2" onClick={() => {
                  try {
                    getQuotationReadyCosting(current.id, actor);
                    router.push(`/crm/quotations/new?costingId=${current.id}` as Route);
                  } catch (error) { toast.error(toUserMessage(error)); }
                }}>Create Quotation</Button>
              </Can>
            </div>
          ) : null}
        </CardContent></Card>
      ) : null}

      {tab === "Versions" ? (
        <Card><CardHeader><CardTitle>Version comparison</CardTitle></CardHeader><CardContent className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead><tr className="text-left text-xs text-muted-foreground">{["Version", "Material", "Packaging", "Mfg", "Quality", "Overhead", "Total", "Margin", "Selling", "By"].map((head) => <th key={head} className="py-2 pr-3">{head}</th>)}</tr></thead>
            <tbody>
              {compareCostingVersions(item.familyId, actor).map((row, index, all) => {
                const prev = all[index - 1];
                const diff = (key: keyof typeof row) => prev && row[key] !== prev[key];
                return (
                  <tr key={row.id} className="border-t border-border">
                    <td className="py-2 pr-3"><Button variant="ghost" size="sm" onClick={() => router.push(`/crm/costing/${row.id}` as Route)}>{row.displayNumber}</Button></td>
                    {showInternal ? (
                      <>
                        <td className={diff("materialCostMinor") ? "font-medium text-amber-700" : ""}>{money(row.materialCostMinor)}</td>
                        <td className={diff("packagingCostMinor") ? "font-medium text-amber-700" : ""}>{money(row.packagingCostMinor)}</td>
                        <td className={diff("manufacturingCostMinor") ? "font-medium text-amber-700" : ""}>{money(row.manufacturingCostMinor)}</td>
                        <td className={diff("qualityCostMinor") ? "font-medium text-amber-700" : ""}>{money(row.qualityCostMinor)}</td>
                        <td className={diff("overheadCostMinor") ? "font-medium text-amber-700" : ""}>{money(row.overheadCostMinor)}</td>
                        <td className={diff("totalCostMinor") ? "font-medium text-amber-700" : ""}>{money(row.totalCostMinor)}</td>
                        <td className={diff("marginAmountMinor") ? "font-medium text-amber-700" : ""}>{money(row.marginAmountMinor)}</td>
                      </>
                    ) : <td colSpan={7} className="text-muted-foreground">Restricted</td>}
                    <td className={diff("sellingPriceMinor") ? "font-medium text-amber-700" : ""}>{money(row.sellingPriceMinor)}</td>
                    <td>{row.createdByName}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent></Card>
      ) : null}

      {tab === "Approval" ? (
        <Card><CardHeader><CardTitle>Approval</CardTitle></CardHeader><CardContent className="space-y-3">
          <p className="text-sm">Required level: {requiredApprovalLevel(item)?.name}</p>
          {getApprovalHistory(id).map((row) => <p key={row.id} className="text-sm">{row.decision} · {row.levelName} · {row.actorName} · {formatDateTime(row.createdAt)} · {row.remarks}</p>)}
          <Can permission="costing.submit">
            <Button onClick={async () => { try { await submitForApproval(current.id, actor); toast.success("Submitted"); } catch (error) { toast.error(toUserMessage(error)); } }}>Submit for approval</Button>
          </Can>
          <Textarea value={remarks} onChange={(event) => setRemarks(event.target.value)} placeholder="Approval remarks" />
          <Input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Rejection reason (required to reject)" />
          <div className="flex gap-2">
            <Can permission="costing.approve"><Button onClick={async () => { try { await approveCosting(current.id, { decision: "APPROVED", remarks: remarks || "Approved" }, actor); toast.success("Approved"); } catch (error) { toast.error(toUserMessage(error)); } }}>Approve</Button></Can>
            <Can permission="costing.reject"><Button variant="outline" onClick={async () => { try { await rejectCosting(current.id, { decision: "REJECTED", remarks: remarks || reason, reason }, actor); toast.success("Rejected"); } catch (error) { toast.error(toUserMessage(error)); } }}>Reject</Button></Can>
          </div>
        </CardContent></Card>
      ) : null}

      {tab === "Documents" ? (
        <Card><CardContent className="space-y-4 p-5">
          <Can permission="costing_documents.upload">
            <FileUpload label="Upload costing sheet or supporting file" onFile={async (file) => {
              try { await uploadCostingDocument(current.id, file, actor); toast.success("Document version recorded"); } catch (error) { toast.error(toUserMessage(error)); }
            }} />
          </Can>
          {documents.length === 0 ? <EmptyState title="No documents." description="Files stay in Storage." /> : documents.map((doc) => <p key={doc.id} className="text-sm">v{doc.version} · {doc.fileName}</p>)}
        </CardContent></Card>
      ) : null}

      {tab === "Timeline" ? (
        <Card><CardContent className="p-5">
          {audit.length === 0 ? <EmptyState title="No timeline events." description="Uses the existing audit log." /> : (
            <Timeline>{audit.map((entry) => <TimelineItem key={entry.id} title={entry.action} meta={`${entry.userEmail} · ${formatDateTime(entry.timestamp)}`}>{entry.oldValue} → {entry.newValue}</TimelineItem>)}</Timeline>
          )}
        </CardContent></Card>
      ) : null}

    </div>
  );
}

function Restricted() {
  return <EmptyState title="Internal cost is restricted" description="This breakdown is visible only with costing.calculate." />;
}

function SummaryChip({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className={`rounded-xl border border-border px-3 py-2 ${emphasis ? "bg-primary/5" : ""}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}

function SimpleList({ title, rows }: { title: string; rows: string[] }) {
  return (
    <Card><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent>
      {rows.length === 0 ? <p className="text-sm text-muted-foreground">No lines yet. Use the dedicated editor route.</p> : rows.map((row) => <p key={row} className="text-sm">{row}</p>)}
    </CardContent></Card>
  );
}

