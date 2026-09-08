import type { CrmLead, LeadDuplicateMatch } from "@/types/leads";

function normalize(value?: string): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function digits(value?: string): string {
  return (value ?? "").replace(/\D/g, "");
}

export function findDuplicateLeads(
  input: Pick<CrmLead, "companyName" | "email" | "phone" | "productInterest" | "customerId">,
  source: CrmLead[],
  ignoreId?: string,
): LeadDuplicateMatch[] {
  const company = normalize(input.companyName);
  const email = normalize(input.email);
  const phone = digits(input.phone);
  const product = normalize(input.productInterest);
  const customerId = input.customerId;

  return source
    .filter((lead) => lead.id !== ignoreId && lead.status !== "LOST")
    .map((lead) => {
      const matchedOn: string[] = [];
      if (company && normalize(lead.companyName) === company) matchedOn.push("Company Name");
      if (email && normalize(lead.email) === email) matchedOn.push("Contact Email");
      if (phone && digits(lead.phone) === phone) matchedOn.push("Phone");
      if (product && normalize(lead.productInterest) === product) matchedOn.push("Product Interest");
      if (customerId && lead.customerId === customerId) matchedOn.push("Existing Customer");
      return { lead, matchedOn };
    })
    .filter((item) => item.matchedOn.length >= 2 || item.matchedOn.includes("Contact Email") || item.matchedOn.includes("Phone"));
}
