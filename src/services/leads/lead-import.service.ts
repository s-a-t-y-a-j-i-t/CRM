import { leadFormSchema, type LeadFormValues } from "@/schemas/leads";
import type { AuthenticatedUser } from "@/types/rbac";
import { assertCan } from "@/lib/rbac/can";

export interface LeadImportPreviewRow {
  rowNumber: number;
  values: Partial<LeadFormValues>;
  errors: string[];
}

function splitCsv(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (const char of line) {
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === "," && !quoted) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current.trim());
  return cells;
}

export function parseLeadImportCsv(text: string): LeadImportPreviewRow[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];
  const header = splitCsv(lines[0] ?? "").map((item) => item.toLowerCase());
  return lines.slice(1).map((line, index) => {
    const cells = splitCsv(line);
    const read = (name: string) => cells[header.indexOf(name)] ?? "";
    const values: Partial<LeadFormValues> = {
      companyName: read("company") || read("company name"),
      contactName: read("contact") || read("contact name"),
      email: read("email"),
      phone: read("phone"),
      leadSource: (read("source") || read("lead source") || "OTHER").toUpperCase().replaceAll(" ", "_") as LeadFormValues["leadSource"],
      productInterest: read("product") || read("product interest"),
      requiredQuantity: read("quantity") ? Number(read("quantity")) : undefined,
      assignedTo: read("assigned user") || read("assigned to"),
      priority: "MEDIUM",
      expectedBusinessValue: 0,
      status: "NEW",
    };
    const parsed = leadFormSchema.safeParse({
      ...values,
      assignedTo: values.assignedTo || "missing",
      leadSource: values.leadSource || "OTHER",
    });
    return {
      rowNumber: index + 2,
      values,
      errors: parsed.success ? [] : parsed.error.issues.map((issue) => issue.message),
    };
  });
}

export function assertLeadImportAllowed(actor: AuthenticatedUser): void {
  assertCan(actor, "leads.create");
}
