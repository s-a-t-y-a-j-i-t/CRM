"use client";

import { useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { Package } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Timeline, TimelineItem } from "@/components/shared/timeline";
import { FileUpload } from "@/components/shared/file-upload";
import { Can } from "@/components/rbac/can";
import { useAuth } from "@/hooks/useAuth";
import { useProductStore } from "@/stores/product-store";
import { useEnquiryStore } from "@/stores/enquiry-store";
import { useFeasibilityStore } from "@/stores/feasibility-store";
import { useAppStore } from "@/services/store";
import { formatDateTime, nowIso } from "@/lib/dates";
import { pharmaLabel } from "@/constants/products";
import { uploadProductDocument } from "@/services/products/product-document.service";
import { toUserMessage } from "@/lib/errors";

const TABS = ["Overview", "Composition", "Specifications", "Manufacturing", "Packaging", "Regulatory", "Documents", "Enquiries", "Feasibility", "Activities", "Timeline"] as const;

export function ProductWorkspace({ id }: { id: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const product = useProductStore((state) => state.products.find((item) => item.id === id));
  const specifications = useProductStore((state) => state.specifications.filter((item) => item.productId === id));
  const documents = useProductStore((state) => state.documents.filter((item) => item.productId === id && item.status !== "ARCHIVED"));
  const activities = useProductStore((state) => state.activities.filter((item) => item.productId === id));
  const enquiries = useEnquiryStore((state) => state.enquiries.filter((item) => state.requirements.some((req) => req.enquiryId === item.id && req.productMasterId === id)));
  const feasibilities = useFeasibilityStore((state) => state.assessments.filter((item) => item.productId === id));
  const audit = useAppStore((state) => state.db.auditLogs.filter((entry) => entry.recordId === id).slice(0, 30));
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");
  const [note, setNote] = useState("");

  if (!product) return <EmptyState title="Product not found" description="This product master record is unavailable." />;
  if (!user) return null;
  const actor = user;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Package className="size-7" /></div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight">{product.productName}</h1>
                <StatusBadge value={product.status} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{product.productCode} · {pharmaLabel(product.dosageForm)} · {product.strength} {product.strengthUnit}</p>
              <p className="mt-2 text-xs text-muted-foreground">Product master — not a customer-specific requirement.</p>
            </div>
          </div>
          <Can permission="products.update">
            <Button onClick={() => router.push(`/master/products/${product.id}/edit` as Route)}>Edit</Button>
          </Can>
        </div>
      </section>
      <div className="flex gap-1 overflow-x-auto border-b border-border pb-px">
        {TABS.map((item) => (
          <button key={item} type="button" className={`shrink-0 rounded-t-md px-3 py-2 text-sm ${tab === item ? "bg-card font-medium" : "text-muted-foreground"}`} onClick={() => setTab(item)}>{item}</button>
        ))}
      </div>
      {tab === "Overview" ? (
        <Card><CardContent className="space-y-2 p-5 text-sm">
          {[["Generic", product.genericName], ["Brand", product.brandName], ["Category", pharmaLabel(product.productCategory)], ["Therapeutic", product.therapeuticCategory], ["Pharmacopoeia", product.pharmacopoeiaStandard], ["Market", product.marketType], ["Description", product.description]].map(([label, value]) => (
            <div key={String(label)} className="flex justify-between gap-4"><span className="text-muted-foreground">{label}</span><span className="text-right">{value || "—"}</span></div>
          ))}
        </CardContent></Card>
      ) : null}
      {tab === "Composition" ? (
        <Card><CardHeader><CardTitle>Composition</CardTitle></CardHeader><CardContent>
          {product.composition.length === 0 ? <EmptyState title="No composition." description="Add structured ingredients on the product form." /> : product.composition.map((line) => (
            <p key={line.id} className="text-sm">{line.ingredientName} {line.strength} {line.unit} · {line.role}{line.activeIngredient ? " · API" : ""}</p>
          ))}
        </CardContent></Card>
      ) : null}
      {tab === "Specifications" ? (
        <Card><CardHeader><CardTitle>Specifications</CardTitle></CardHeader><CardContent>
          {specifications.length === 0 ? <EmptyState title="No specifications." description="This is requirement capture, not a LIMS." /> : specifications.map((spec) => (
            <p key={spec.id} className="text-sm">{spec.parameter}: {spec.limit} {spec.unit} · {spec.testMethod}</p>
          ))}
        </CardContent></Card>
      ) : null}
      {tab === "Manufacturing" ? <Card><CardContent className="space-y-2 p-5 text-sm"><p>Site: {product.manufacturingSite ?? "—"}</p><p>Unit: {product.manufacturingUnit ?? "—"}</p></CardContent></Card> : null}
      {tab === "Packaging" ? <Card><CardContent className="space-y-2 p-5 text-sm"><p>Type: {product.packagingType ?? "—"}</p><p>Pack: {product.standardPackSize ?? "—"}</p></CardContent></Card> : null}
      {tab === "Regulatory" ? <Card><CardContent className="p-5 text-sm">Regulatory status: {product.regulatoryStatus ?? "—"}. This is a business field, not a compliance claim.</CardContent></Card> : null}
      {tab === "Documents" ? (
        <Card><CardContent className="space-y-4 p-5">
          <Can permission="products.update">
            <FileUpload label="Upload technical or specification file" onFile={async (file) => {
              try {
                await uploadProductDocument(product.id, file, actor);
                toast.success("Document version recorded");
              } catch (error) {
                toast.error(toUserMessage(error));
              }
            }} />
          </Can>
          {documents.length === 0 ? <EmptyState title="No documents." description="Files stay in Storage. Firestore keeps metadata." /> : documents.map((doc) => <p key={doc.id} className="text-sm">{doc.fileName}</p>)}
        </CardContent></Card>
      ) : null}
      {tab === "Enquiries" ? (
        enquiries.length === 0 ? <EmptyState title="No linked enquiries." description="Selecting this master on a product requirement creates the link." /> : (
          <ul className="space-y-2">{enquiries.map((item) => (
            <li key={item.id}><Button variant="outline" onClick={() => router.push(`/crm/enquiries/${item.id}` as Route)}>{item.enquiryNumber} · {item.customerName}</Button></li>
          ))}</ul>
        )
      ) : null}
      {tab === "Feasibility" ? (
        feasibilities.length === 0 ? <EmptyState title="No feasibility assessments." description="Start feasibility from an enquiry that references this product." /> : (
          <ul className="space-y-2">{feasibilities.map((item) => (
            <li key={item.id}><Button variant="outline" onClick={() => router.push(`/crm/feasibility/${item.id}` as Route)}>{item.feasibilityNumber} · {item.status}</Button></li>
          ))}</ul>
        )
      ) : null}
      {tab === "Activities" ? (
        <Card><CardContent className="space-y-3 p-5">
          {activities.length === 0 ? <EmptyState title="No activities." description="Notes and reviews will appear here." /> : activities.map((item) => <p key={item.id} className="text-sm">{item.subject}</p>)}
          <div className="flex gap-2">
            <Input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Note" />
            <Button disabled={!note.trim()} onClick={() => {
              useProductStore.getState().addActivity({ productId: product.id, type: "NOTE", subject: note, activityDate: nowIso() }, actor);
              setNote("");
              toast.success("Activity recorded");
            }}>Save</Button>
          </div>
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
