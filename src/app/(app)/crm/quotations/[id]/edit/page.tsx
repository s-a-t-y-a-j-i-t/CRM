"use client";

import { use } from "react";
import { QuotationHeaderEditor } from "@/features/quotations/quotation-editors";

export default function QuotationEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <QuotationHeaderEditor id={id} />;
}
