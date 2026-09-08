"use client";

import { use } from "react";
import { PricingEditor } from "@/features/costing/costing-editors";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <PricingEditor id={id} />;
}
