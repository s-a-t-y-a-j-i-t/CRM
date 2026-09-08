import { z } from "zod";

export const idSchema = z.string().min(1).max(80);
export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
export const isoDateTimeSchema = z.string().min(10).max(40);
export const moneyMinorSchema = z.number().int();
export const currencySchema = z.enum(["INR", "USD", "EUR", "GBP"]);
export const nonEmpty = z.string().trim().min(1).max(240);
export const longText = z.string().trim().max(4000).optional();

export const listQuerySchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  search: z.string().max(120).optional(),
  sortBy: z.string().max(60).optional(),
  sortDirection: z.enum(["asc", "desc"]).default("desc"),
  filters: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
});
