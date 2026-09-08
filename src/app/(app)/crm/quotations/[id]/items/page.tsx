"use client";

import { use } from "react";
import { QuotationItemsEditor } from "@/features/quotations/quotation-editors";

export default function QuotationItemsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <QuotationItemsEditor id={id} />;
}
