"use client";

import { use, useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { MoreHorizontal, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { StatCard } from "@/components/shared/stat-card";
import { Timeline, TimelineItem } from "@/components/shared/timeline";
import { FileUpload } from "@/components/shared/file-upload";
import { Can } from "@/components/rbac/can";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ConvertDialog } from "@/features/leads/convert-dialog";
import { useAuth } from "@/hooks/useAuth";
import { useLeadStore } from "@/stores/lead-store";
import { useEnquiryStore } from "@/stores/enquiry-store";
import { useIdentityStore } from "@/stores/identity-store";
import { assignLead, changeLeadStatus, convertLead, markLeadLost, reactivateLead } from "@/services/leads/lead.service";
import {
  classifyFollowUp,
  completeLeadFollowUp,
  createLeadActivity,
  createLeadFollowUp,
  createLeadNote,
  listLeadActivities,
  listLeadAudit,
  listLeadFollowUps,
  listLeadNotes,
} from "@/services/leads/lead-activity.service";
import { listLeadDocuments, uploadLeadDocument } from "@/services/leads/lead-document.service";
import { formatDate, formatDateTime, nowIso } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { toUserMessage } from "@/lib/errors";
import { LEAD_ACTIVITY_OPTIONS, LOST_REASON_OPTIONS, labelForLead } from "@/constants/leads";
import { LEAD_TRANSITIONS } from "@/services/leads/lead-workflow.service";
import type { LeadStatus, LostReason } from "@/types/leads";
import type { LeadConvertValues } from "@/schemas/leads";

const TABS = ["Overview", "Contact", "Product Requirement", "Activities", "Follow-ups", "Timeline", "Documents", "Conversion"] as const;

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const lead = useLeadStore((state) => state.leads.find((item) => item.id === id));
  const salesPeople = useIdentityStore((state) => state.users);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");
  const [moreOpen, setMoreOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [nextOwner, setNextOwner] = useState("");
  const [statusOpen, setStatusOpen] = useState(false);
  const [nextStatus, setNextStatus] = useState<LeadStatus>("CONTACTED");
  const [lostOpen, setLostOpen] = useState(false);
  const [lostReason, setLostReason] = useState<LostReason>("NO_RESPONSE");
  const [lostNotes, setLostNotes] = useState("");
  const [convertOpen, setConvertOpen] = useState(false);
  const [note, setNote] = useState("");
  const [activitySubject, setActivitySubject] = useState("");
  const [activityType, setActivityType] = useState("CALL");
  const [followPurpose, setFollowPurpose] = useState("");
  const [followAt, setFollowAt] = useState("");
  const activities = listLeadActivities(id);
  const notes = listLeadNotes(id);
  const followUps = listLeadFollowUps(id);
  const documents = listLeadDocuments(id);
  const audit = listLeadAudit(id);
  const enquiry = useLeadStore((state) => state.enquiryStubs.find((item) => item.leadId === id));
  const convertedEnquiry = useEnquiryStore((state) =>
    state.enquiries.find((item) => item.id === lead?.convertedEnquiryId || item.leadId === id),
  );

  if (!lead) {
    return <EmptyState title="Lead not found" description="This lead record is unavailable." />;
  }
  if (!user) return null;
  const current = lead;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <UserRound className="size-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight">{lead.companyName}</h1>
                <StatusBadge value={lead.status} />
                <StatusBadge value={lead.priority} />
                {lead.isDemoData ? <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Demo</span> : null}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{lead.leadCode} · Score {lead.score}</p>
              <p className="mt-2 text-sm">{lead.assignedToName} · {lead.contactName}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Can permission="leads.update">
              <Button onClick={() => router.push(`/crm/leads/${lead.id}/edit` as Route)}>Edit</Button>
            </Can>
            <Can permission="leads.assign">
              <Button variant="outline" onClick={() => { setNextOwner(lead.assignedTo); setAssignOpen(true); }}>Assign</Button>
            </Can>
            <Can permission="leads.change_status">
              <Button variant="outline" onClick={() => { setNextStatus(LEAD_TRANSITIONS[lead.status][0] ?? lead.status); setStatusOpen(true); }}>Change status</Button>
            </Can>
            <Can permission="activities.create">
              <Button variant="outline" onClick={() => setTab("Activities")}>Add activity</Button>
            </Can>
            <Can permission="leads.convert">
              {lead.status === "WON" && lead.convertedCustomerId ? null : (
                <Button variant="outline" onClick={() => setConvertOpen(true)}>Convert</Button>
              )}
            </Can>
            <div className="relative">
              <Button variant="ghost" size="icon" aria-label="More actions" onClick={() => setMoreOpen((value) => !value)}>
                <MoreHorizontal />
              </Button>
              {moreOpen ? (
                <div className="absolute right-0 z-20 mt-1 w-48 rounded-md border border-border bg-card p-1 shadow-lg">
                  <Can permission="leads.change_status">
                    {lead.status !== "LOST" ? (
                      <button type="button" className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted" onClick={() => { setMoreOpen(false); setLostOpen(true); }}>
                        Mark lost
                      </button>
                    ) : (
                      <button type="button" className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted" onClick={async () => {
                        setMoreOpen(false);
                        try {
                          await reactivateLead(current.id, user);
                          toast.success("Lead reactivated");
                        } catch (error) {
                          toast.error(toUserMessage(error));
                        }
                      }}>
                        Reactivate
                      </button>
                    )}
                    {lead.status === "ON_HOLD" ? (
                      <button type="button" className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted" onClick={async () => {
                        setMoreOpen(false);
                        try {
                          await reactivateLead(current.id, user);
                          toast.success("Lead taken off hold");
                        } catch (error) {
                          toast.error(toUserMessage(error));
                        }
                      }}>
                        Resume from hold
                      </button>
                    ) : null}
                  </Can>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Expected value" value={formatMoney(lead.expectedBusinessValueMinor, "INR")} />
        <StatCard label="Next follow-up" value={formatDate(lead.nextFollowUpDate)} />
        <StatCard label="Closing date" value={formatDate(lead.expectedClosingDate)} />
        <StatCard label="Assigned" value={lead.assignedToName} />
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-border pb-px">
        {TABS.map((item) => (
          <button
            key={item}
            type="button"
            className={`shrink-0 rounded-t-md px-3 py-2 text-sm ${tab === item ? "bg-card font-medium text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => setTab(item)}
          >
            {item}
          </button>
        ))}
      </div>

      {tab === "Overview" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <InfoCard title="Lead information" rows={[
            ["Lead code", lead.leadCode],
            ["Company", lead.companyName],
            ["Source", labelForLead(lead.leadSource)],
            ["Type", lead.leadType ? labelForLead(lead.leadType) : "—"],
            ["Priority", lead.priority],
            ["Assigned employee", lead.assignedToName],
            ["Assigned date", formatDateTime(lead.assignedAt)],
            ["Created", formatDateTime(lead.createdAt)],
            ["Expected closing", formatDate(lead.expectedClosingDate)],
          ]} />
          <InfoCard title="Product requirement" rows={[
            ["Product interest", lead.productInterest],
            ["Dosage form", lead.dosageForm],
            ["Strength", lead.strength],
            ["Composition", lead.composition],
            ["Required quantity", lead.requiredQuantity?.toLocaleString()],
            ["Annual quantity", lead.annualQuantity?.toLocaleString()],
            ["Target price", lead.targetPriceMinor ? formatMoney(lead.targetPriceMinor, "INR") : "—"],
          ]} />
          <InfoCard title="Business" rows={[
            ["Expected business value", formatMoney(lead.expectedBusinessValueMinor, "INR")],
            ["Market", lead.market],
            ["Country", lead.country],
            ["Score", String(lead.score)],
          ]} />
          <Card>
            <CardHeader><CardTitle>Internal notes</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {lead.notes ? <p className="text-sm">{lead.notes}</p> : <p className="text-sm text-muted-foreground">No account-level notes.</p>}
              <Can permission="leads.update">
                <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Customer requested 100,000 tablets per month." />
                <Button size="sm" disabled={!note.trim()} onClick={async () => {
                  try {
                    await createLeadNote(current.id, note, user);
                    setNote("");
                    toast.success("Note added");
                  } catch (error) {
                    toast.error(toUserMessage(error));
                  }
                }}>Add note</Button>
              </Can>
              {notes.length === 0 ? null : (
                <ul className="space-y-2 text-sm">
                  {notes.map((item) => (
                    <li key={item.id} className="rounded-lg border border-border p-3">
                      <p>{item.text}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{item.createdByName} · {formatDateTime(item.createdAt)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {tab === "Contact" ? (
        <InfoCard title="Contact" rows={[
          ["Name", lead.contactName],
          ["Designation", lead.contactDesignation],
          ["Email", lead.email],
          ["Phone", lead.phone],
          ["Alternate phone", lead.alternatePhone],
          ["WhatsApp", lead.whatsapp],
          ["Website", lead.website],
          ["Linked customer", lead.customerId],
          ["Linked contact", lead.contactId],
        ]} />
      ) : null}

      {tab === "Product Requirement" ? (
        <InfoCard title="Product requirement" rows={[
          ["Product interest", lead.productInterest],
          ["Dosage form", lead.dosageForm],
          ["Strength", lead.strength],
          ["Composition", lead.composition],
          ["Required quantity", lead.requiredQuantity?.toLocaleString()],
          ["Annual quantity", lead.annualQuantity?.toLocaleString()],
          ["Target price", lead.targetPriceMinor ? formatMoney(lead.targetPriceMinor, "INR") : "—"],
        ]} />
      ) : null}

      {tab === "Activities" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Activity feed</CardTitle></CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <EmptyState title="No activities recorded." description="Calls, meetings, visits and tasks will appear here." />
              ) : (
                <Timeline>
                  {activities.map((item) => (
                    <TimelineItem key={item.id} title={item.subject} meta={`${item.type} · ${item.createdByName} · ${formatDateTime(item.activityDate)}`}>
                      {item.description ? <p className="text-xs text-muted-foreground">{item.description}</p> : null}
                    </TimelineItem>
                  ))}
                </Timeline>
              )}
            </CardContent>
          </Card>
          <Can permission="activities.create">
            <Card>
              <CardHeader><CardTitle>Log activity</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Select value={activityType} onChange={(event) => setActivityType(event.target.value)}>
                  {LEAD_ACTIVITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </Select>
                <Input placeholder="Subject" value={activitySubject} onChange={(event) => setActivitySubject(event.target.value)} />
                <Button disabled={!activitySubject.trim()} onClick={async () => {
                  try {
                    await createLeadActivity(current.id, {
                      type: activityType as "CALL",
                      subject: activitySubject,
                      activityDate: nowIso(),
                    }, user);
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
            <CardHeader><CardTitle>Scheduled follow-ups</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {followUps.length === 0 ? (
                <EmptyState title="No follow-ups scheduled." description="Add a dated follow-up for the assigned owner." />
              ) : (
                followUps.map((item) => {
                  const bucket = classifyFollowUp(item);
                  return (
                    <div key={item.id} className={`rounded-lg border p-3 text-sm ${bucket === "overdue" ? "border-destructive/50 bg-destructive/5" : "border-border"}`}>
                      <p className="font-medium">{item.purpose}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(item.followUpAt)} · {item.assignedToName} · {bucket}</p>
                      {item.status === "PENDING" ? (
                        <Button size="sm" variant="ghost" className="mt-2" onClick={async () => {
                          try {
                            await completeLeadFollowUp(item.id, user);
                            toast.success("Follow-up completed");
                          } catch (error) {
                            toast.error(toUserMessage(error));
                          }
                        }}>Complete</Button>
                      ) : null}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
          <Can permission="activities.create">
            <Card>
              <CardHeader><CardTitle>Schedule follow-up</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Input type="datetime-local" value={followAt} onChange={(event) => setFollowAt(event.target.value)} />
                <Input placeholder="Purpose" value={followPurpose} onChange={(event) => setFollowPurpose(event.target.value)} />
                <Button disabled={!followAt || !followPurpose.trim()} onClick={async () => {
                  try {
                    await createLeadFollowUp(current.id, {
                      followUpAt: new Date(followAt).toISOString(),
                      assignedTo: current.assignedTo,
                      purpose: followPurpose,
                      priority: current.priority,
                      status: "PENDING",
                    }, user);
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

      {tab === "Timeline" ? (
        <Card>
          <CardHeader><CardTitle>Timeline</CardTitle></CardHeader>
          <CardContent>
            {activities.length === 0 && audit.length === 0 ? (
              <EmptyState title="No timeline events yet." description="Creation, assignment, status, follow-ups and conversion stay in the existing audit log." />
            ) : (
              <Timeline>
                {activities.map((item) => (
                  <TimelineItem key={item.id} title={item.subject} meta={`${item.createdByName} · ${formatDateTime(item.activityDate)}`}>
                    {item.description}
                  </TimelineItem>
                ))}
                {audit.map((entry) => (
                  <TimelineItem key={entry.id} title={`${entry.action.replaceAll("_", " ")}`} meta={`${entry.userEmail} · ${formatDateTime(entry.timestamp)}`}>
                    {entry.oldValue || entry.newValue ? `${entry.oldValue ?? "—"} → ${entry.newValue ?? "—"}` : ""}
                  </TimelineItem>
                ))}
              </Timeline>
            )}
          </CardContent>
        </Card>
      ) : null}

      {tab === "Documents" ? (
        <Card>
          <CardHeader><CardTitle>Documents</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Can permission="leads.update">
              <FileUpload
                label="Upload requirement, specification, artwork or attachment"
                onFile={async (file) => {
                  try {
                    await uploadLeadDocument(current.id, file, user);
                    toast.success("Document recorded");
                  } catch (error) {
                    toast.error(toUserMessage(error));
                  }
                }}
              />
            </Can>
            {documents.length === 0 ? (
              <EmptyState title="No documents uploaded." description="Files are stored in Firebase Storage. Firestore keeps metadata only." />
            ) : (
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr>{["Document Name", "Type", "Version", "Uploaded By", "Uploaded Date", "Status"].map((header) => <th key={header} className="py-2">{header}</th>)}</tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr key={doc.id} className="border-t border-border">
                      <td className="py-2">{doc.name}</td>
                      <td>{doc.type}</td>
                      <td>{doc.version}</td>
                      <td>{doc.uploadedByName}</td>
                      <td>{formatDateTime(doc.uploadedAt)}</td>
                      <td><StatusBadge value={doc.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      ) : null}

      {tab === "Conversion" ? (
        <Card>
          <CardHeader><CardTitle>Conversion</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {lead.convertedCustomerId ? (
              <>
                <p>This lead is converted. Status is Enquiry Created when an enquiry was produced.</p>
                <p>Customer: {lead.convertedCustomerId}</p>
                <p>Enquiry: {convertedEnquiry?.enquiryNumber ?? lead.convertedEnquiryId ?? "Not created"}</p>
                <p>Converted at: {formatDateTime(lead.convertedAt)}</p>
                {enquiry && !convertedEnquiry ? <p>Legacy stub: {enquiry.enquiryCode} · {enquiry.status}</p> : null}
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => router.push(`/crm/customers/${lead.convertedCustomerId}` as Route)}>Open customer</Button>
                  {convertedEnquiry ? (
                    <Button variant="outline" onClick={() => router.push(`/crm/enquiries/${convertedEnquiry.id}` as Route)}>Open enquiry</Button>
                  ) : null}
                </div>
              </>
            ) : (
              <>
                <p className="text-muted-foreground">Convert to an existing or new customer and create an enquiry with the transferred product requirement.</p>
                <Can permission="leads.convert">
                  <Button onClick={() => setConvertOpen(true)}>Start conversion</Button>
                </Can>
              </>
            )}
          </CardContent>
        </Card>
      ) : null}

      {assignOpen ? (
        <>
          <ConfirmDialog title="Assign lead" description={`Current owner ${current.assignedToName}. Department stays on the employee profile.`} confirmLabel="Assign" onCancel={() => setAssignOpen(false)} onConfirm={async () => {
            try {
              await assignLead(current.id, nextOwner, user);
              toast.success("Lead assigned");
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
          <ConfirmDialog title="Change status" description="Transitions are validated by lead-workflow.service." confirmLabel="Update" onCancel={() => setStatusOpen(false)} onConfirm={async () => {
            try {
              await changeLeadStatus(current.id, nextStatus, user);
              toast.success("Status updated");
            } catch (error) {
              toast.error(toUserMessage(error));
            } finally {
              setStatusOpen(false);
            }
          }} />
          <div className="fixed inset-x-0 bottom-6 z-[60] mx-auto w-full max-w-sm rounded-xl border border-border bg-card p-3 shadow-lg">
            <Select value={nextStatus} onChange={(event) => setNextStatus(event.target.value as LeadStatus)}>
              {LEAD_TRANSITIONS[current.status].map((status) => <option key={status} value={status}>{labelForLead(status)}</option>)}
            </Select>
          </div>
        </>
      ) : null}
      {lostOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-xl">
            <h2 className="text-lg font-semibold">Mark lead lost</h2>
            <p className="mt-1 text-sm text-muted-foreground">A reason is required. History is retained.</p>
            <div className="mt-4 space-y-3">
              <Select value={lostReason} onChange={(event) => setLostReason(event.target.value as LostReason)}>
                {LOST_REASON_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </Select>
              <Textarea value={lostNotes} onChange={(event) => setLostNotes(event.target.value)} placeholder="Explanation" />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setLostOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={async () => {
                try {
                  await markLeadLost(current.id, lostReason, lostNotes, user);
                  toast.success("Lead marked lost");
                  setLostOpen(false);
                } catch (error) {
                  toast.error(toUserMessage(error));
                }
              }}>Mark lost</Button>
            </div>
          </div>
        </div>
      ) : null}
      {convertOpen ? (
        <ConvertDialog lead={current} onCancel={() => setConvertOpen(false)} onConfirm={async (values: LeadConvertValues) => {
          try {
            await convertLead(current.id, values, user);
            toast.success("Lead converted");
            setConvertOpen(false);
          } catch (error) {
            toast.error(toUserMessage(error));
          }
        }} />
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
