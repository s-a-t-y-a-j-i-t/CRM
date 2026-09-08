import { isDemoMode } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { authorizeClient } from "@/lib/auth/authorize-client";
import { assertCan } from "@/lib/rbac/can";
import { useQuotationStore } from "@/stores/quotation-store";
import { getQuotationById } from "@/services/quotations/quotation.service";
import { notifyQuotationEvent } from "@/services/quotations/quotation-notify";
import { formatQuotationDisplay } from "@/services/quotations/quotation-code";
import type { AuthenticatedUser } from "@/types/rbac";
import type { CrmQuotation } from "@/types/quotations";

export async function createQuotationRevision(id: string, changeReason: string, actor: AuthenticatedUser): Promise<CrmQuotation> {
  assertCan(actor, "quotations.revise");
  await authorizeClient("quotations.revise");
  const current = getQuotationById(id, actor);
  if (!changeReason.trim()) throw new AppError("VALIDATION", "A revision reason is required.", 400);
  if (isDemoMode()) {
    const store = useQuotationStore.getState();
    const family = store.quotations.filter((item) => item.familyId === current.familyId);
    const nextVersion = Math.max(...family.map((item) => item.version)) + 1;
    store.addVersion({
      id: `qver_${crypto.randomUUID().slice(0, 8)}`,
      quotationId: current.id,
      quotationNumber: current.quotationNumber,
      version: current.version,
      changeReason,
      totals: current.totals,
      paymentTerms: current.terms.paymentTerms,
      deliveryTerms: current.terms.deliveryTerms,
      validUntil: current.validUntil,
      createdAt: new Date().toISOString(),
      createdBy: actor.uid,
      createdByName: actor.displayName,
    });
    const created = store.createQuotation(
      {
        ...current,
        status: "DRAFT",
        approvalStatus: "NOT_SUBMITTED",
        approvedBy: undefined,
        approvedByName: undefined,
        approvedAt: undefined,
        sentAt: undefined,
        sentBy: undefined,
        sentTo: undefined,
        viewedAt: undefined,
        acceptedAt: undefined,
        rejectedAt: undefined,
        version: nextVersion,
        familyId: current.familyId,
        quotationNumber: current.quotationNumber,
        internalNotes: changeReason,
        isDemoData: false,
      },
      actor,
    );
    store.replaceItems(
      created.id,
      store.items.filter((item) => item.quotationId === current.id).map((item) => ({
        ...item,
        id: `qitem_${crypto.randomUUID().slice(0, 8)}`,
        quotationId: created.id,
      })),
    );
    store.replaceCharges(
      created.id,
      store.charges.filter((item) => item.quotationId === current.id).map((item) => ({
        ...item,
        id: `qch_${crypto.randomUUID().slice(0, 8)}`,
        quotationId: created.id,
      })),
    );
    const next = store.recalculate(created.id);
    await notifyQuotationEvent({
      kind: "quotation_revised",
      title: "Quotation revised",
      body: `${formatQuotationDisplay(next.quotationNumber, next.version)} · ${changeReason}`,
      href: `/crm/quotations/${next.id}`,
      recipientId: next.salesOwner,
      quotationId: next.id,
      actor,
    });
    return next;
  }
  const response = await fetch(`/api/crm/quotations/${id}/version`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ changeReason }),
  });
  const data = (await response.json().catch(() => ({}))) as { quotation?: CrmQuotation; error?: string };
  if (!response.ok || !data.quotation) {
    throw new AppError("INTERNAL", data.error ?? "Unable to revise quotation.", response.status || 500);
  }
  return data.quotation;
}
