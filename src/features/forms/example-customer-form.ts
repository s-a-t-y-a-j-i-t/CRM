import { customerSchema } from "@/schemas/domain";
import { parseClient, parseServer } from "@/lib/validation/parse";

/**
 * Form pattern for later modules:
 * 1. Bind fields with React Hook Form + zodResolver(customerSchema)
 * 2. Parse again with parseServer before any Firestore write
 * 3. Call customerService.create / update
 * 4. writeAuditLog({ action: "CREATE", module: "customers", ... })
 */
export function validateCustomerForm(values: unknown) {
  const client = parseClient(customerSchema, values);
  return parseServer(customerSchema, client);
}
