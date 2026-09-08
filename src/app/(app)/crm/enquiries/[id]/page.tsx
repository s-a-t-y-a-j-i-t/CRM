"use client";

import { use } from "react";
import { EnquiryWorkspace } from "@/features/enquiries/enquiry-workspace";

export default function EnquiryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <EnquiryWorkspace id={id} />;
}
