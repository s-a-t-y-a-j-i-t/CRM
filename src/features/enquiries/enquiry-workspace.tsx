"use client";

import { useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { StatCard } from "@/components/shared/stat-card";
import { Timeline, TimelineItem } from "@/components/shared/timeline";
import { FileUpload } from "@/components/shared/file-upload";
import { Can } from "@/components/rbac/can";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useAuth } from "@/hooks/useAuth";
import { useEnquiryStore } from "@/stores/enquiry-store";
import { useIdentityStore } from "@/stores/identity-store";
import { assignEnquiry, changeEnquiryStatus, startTechnicalReview } from "@/services/enquiries/enquiry.service";
import { getActiveFeasibilityForEnquiry, startFeasibility } from "@/services/feasibility/feasibility.service";
import { getCostingsForEnquiry } from "@/services/costing/costing.service";
import { getQuotationsForEnquiry } from "@/services/quotations/quotation.service";
import { can } from "@/lib/rbac/can";
import { useProductStore } from "@/stores/product-store";
import { getRequirementVersions, updateRequirement } from "@/services/enquiries/product-requirement.service";
import {
  classifyFollowUp,
  completeEnquiryFollowUp,
  createEnquiryActivity,
  createEnquiryFollowUp,
  listEnquiryActivities,
  listEnquiryAudit,
  listEnquiryFollowUps,
} from "@/services/enquiries/enquiry-activity.service";
import { deleteEnquiryDocument, listEnquiryDocuments, uploadEnquiryDocument } from "@/services/enquiries/enquiry-document.service";
import { formatDate, formatDateTime, nowIso } from "@/lib/dates";
import { toUserMessage } from "@/lib/errors";
import { pharmaLabel } from "@/constants/enquiries";
import { canTransition, ENQUIRY_TRANSITIONS } from "@/services/enquiries/enquiry-workflow.service";
import { EnquiryForm, enquiryToForm } from "@/features/enquiries/enquiry-form";
import type { EnquiryStatus } from "@/types/enquiries";

const TABS = ["Overview", "Product Requirement", "Activities", "Follow-ups", "Documents", "Timeline", "Workflow", "Feasibility", "Costing", "Quotation", "Order", "Manufacturing"] as const;

const FUTURE: Partial<Record<(typeof TABS)[number], string>> = {
  Order: "Purchase orders will appear in a later phase.",
  Manufacturing: "Manufacturing orders and batches will appear in a later phase.",
};

export function EnquiryWorkspace({
  id,
  initialTab = "Overview",
}: {
  id: string;
  initialTab?: (typeof TABS)[number];
}) {
  const router = useRouter();
  const { user } = useAuth();
  const enquiry = useEnquiryStore((state) => state.enquiries.find((item) => item.id === id));
  const requirement = useEnquiryStore((state) => state.requirements.find((item) => item.enquiryId === id && item.isCurrent));
  const salesPeople = useIdentityStore((state) => state.users);
  const [tab, setTab] = useState<(typeof TABS)[number]>(initialTab);
  const [assignOpen, setAssignOpen] = useState(false);
  const [nextOwner, setNextOwner] = useState("");
  const [statusOpen, setStatusOpen] = useState(false);
  const [nextStatus, setNextStatus] = useState<EnquiryStatus>("UNDER_REVIEW");
  const [activitySubject, setActivitySubject] = useState("");
  const [followPurpose, setFollowPurpose] = useState("");
  const [followAt, setFollowAt] = useState("");
  const [editingRequirement, setEditingRequirement] = useState(false);
  const activities = listEnquiryActivities(id);
  const followUps = listEnquiryFollowUps(id);
  const documents = listEnquiryDocuments(id);
  const audit = listEnquiryAudit(id);
  const versions = getRequirementVersions(id);
  const activeFeasibility = getActiveFeasibilityForEnquiry(id);
  const productMaster = useProductStore((state) =>
    requirement?.productMasterId ? state.products.find((item) => item.id === requirement.productMasterId) : undefined,
  );

  if (!enquiry) {
    return <EmptyState title="Enquiry not found" description="This enquiry record is unavailable." />;
  }
  if (!user) return null;
  const current = enquiry;
  const actor = user;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ClipboardList className="size-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight">{enquiry.enquiryNumber}</h1>
                <StatusBadge value={enquiry.status} />
                <StatusBadge value={enquiry.priority} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{enquiry.customerName} · {enquiry.contactName}</p>
              <p className="mt-2 text-sm">
                {enquiry.assignedToName}
                {salesPeople.find((person) => person.id === enquiry.assignedTo)?.departmentName
                  ? ` · ${salesPeople.find((person) => person.id === enquiry.assignedTo)?.departmentName}`
                  : ""}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Can permission="enquiries.update">
              <Button onClick={() => router.push(`/crm/enquiries/${enquiry.id}/edit` as Route)}>Edit</Button>
            </Can>
            <Can permission="enquiries.assign">
              <Button variant="outline" onClick={() => { setNextOwner(enquiry.assignedTo); setAssignOpen(true); }}>Assign</Button>
            </Can>
            <Can permission="enquiries.change_status">
              <Button variant="outline" onClick={() => { setNextStatus(ENQUIRY_TRANSITIONS[enquiry.status][0] ?? enquiry.status); setStatusOpen(true); }}>Change status</Button>
            </Can>
            <Can permission="product_requirements.update">
              <Button variant="outline" onClick={() => router.push(`/crm/enquiries/${enquiry.id}/edit-requirements` as Route)}>Add requirement</Button>
            </Can>
            <Can permission="activities.create">
              <Button variant="outline" onClick={() => setTab("Activities")}>Add activity</Button>
            </Can>
            <Can permission="enquiry_documents.upload">
              <Button variant="outline" onClick={() => setTab("Documents")}>Upload document</Button>
            </Can>
            <Can permission="enquiries.technical_review">
              {canTransition(enquiry.status, "TECHNICAL_REVIEW") ? (
              <Button variant="outline" onClick={async () => {
                try {
                  await startTechnicalReview(current.id, actor);
                  toast.success("Technical review started");
                } catch (error) {
                  toast.error(toUserMessage(error));
                }
              }}>Start technical review</Button>
              ) : null}
            </Can>
            <Can permission="feasibility.create">
              {requirement && !activeFeasibility ? (
                <Button variant="outline" onClick={async () => {
                  try {
                    const created = await startFeasibility({
                      enquiryId: current.id,
                      assignedTo: current.assignedTo,
                      priority: current.priority,
                      targetCompletionDate: "",
                    }, actor);
                    toast.success(`Feasibility started · ${created.feasibilityNumber}`);
                    router.push(`/crm/feasibility/${created.id}` as Route);
                  } catch (error) {
                    toast.error(toUserMessage(error));
                  }
                }}>Start Feasibility</Button>
              ) : null}
            </Can>
            {activeFeasibility ? (
              <Button variant="outline" onClick={() => router.push(`/crm/feasibility/${activeFeasibility.id}` as Route)}>
                Open {activeFeasibility.feasibilityNumber}
              </Button>
            ) : null}
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Product" value={requirement?.productName ?? "—"} />
        <StatCard label="Quantity" value={requirement?.requiredQuantity?.toLocaleString() ?? "—"} />
        <StatCard label="Received" value={formatDate(enquiry.receivedDate)} />
        <StatCard label="Decision" value={formatDate(enquiry.expectedDecisionDate)} />
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-border pb-px">
        {TABS.map((item) => (
          <button key={item} type="button" className={`shrink-0 rounded-t-md px-3 py-2 text-sm ${tab === item ? "bg-card font-medium text-foreground" : "text-muted-foreground hover:text-foreground"}`} onClick={() => setTab(item)}>
            {item}
          </button>
        ))}
      </div>

      {tab === "Overview" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <InfoCard title="Enquiry" rows={[
            ["Number", enquiry.enquiryNumber],
            ["Customer", enquiry.customerName],
            ["Contact", enquiry.contactName],
            ["Source", pharmaLabel(enquiry.enquirySource)],
            ["Type", pharmaLabel(enquiry.enquiryType)],
            ["Priority", enquiry.priority],
            ["Assigned", enquiry.assignedToName],
            ["Received", formatDate(enquiry.receivedDate)],
            ["Expected decision", formatDate(enquiry.expectedDecisionDate)],
            ["Description", enquiry.description],
            ["Product master", productMaster ? `${productMaster.productCode} · ${productMaster.productName}` : "New product requirement"],
            ["Feasibility", activeFeasibility ? `${activeFeasibility.feasibilityNumber} · ${activeFeasibility.status}` : "Not started"],
          ]} />
          <InfoCard title="Requirement summary" rows={[
            ["Product", requirement?.productName],
            ["Dosage form", requirement?.dosageForm],
            ["Strength", requirement?.strength],
            ["Quantity", requirement ? `${requirement.requiredQuantity ?? "—"} ${requirement.quantityUnit}` : "—"],
            ["Annual quantity", requirement?.annualQuantity?.toLocaleString()],
            ["Packaging", requirement?.packaging.primaryType],
            ["Market", requirement?.market ?? requirement?.country],
            ["Target price", requirement?.targetPriceMinor != null ? `${(requirement.targetPriceMinor / 100).toFixed(2)} ${requirement.currency}` : "—"],
          ]} />
        </div>
      ) : null}

      {tab === "Product Requirement" ? (
        requirement ? (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Can permission="product_requirements.update">
                <Button variant="outline" onClick={() => setEditingRequirement((value) => !value)}>{editingRequirement ? "Close editor" : "Edit requirement"}</Button>
              </Can>
            </div>
            {editingRequirement ? (
              <EnquiryForm
                defaultValues={enquiryToForm(enquiry, requirement)}
                sections="requirement"
                showChangeReason
                submitLabel="Save new version"
                onSubmit={async (values) => {
                  try {
                    await updateRequirement(current.id, values.requirement, actor);
                    toast.success("Requirement version created");
                    setEditingRequirement(false);
                  } catch (error) {
                    toast.error(toUserMessage(error));
                  }
                }}
              />
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                <InfoCard title="Product information" rows={[
                  ["Kind", requirement.isNewProductRequirement ? "Customer product requirement" : "Linked to product master"],
                  ["Product", requirement.productName],
                  ["Generic", requirement.genericName],
                  ["Brand", requirement.brandName],
                  ["Dosage form", requirement.dosageForm],
                  ["Strength", requirement.strength],
                  ["Current version", `v${requirement.versionNumber}`],
                ]} />
                <Card>
                  <CardHeader><CardTitle>Composition</CardTitle></CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {requirement.composition.map((line) => (
                      <p key={line.id}>{line.ingredient} {line.strength} {line.unit} · {line.role}</p>
                    ))}
                  </CardContent>
                </Card>
                <InfoCard title="Packaging" rows={[
                  ["Primary", requirement.packaging.primaryType],
                  ["Secondary", requirement.packaging.secondaryType],
                  ["Tertiary", requirement.packaging.tertiaryType],
                  ["Pack size", requirement.packSize],
                  ["Units / pack", requirement.packaging.unitsPerPack?.toString()],
                  ["Notes", requirement.packaging.notes],
                ]} />
                <InfoCard title="Quantity and commercial" rows={[
                  ["Required", `${requirement.requiredQuantity ?? "—"} ${requirement.quantityUnit}`],
                  ["Annual", requirement.annualQuantity?.toLocaleString()],
                  ["Batch", requirement.batchQuantity?.toLocaleString()],
                  ["MOQ", requirement.moqRequirement?.toLocaleString()],
                  ["Target price", requirement.targetPriceMinor != null ? `${(requirement.targetPriceMinor / 100).toFixed(2)} ${requirement.currency}` : "—"],
                  ["Price basis", requirement.priceBasis],
                ]} />
                <InfoCard title="Market / regulatory" rows={[
                  ["Market", requirement.market],
                  ["Country", requirement.country],
                  ["Type", requirement.marketType],
                  ["Regulatory", requirement.regulatoryRequirement],
                  ["Customer regulatory", requirement.customerRegulatoryRequirement],
                  ["License", requirement.licenseRequirement],
                ]} />
                <InfoCard title="Artwork / spec / sample / stability / delivery" rows={[
                  ["Artwork", requirement.artwork.status],
                  ["Specification", requirement.specification.status],
                  ["Sample", requirement.sample.status],
                  ["Stability", requirement.stability.required ? requirement.stability.duration : "Not required"],
                  ["Delivery", requirement.delivery.requiredDeliveryDate],
                  ["Special", requirement.specialRequirements],
                ]} />
              </div>
            )}
            <Card>
              <CardHeader><CardTitle>Version history</CardTitle></CardHeader>
              <CardContent>
                {versions.length === 0 ? (
                  <EmptyState title="No previous versions." description="Saving a change creates a snapshot. History is never overwritten." />
                ) : (
                  <ul className="space-y-2 text-sm">
                    {versions.map((version) => (
                      <li key={version.id} className="rounded-lg border border-border p-3">
                        <p className="font-medium">Version {version.versionNumber}</p>
                        <p className="text-xs text-muted-foreground">{version.changedByName} · {formatDateTime(version.changedAt)} · {version.changeReason}</p>
                        <p className="mt-1 text-xs">{version.oldValue} → {version.newValue}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <EmptyState title="No product requirement available." description="Add a structured pharmaceutical requirement for this enquiry." />
        )
      ) : null}

      {tab === "Activities" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Activities</CardTitle></CardHeader>
            <CardContent>
              {activities.length === 0 ? <EmptyState title="No activities." description="Calls, meetings and tasks will appear here." /> : (
                <Timeline>
                  {activities.map((item) => (
                    <TimelineItem key={item.id} title={item.subject} meta={`${item.type} · ${item.createdByName} · ${formatDateTime(item.activityDate)}`}>{item.description}</TimelineItem>
                  ))}
                </Timeline>
              )}
            </CardContent>
          </Card>
          <Can permission="activities.create">
            <Card>
              <CardHeader><CardTitle>Log activity</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Input placeholder="Subject" value={activitySubject} onChange={(event) => setActivitySubject(event.target.value)} />
                <Button disabled={!activitySubject.trim()} onClick={async () => {
                  try {
                    await createEnquiryActivity(current.id, { type: "NOTE", subject: activitySubject, activityDate: nowIso() }, actor);
                    setActivitySubject("");
                    toast.success("Activity recorded");
                  } catch (error) {
                    toast.error(toUserMessage(error));
                  }
                }}>Save activity</Button>
              </CardContent>
            </Card>
          </Can>
        </div>
      ) : null}

      {tab === "Follow-ups" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Follow-ups</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {followUps.length === 0 ? <EmptyState title="No follow-ups." description="Schedule a dated follow-up for the owner." /> : followUps.map((item) => {
                const bucket = classifyFollowUp(item);
                return (
                  <div key={item.id} className={`rounded-lg border p-3 text-sm ${bucket === "overdue" ? "border-destructive/50 bg-destructive/5" : "border-border"}`}>
                    <p className="font-medium">{item.purpose}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(item.followUpAt)} · {bucket}</p>
                    {item.status === "PENDING" ? (
                      <Button size="sm" variant="ghost" onClick={async () => {
                        try {
                          await completeEnquiryFollowUp(item.id, actor);
                          toast.success("Follow-up completed");
                        } catch (error) {
                          toast.error(toUserMessage(error));
                        }
                      }}>Complete</Button>
                    ) : null}
                  </div>
                );
              })}
            </CardContent>
          </Card>
          <Can permission="activities.create">
            <Card>
              <CardHeader><CardTitle>Schedule</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Input type="datetime-local" value={followAt} onChange={(event) => setFollowAt(event.target.value)} />
                <Input placeholder="Purpose" value={followPurpose} onChange={(event) => setFollowPurpose(event.target.value)} />
                <Button disabled={!followAt || !followPurpose.trim()} onClick={async () => {
                  try {
                    await createEnquiryFollowUp(current.id, {
                      followUpAt: new Date(followAt).toISOString(),
                      assignedTo: current.assignedTo,
                      purpose: followPurpose,
                      priority: current.priority,
                      status: "PENDING",
                    }, actor);
                    setFollowPurpose("");
                    toast.success("Follow-up scheduled");
                  } catch (error) {
                    toast.error(toUserMessage(error));
                  }
                }}>Schedule</Button>
              </CardContent>
            </Card>
          </Can>
        </div>
      ) : null}

      {tab === "Documents" ? (
        <Card>
          <CardHeader><CardTitle>Documents</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Can permission="enquiry_documents.upload">
              <FileUpload label="Upload requirement, specification, artwork or attachment" onFile={async (file) => {
                try {
                  await uploadEnquiryDocument(current.id, file, actor);
                  toast.success("Document recorded");
                } catch (error) {
                  toast.error(toUserMessage(error));
                }
              }} />
            </Can>
            {documents.length === 0 ? (
              <EmptyState title="No documents." description="Files stay in Storage. Firestore keeps metadata only." />
            ) : (
              <ul className="space-y-2 text-sm">
                {documents.map((doc) => (
                  <li key={doc.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                    <span>{doc.fileName} · {doc.documentType} · {doc.uploadedByName}</span>
                    <Can permission="enquiry_documents.delete">
                      <Button size="sm" variant="ghost" onClick={async () => {
                        try {
                          await deleteEnquiryDocument(doc.id, actor);
                          toast.success("Document removed");
                        } catch (error) {
                          toast.error(toUserMessage(error));
                        }
                      }}>Delete</Button>
                    </Can>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : null}

      {tab === "Timeline" ? (
        <Card>
          <CardHeader><CardTitle>Timeline</CardTitle></CardHeader>
          <CardContent>
            {activities.length === 0 && audit.length === 0 ? (
              <EmptyState title="No timeline events yet." description="Creation, assignment, versions and reviews use the existing audit log." />
            ) : (
              <Timeline>
                {activities.map((item) => (
                  <TimelineItem key={item.id} title={item.subject} meta={`${item.createdByName} · ${formatDateTime(item.activityDate)}`}>{item.description}</TimelineItem>
                ))}
                {audit.map((entry) => (
                  <TimelineItem key={entry.id} title={entry.action.replaceAll("_", " ")} meta={`${entry.userEmail} · ${formatDateTime(entry.timestamp)}`}>
                    {entry.oldValue || entry.newValue ? `${entry.oldValue ?? "—"} → ${entry.newValue ?? "—"}` : ""}
                  </TimelineItem>
                ))}
              </Timeline>
            )}
          </CardContent>
        </Card>
      ) : null}

      {tab === "Workflow" ? (
        <Card>
          <CardHeader><CardTitle>Workflow</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>Current status: <StatusBadge value={enquiry.status} /></p>
            <p>Technical review: {enquiry.technicalReviewStatus}{enquiry.technicalReviewStartedAt ? ` · started ${formatDateTime(enquiry.technicalReviewStartedAt)}` : ""}</p>
            {activeFeasibility ? (
              <div className="rounded-lg border border-border p-4">
                <p className="font-medium">{activeFeasibility.feasibilityNumber}</p>
                <p className="mt-1 text-muted-foreground">Status {activeFeasibility.status}{activeFeasibility.overallDecision ? ` · ${activeFeasibility.overallDecision}` : ""}</p>
                <Button className="mt-3" variant="outline" onClick={() => router.push(`/crm/feasibility/${activeFeasibility.id}` as Route)}>Open feasibility</Button>
              </div>
            ) : requirement ? (
              <Can permission="feasibility.create">
                <div className="rounded-lg border border-dashed border-border p-4">
                  <p className="font-medium">Start Feasibility</p>
                  <p className="mt-1 text-muted-foreground">Creates one active assessment and moves the enquiry to Feasibility Pending. Duplicate active assessments are blocked.</p>
                  <Button className="mt-3" variant="outline" onClick={async () => {
                    try {
                      const created = await startFeasibility({
                        enquiryId: current.id,
                        assignedTo: current.assignedTo,
                        priority: current.priority,
                        targetCompletionDate: "",
                      }, actor);
                      toast.success(`Feasibility started · ${created.feasibilityNumber}`);
                      router.push(`/crm/feasibility/${created.id}` as Route);
                    } catch (error) {
                      toast.error(toUserMessage(error));
                    }
                  }}>Start Feasibility</Button>
                </div>
              </Can>
            ) : (
              <p className="text-muted-foreground">Add a product requirement before starting feasibility.</p>
            )}
          </CardContent>
        </Card>
      ) : null}

      {tab === "Feasibility" ? (
        activeFeasibility ? (
          <Card>
            <CardHeader><CardTitle>{activeFeasibility.feasibilityNumber}</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>Status: <StatusBadge value={activeFeasibility.status} /></p>
              <p>Owner: {activeFeasibility.assignedToName}</p>
              <p>Decision: {activeFeasibility.overallDecision ?? "Pending"}</p>
              <Button variant="outline" onClick={() => router.push(`/crm/feasibility/${activeFeasibility.id}` as Route)}>Open feasibility workspace</Button>
            </CardContent>
          </Card>
        ) : requirement ? (
          <EmptyState
            title="No active feasibility"
            description="Start a technical feasibility assessment from this enquiry. Costing is a later phase."
            action={
              <Can permission="feasibility.create">
                <Button onClick={async () => {
                  try {
                    const created = await startFeasibility({
                      enquiryId: current.id,
                      assignedTo: current.assignedTo,
                      priority: current.priority,
                      targetCompletionDate: "",
                    }, actor);
                    toast.success(`Feasibility started · ${created.feasibilityNumber}`);
                    router.push(`/crm/feasibility/${created.id}` as Route);
                  } catch (error) {
                    toast.error(toUserMessage(error));
                  }
                }}>Start Feasibility</Button>
              </Can>
            }
          />
        ) : (
          <EmptyState title="Product requirement required" description="Capture the customer product requirement before starting feasibility." />
        )
      ) : null}

      {tab === "Costing" ? (
        can(actor, "costing.view") ? (
          getCostingsForEnquiry(current.id, actor).length === 0 ? (
            <EmptyState title="No costing sheets." description="Create costing from a feasible assessment." />
          ) : (
            <ul className="space-y-2">
              {getCostingsForEnquiry(current.id, actor).map((row) => (
                <li key={row.id}>
                  <Button variant="outline" onClick={() => router.push(`/crm/costing/${row.id}` as Route)}>{row.displayNumber} · {row.status}</Button>
                </li>
              ))}
            </ul>
          )
        ) : <EmptyState title="Costing is restricted" description="You do not have costing.view." />
      ) : null}

      {tab === "Quotation" ? (
        can(actor, "quotations.view") ? (
          getQuotationsForEnquiry(current.id, actor).length === 0 ? (
            <EmptyState
              title="No quotations."
              description="Create a quotation from an approved costing."
              action={
                <Can permission="quotations.create">
                  <Button onClick={() => router.push("/crm/quotations/new" as Route)}>Create Quotation</Button>
                </Can>
              }
            />
          ) : (
            <ul className="space-y-2">
              {getQuotationsForEnquiry(current.id, actor).map((row) => (
                <li key={row.id}>
                  <Button variant="outline" onClick={() => router.push(`/crm/quotations/${row.id}` as Route)}>{row.displayNumber} · {row.status} · {row.totals.grandTotalMinor}</Button>
                </li>
              ))}
            </ul>
          )
        ) : <EmptyState title="Quotations are restricted" description="You do not have quotations.view." />
      ) : null}

      {FUTURE[tab] ? <EmptyState title={tab} description={FUTURE[tab] ?? ""} /> : null}

      {assignOpen ? (
        <>
          <ConfirmDialog title="Assign enquiry" description={`Current owner ${current.assignedToName}.`} confirmLabel="Assign" onCancel={() => setAssignOpen(false)} onConfirm={async () => {
            try {
              await assignEnquiry(current.id, nextOwner, actor);
              toast.success("Enquiry assigned");
            } catch (error) {
              toast.error(toUserMessage(error));
            } finally {
              setAssignOpen(false);
            }
          }} />
          <div className="fixed inset-x-0 bottom-6 z-[60] mx-auto w-full max-w-sm rounded-xl border border-border bg-card p-3 shadow-lg">
            <Select value={nextOwner} onChange={(event) => setNextOwner(event.target.value)}>
              {salesPeople.map((person) => <option key={person.id} value={person.id}>{person.displayName} · {person.departmentName}</option>)}
            </Select>
          </div>
        </>
      ) : null}
      {statusOpen ? (
        <>
          <ConfirmDialog title="Change status" description="Transitions are validated by enquiry-workflow.service." confirmLabel="Update" onCancel={() => setStatusOpen(false)} onConfirm={async () => {
            try {
              await changeEnquiryStatus(current.id, nextStatus, actor);
              toast.success("Status updated");
            } catch (error) {
              toast.error(toUserMessage(error));
            } finally {
              setStatusOpen(false);
            }
          }} />
          <div className="fixed inset-x-0 bottom-6 z-[60] mx-auto w-full max-w-sm rounded-xl border border-border bg-card p-3 shadow-lg">
            <Select value={nextStatus} onChange={(event) => setNextStatus(event.target.value as EnquiryStatus)}>
              {ENQUIRY_TRANSITIONS[current.status].map((status) => <option key={status} value={status}>{pharmaLabel(status)}</option>)}
            </Select>
          </div>
        </>
      ) : null}
    </div>
  );
}

function InfoCard({ title, rows }: { title: string; rows: Array<[string, string | undefined | null]> }) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4">
            <span className="text-muted-foreground">{label}</span>
            <span className="text-right">{value || "—"}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
