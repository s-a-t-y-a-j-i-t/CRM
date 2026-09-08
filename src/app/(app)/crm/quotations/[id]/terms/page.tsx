"use client";

import { use } from "react";
import { QuotationTermsEditor } from "@/features/quotations/quotation-editors";

export default function QuotationTermsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <QuotationTermsEditor id={id} />;
}
