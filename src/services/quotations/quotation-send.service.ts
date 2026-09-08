import { authorizeClient } from "@/lib/auth/authorize-client";
import { assertCan } from "@/lib/rbac/can";
import { AppError } from "@/lib/errors";
import { useQuotationStore } from "@/stores/quotation-store";
import { getQuotationById } from "@/services/quotations/quotation.service";
import { notifyQuotationEvent } from "@/services/quotations/quotation-notify";
import type { QuotationRejectValues, QuotationSendValues } from "@/schemas/quotations";
import type { AuthenticatedUser } from "@/types/rbac";
import type { CrmQuotation } from "@/types/quotations";

export function buildMailto(values: QuotationSendValues, displayNumber: string): string {
  const params = new URLSearchParams({
    subject: values.subject,
    body: `${values.message}\n\nQuotation: ${displayNumber}\n(Attach the downloaded customer PDF. Internal notes are not included.)`,
  });
  if (values.cc) params.set("cc", values.cc);
  return `mailto:${values.recipient}?${params.toString()}`;
}

export async function sendQuotation(quotationId: string, values: QuotationSendValues, actor: AuthenticatedUser): Promise<{ quotation: CrmQuotation; mailto: string }> {
  assertCan(actor, "quotations.send");
  await authorizeClient("quotations.send");
  const current = getQuotationById(quotationId, actor);
  if (current.status !== "APPROVED" && current.status !== "SENT") {
    throw new AppError("VALIDATION", "Only an approved quotation can be sent.", 400);
  }
  if (current.status === "APPROVED") {
    useQuotationStore.getState().changeStatus(quotationId, "SENT", actor);
  }
  const next = useQuotationStore.getState().updateQuotation(quotationId, {
    sentAt: new Date().toISOString(),
    sentBy: actor.uid,
    sentTo: values.recipient,
    sentSubject: values.subject,
  }, actor);
  await notifyQuotationEvent({
    kind: "quotation_sent",
    title: "Quotation sent",
    body: `${next.displayNumber} sent to ${values.recipient}`,
    href: `/crm/quotations/${quotationId}`,
    recipientId: next.salesOwner,
    quotationId,
    actor,
  });
  return { quotation: next, mailto: buildMailto(values, next.displayNumber) };
}

export async function markQuotationViewed(quotationId: string, actor: AuthenticatedUser): Promise<CrmQuotation> {
  assertCan(actor, "quotations.update");
  const current = getQuotationById(quotationId, actor);
  if (current.status !== "SENT") return current;
  return useQuotationStore.getState().changeStatus(quotationId, "VIEWED", actor);
}

export async function startNegotiation(quotationId: string, actor: AuthenticatedUser): Promise<CrmQuotation> {
  assertCan(actor, "quotations.update");
  await authorizeClient("quotations.update");
  const current = getQuotationById(quotationId, actor);
  if (current.status !== "SENT" && current.status !== "VIEWED") {
    throw new AppError("VALIDATION", "Negotiation starts from a sent quotation.", 400);
  }
  return useQuotationStore.getState().changeStatus(quotationId, "NEGOTIATION", actor);
}

export async function acceptQuotation(quotationId: string, remarks: string | undefined, actor: AuthenticatedUser): Promise<CrmQuotation> {
  assertCan(actor, "quotations.approve");
  await authorizeClient("quotations.approve");
  const current = getQuotationById(quotationId, actor);
  if (current.status !== "SENT" && current.status !== "VIEWED" && current.status !== "NEGOTIATION") {
    throw new AppError("VALIDATION", "Only a sent quotation can be accepted.", 400);
  }
  useQuotationStore.getState().changeStatus(quotationId, "ACCEPTED", actor);
  const next = useQuotationStore.getState().updateQuotation(quotationId, {
    acceptedAt: new Date().toISOString(),
    acceptedBy: actor.uid,
    acceptanceRemarks: remarks,
  }, actor);
  await notifyQuotationEvent({
    kind: "quotation_accepted",
    title: "Quotation accepted",
    body: `${next.displayNumber} is ready for a sales order.`,
    href: `/crm/quotations/${quotationId}`,
    recipientId: next.salesOwner,
    quotationId,
    actor,
  });
  return next;
}

export async function rejectCustomerQuotation(quotationId: string, values: QuotationRejectValues, actor: AuthenticatedUser): Promise<CrmQuotation> {
  assertCan(actor, "quotations.reject");
  await authorizeClient("quotations.reject");
  const current = getQuotationById(quotationId, actor);
  if (current.status !== "SENT" && current.status !== "VIEWED" && current.status !== "NEGOTIATION") {
    throw new AppError("VALIDATION", "Only a sent quotation can be commercially rejected.", 400);
  }
  useQuotationStore.getState().changeStatus(quotationId, "REJECTED", actor);
  const next = useQuotationStore.getState().updateQuotation(quotationId, {
    rejectedAt: new Date().toISOString(),
    rejectionReason: values.rejectionReason,
    rejectionRemarks: values.rejectionRemarks,
  }, actor);
  await notifyQuotationEvent({
    kind: "quotation_customer_rejected",
    title: "Quotation commercially rejected",
    body: `${next.displayNumber} · ${values.rejectionReason}`,
    href: `/crm/quotations/${quotationId}`,
    recipientId: next.salesOwner,
    quotationId,
    actor,
  });
  return next;
}
