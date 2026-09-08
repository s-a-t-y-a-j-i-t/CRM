import type { ZodType } from "zod";
import { AppError } from "@/lib/errors";

export function parseClient<T>(schema: ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const details = Object.fromEntries(
      result.error.issues.map((issue) => [issue.path.join(".") || "form", issue.message]),
    );
    throw new AppError("VALIDATION", "Please correct the highlighted fields.", 422, details);
  }
  return result.data;
}

/** Server-side validation. Never persist unparsed payloads. */
export function parseServer<T>(schema: ZodType<T>, data: unknown): T {
  return parseClient(schema, data);
}
