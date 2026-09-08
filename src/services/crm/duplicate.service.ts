import type { CrmCustomer, DuplicateMatch } from "@/types/crm";

function normalize(value?: string): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function digits(value?: string): string {
  return (value ?? "").replace(/\D/g, "");
}

export function findDuplicateCustomers(
  input: Pick<CrmCustomer, "companyName" | "gstin" | "pan" | "primaryEmail" | "primaryPhone">,
  source: CrmCustomer[],
  ignoreId?: string,
): DuplicateMatch[] {
  const company = normalize(input.companyName);
  const gstin = normalize(input.gstin);
  const pan = normalize(input.pan);
  const email = normalize(input.primaryEmail);
  const phone = digits(input.primaryPhone);

  return source
    .filter((customer) => customer.id !== ignoreId && !customer.isArchived)
    .map((customer) => {
      const matchedOn: string[] = [];
      if (company && normalize(customer.companyName) === company) matchedOn.push("Company Name");
      if (gstin && normalize(customer.gstin) === gstin) matchedOn.push("GSTIN");
      if (pan && normalize(customer.pan) === pan) matchedOn.push("PAN");
      if (email && normalize(customer.primaryEmail) === email) matchedOn.push("Email");
      if (phone && digits(customer.primaryPhone) === phone) matchedOn.push("Phone");
      return { customer, matchedOn };
    })
    .filter((item) => item.matchedOn.length > 0);
}
