"use client";

import { useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { FlaskConical } from "lucide-react";
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
import { useFeasibilityStore } from "@/stores/feasibility-store";
import { useIdentityStore } from "@/stores/identity-store";
import { useAppStore } from "@/services/store";
import { assignFeasibility, changeFeasibilityStatus, isOverdue, submitFinalDecision } from "@/services/feasibility/feasibility.service";
import { canStartCostingFromFeasibility } from "@/services/costing/costing.service";
import {
  assignDepartmentReviewer,
  listClarifications,
  listReviews,
  requestClarification,
  resolveClarification,
  respondClarification,
  startDepartmentReview,
  submitDepartmentReview,
} from "@/services/feasibility/feasibility-review.service";
import { createEvaluation, getEvaluation, submitEvaluation, updateEvaluation } from "@/services/feasibility/feasibility-evaluation.service";
import { FEASIBILITY_TRANSITIONS } from "@/services/feasibility/feasibility-workflow.service";
import { uploadFeasibilityDocument } from "@/services/feasibility/feasibility-document.service";
import {
  DEPARTMENT_REVIEW_STATUS_OPTIONS,
  EVALUATION_FACTOR_STATUS_OPTIONS,
  FEASIBILITY_DECISION_OPTIONS,
  NOT_FEASIBLE_REASON_OPTIONS,
  SUPPLY_AVAILABILITY_OPTIONS,
  pharmaLabel,
} from "@/constants/feasibility";
import type { FeasibilityDecision, FeasibilityDepartmentId, FeasibilityStatus, NotFeasibleReason } from "@/constants/feasibility";
import { formatDate, formatDateTime } from "@/lib/dates";
import { toUserMessage } from "@/lib/errors";

const TABS = ["Overview", "Reviews", "Evaluation", "Clarifications", "Documents", "Timeline", "Decision"] as const;

export function FeasibilityWorkspace({ id, initialTab = "Overview" }: { id: string; initialTab?: (typeof TABS)[number] }) {
  const router = useRouter();
  const { user } = useAuth();
  const item = useFeasibilityStore((state) => state.assessments.find((row) => row.id === id));
  const people = useIdentityStore((state) => state.users);
  const documents = useFeasibilityStore((state) => state.documents.filter((doc) => doc.feasibilityId === id));
  const audit = useAppStore((state) => state.db.auditLogs.filter((entry) => entry.recordId === id).slice(0, 40));
  const [tab, setTab] = useState<(typeof TABS)[number]>(initialTab);
  const [owner, setOwner] = useState("");
  const [question, setQuestion] = useState("");
  const [decision, setDecision] = useState<FeasibilityDecision>("FEASIBLE");
  const [remarks, setRemarks] = useState("");
  const [reason, setReason] = useState<NotFeasibleReason>("CAPACITY");
  const [condition, setCondition] = useState("");

  if (!item) return <EmptyState title="Feasibility not found" description="This assessment is unavailable." />;
  if (!user) return null;
  const actor = user;
  const current = item;
  const reviews = listReviews(id);
  const clarifications = listClarifications(id);
  const evaluation = getEvaluation(id);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:justify-between">
          <div className="flex gap-4">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><FlaskConical className="size-7" /></div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold">{item.feasibilityNumber}</h1>
                <StatusBadge value={item.status} />
                {isOverdue(item) ? <StatusBadge value="OVERDUE" /> : null}
                {item.overallDecision ? <StatusBadge value={item.overallDecision} /> : null}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{item.customerName} · {item.productName}</p>
              <p className="mt-2 text-sm">{item.assignedToName}{item.assignedDepartment ? ` · ${item.assignedDepartment}` : ""}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => router.push(`/crm/enquiries/${item.enquiryId}` as Route)}>Open enquiry</Button>
            <Can permission="feasibility.review"><Button variant="outline" onClick={() => router.push(`/crm/feasibility/${item.id}/review` as Route)}>Review</Button></Can>
            <Can permission="feasibility.update"><Button variant="outline" onClick={() => router.push(`/crm/feasibility/${item.id}/edit` as Route)}>Edit</Button></Can>
            <Can permission="costing.create">
              {canStartCostingFromFeasibility(item.id, actor) ? (
                <Button onClick={() => router.push(`/crm/costing/new?feasibilityId=${item.id}` as Route)}>Create Costing</Button>
              ) : null}
            </Can>
          </div>
        </div>
      </section>

      <div className="flex gap-1 overflow-x-auto border-b border-border pb-px">
        {TABS.map((name) => <button key={name} type="button" className={`shrink-0 rounded-t-md px-3 py-2 text-sm ${tab === name ? "bg-card font-medium" : "text-muted-foreground"}`} onClick={() => setTab(name)}>{name}</button>)}
      </div>

      {tab === "Overview" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card><CardHeader><CardTitle>Summary</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">
            {[["Feasibility", item.feasibilityNumber], ["Enquiry", item.enquiryNumber], ["Customer", item.customerName], ["Product", item.productName], ["Dosage", item.dosageForm], ["Strength", item.strength], ["Quantity", item.quantity?.toLocaleString()], ["Annual", item.annualQuantity?.toLocaleString()], ["Packaging", item.packaging], ["Market", item.market], ["Owner", item.assignedToName], ["Technical reviewer", item.technicalReviewerName], ["Target", formatDate(item.targetCompletionDate)], ["Priority", item.priority], ["Score", item.overallScore != null ? `${item.overallScore} / 100 (does not decide feasibility)` : "—"]].map(([label, value]) => (
              <div key={String(label)} className="flex justify-between gap-4"><span className="text-muted-foreground">{label}</span><span className="text-right">{value || "—"}</span></div>
            ))}
          </CardContent></Card>
          <Card><CardHeader><CardTitle>Assignment / workflow</CardTitle></CardHeader><CardContent className="space-y-3">
            <Can permission="feasibility.assign">
              <div className="flex gap-2">
                <Select value={owner || item.assignedTo} onChange={(event) => setOwner(event.target.value)}>{people.map((person) => <option key={person.id} value={person.id}>{person.displayName}</option>)}</Select>
                <Button onClick={async () => { try { await assignFeasibility(current.id, owner || current.assignedTo, actor); toast.success("Assigned"); } catch (error) { toast.error(toUserMessage(error)); } }}>Assign</Button>
              </div>
            </Can>
            <Can permission="feasibility.change_status">
              <Select defaultValue={item.status} onChange={async (event) => {
                try { await changeFeasibilityStatus(current.id, event.target.value as FeasibilityStatus, actor); toast.success("Status updated"); } catch (error) { toast.error(toUserMessage(error)); }
              }}>
                <option value={item.status}>{pharmaLabel(item.status)}</option>
                {FEASIBILITY_TRANSITIONS[item.status].map((status) => <option key={status} value={status}>{pharmaLabel(status)}</option>)}
              </Select>
            </Can>
            <p className="text-xs text-muted-foreground">Score is informational. Authorized users make the final decision.</p>
          </CardContent></Card>
        </div>
      ) : null}

      {tab === "Reviews" ? (
        <div className="space-y-4">
          {reviews.map((review) => (
            <Card key={review.id}>
              <CardHeader><CardTitle className="flex items-center justify-between">{review.departmentName}<StatusBadge value={review.status} /></CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p>Reviewer: {review.reviewerName ?? "Unassigned"} · Decision: {review.decision ?? "—"}</p>
                <p className="text-muted-foreground">{review.remarks || "No remarks yet."}</p>
                <div className="flex flex-wrap gap-2">
                  <Can permission="feasibility.assign">
                    <Select defaultValue={review.reviewerId ?? ""} onChange={(event) => void assignDepartmentReviewer(review.id, event.target.value, actor)}>
                      <option value="">Assign reviewer</option>
                      {people.map((person) => <option key={person.id} value={person.id}>{person.displayName}</option>)}
                    </Select>
                  </Can>
                  <Can permission="feasibility.review">
                    <Button size="sm" variant="outline" onClick={async () => { try { await startDepartmentReview(review.id, actor); toast.success("Review started"); } catch (error) { toast.error(toUserMessage(error)); } }}>Start</Button>
                    <ReviewSubmit reviewId={review.id} departmentId={review.departmentId} />
                  </Can>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {tab === "Evaluation" ? (
        <Card>
          <CardHeader><CardTitle>Technical evaluation</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">Weights are configurable in constants/feasibility.ts. The overall score does not auto-approve the product.</p>
            <Button size="sm" variant="outline" onClick={async () => { await createEvaluation(current.id, actor); toast.success("Evaluation opened"); }}>Open evaluation</Button>
            {evaluation ? (
              <div className="space-y-2">
                {evaluation.factors.map((factor, index) => (
                  <div key={factor.id} className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-4">
                    <p className="text-sm font-medium">{factor.name} <span className="text-xs text-muted-foreground">w={factor.weight}</span></p>
                    <Select defaultValue={factor.status} onChange={(event) => {
                      const factors = evaluation.factors.map((item, itemIndex) => itemIndex === index ? { ...item, status: event.target.value as typeof factor.status } : item);
                      void updateEvaluation(current.id, { factors }, actor);
                    }}>{EVALUATION_FACTOR_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select>
                    <Input type="number" min={0} max={10} defaultValue={factor.score ?? ""} placeholder="Score 0-10" onBlur={(event) => {
                      const score = event.target.value === "" ? undefined : Number(event.target.value);
                      const factors = evaluation.factors.map((item, itemIndex) => itemIndex === index ? { ...item, score } : item);
                      void updateEvaluation(current.id, { factors }, actor);
                    }} />
                    <Input defaultValue={factor.remarks ?? ""} placeholder="Remarks" onBlur={(event) => {
                      const factors = evaluation.factors.map((item, itemIndex) => itemIndex === index ? { ...item, remarks: event.target.value } : item);
                      void updateEvaluation(current.id, { factors }, actor);
                    }} />
                  </div>
                ))}
                <p className="text-sm">Overall score: {evaluation.overallScore ?? "—"} / 100</p>
                <Button onClick={async () => { try { await submitEvaluation(current.id, { factors: evaluation.factors }, actor); toast.success("Evaluation submitted — approval pending"); } catch (error) { toast.error(toUserMessage(error)); } }}>Submit evaluation</Button>
              </div>
            ) : <EmptyState title="No evaluation yet." description="Create the configurable scoring sheet first." />}
          </CardContent>
        </Card>
      ) : null}

      {tab === "Clarifications" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card><CardHeader><CardTitle>Open items</CardTitle></CardHeader><CardContent className="space-y-2">
            {clarifications.length === 0 ? <EmptyState title="No clarifications." description="Departments can request more information without leaving the assessment." /> : clarifications.map((row) => (
              <div key={row.id} className="rounded-lg border border-border p-3 text-sm">
                <p className="font-medium">{row.question}</p>
                <p className="text-xs text-muted-foreground">{row.departmentId} · {row.status} · {row.audience === "SALES" ? "Sales / customer (internal notification only)" : "Internal"}</p>
                {row.response ? <p className="mt-1">{row.response}</p> : null}
                <div className="mt-2 flex gap-2">
                  {row.status === "OPEN" ? <Button size="sm" variant="outline" onClick={async () => { const response = window.prompt("Response"); if (!response) return; try { await respondClarification(row.id, response, actor); toast.success("Responded"); } catch (error) { toast.error(toUserMessage(error)); } }}>Respond</Button> : null}
                  {row.status === "RESPONDED" ? <Button size="sm" variant="outline" onClick={async () => { await resolveClarification(row.id, actor); toast.success("Resolved"); }}>Resolve</Button> : null}
                </div>
              </div>
            ))}
          </CardContent></Card>
          <Can permission="feasibility.review">
            <Card><CardHeader><CardTitle>Request clarification</CardTitle></CardHeader><CardContent className="space-y-3">
              <Textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Please confirm annual quantity." />
              <Button disabled={!question.trim()} onClick={async () => {
                try {
                  await requestClarification(current.id, "SALES", question, "SALES", actor);
                  setQuestion("");
                  toast.success("Clarification sent internally");
                } catch (error) { toast.error(toUserMessage(error)); }
              }}>Notify sales</Button>
            </CardContent></Card>
          </Can>
        </div>
      ) : null}

      {tab === "Documents" ? (
        <Card><CardContent className="space-y-4 p-5">
          <Can permission="feasibility_documents.upload">
            <FileUpload label="Upload specification, artwork or technical file" onFile={async (file) => {
              try {
                await uploadFeasibilityDocument(current.id, file, actor);
                toast.success("Document version recorded");
              } catch (error) {
                toast.error(toUserMessage(error));
              }
            }} />
          </Can>
          {documents.length === 0 ? <EmptyState title="No documents." description="Versions are recorded. Files stay in Storage." /> : documents.map((doc) => <p key={doc.id} className="text-sm">v{doc.version} · {doc.fileName}</p>)}
        </CardContent></Card>
      ) : null}

      {tab === "Timeline" ? (
        <Card><CardContent className="p-5">
          {audit.length === 0 ? <EmptyState title="No timeline events." description="Uses the existing audit log." /> : (
            <Timeline>{audit.map((entry) => <TimelineItem key={entry.id} title={entry.action} meta={`${entry.userEmail} · ${formatDateTime(entry.timestamp)}`}>{entry.oldValue} → {entry.newValue}</TimelineItem>)}</Timeline>
          )}
        </CardContent></Card>
      ) : null}

      {tab === "Decision" ? (
        <Card>
          <CardHeader><CardTitle>Final decision</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2 text-sm">
              {reviews.map((review) => <p key={review.id}>{review.departmentName}: {review.decision ?? review.status}</p>)}
            </div>
            <Can permission="feasibility.final_decision">
              <Select value={decision} onChange={(event) => setDecision(event.target.value as FeasibilityDecision)}>{FEASIBILITY_DECISION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select>
              {decision === "NOT_FEASIBLE" ? <Select value={reason} onChange={(event) => setReason(event.target.value as NotFeasibleReason)}>{NOT_FEASIBLE_REASON_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select> : null}
              {decision === "PARTIALLY_FEASIBLE" ? <Input value={condition} onChange={(event) => setCondition(event.target.value)} placeholder="Condition, e.g. Feasible subject to minimum batch quantity" /> : null}
              <Textarea value={remarks} onChange={(event) => setRemarks(event.target.value)} placeholder="Remarks required" />
              <Button onClick={async () => {
                try {
                  await submitFinalDecision(current.id, {
                    decision,
                    remarks,
                    notFeasibleReason: decision === "NOT_FEASIBLE" ? reason : undefined,
                    conditions: decision === "PARTIALLY_FEASIBLE" && condition ? [{ condition, department: "PRODUCTION", owner: current.assignedTo, dueDate: "" }] : [],
                  }, actor);
                  toast.success("Decision recorded");
                } catch (error) { toast.error(toUserMessage(error)); }
              }}>Submit decision</Button>
            </Can>
            {item.conditions.length > 0 ? (
              <div className="space-y-2 text-sm">
                <p className="font-medium">Conditions</p>
                {item.conditions.map((row) => <p key={row.id}>{row.condition} · {row.status} · {row.ownerName}</p>)}
                <p className="text-xs text-muted-foreground">Partial feasibility stays conditional until conditions are resolved or waived.</p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function ReviewSubmit({ reviewId, departmentId }: { reviewId: string; departmentId: FeasibilityDepartmentId }) {
  const { user } = useAuth();
  const [status, setStatus] = useState("APPROVED");
  const [decision, setDecision] = useState<FeasibilityDecision>("FEASIBLE");
  const [remarks, setRemarks] = useState("");
  const [line, setLine] = useState("");
  if (!user) return null;
  return (
    <div className="grid w-full gap-2 sm:grid-cols-2">
      <Select value={status} onChange={(event) => setStatus(event.target.value)}>{DEPARTMENT_REVIEW_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select>
      <Select value={decision} onChange={(event) => setDecision(event.target.value as FeasibilityDecision)}>{FEASIBILITY_DECISION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select>
      {departmentId === "PRODUCTION" ? <Input value={line} onChange={(event) => setLine(event.target.value)} placeholder="Manufacturing line / capacity notes" /> : null}
      {departmentId === "SUPPLY_CHAIN" ? <Select defaultValue="AVAILABLE"><option value="">API availability</option>{SUPPLY_AVAILABILITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select> : null}
      <Textarea className="sm:col-span-2" value={remarks} onChange={(event) => setRemarks(event.target.value)} placeholder="Remarks" />
      <Button size="sm" onClick={async () => {
        try {
          await submitDepartmentReview(reviewId, { status: status as "APPROVED", decision, remarks, manufacturingLine: line, apiAvailability: "AVAILABLE" }, user);
          toast.success("Review submitted");
        } catch (error) { toast.error(toUserMessage(error)); }
      }}>Submit review</Button>
    </div>
  );
}
