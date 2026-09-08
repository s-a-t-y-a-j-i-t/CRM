"use client";

import { use } from "react";
import { QuotationWorkspace } from "@/features/quotations/quotation-workspace";

export default function QuotationApprovalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <QuotationWorkspace id={id} initialTab="Approval" />;
}
