import { format, isAfter, isBefore, parseISO, startOfDay } from "date-fns";

export function formatDate(value?: string | null, pattern = "dd MMM yyyy"): string {
  if (!value) return "—";
  try {
    return format(parseISO(value), pattern);
  } catch {
    return value;
  }
}

export function formatDateTime(value?: string | null): string {
  return formatDate(value, "dd MMM yyyy, HH:mm");
}

export function todayIso(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function isPastDate(value?: string | null): boolean {
  if (!value) return false;
  try {
    return isBefore(parseISO(value), startOfDay(new Date()));
  } catch {
    return false;
  }
}

export function isFutureDate(value?: string | null): boolean {
  if (!value) return false;
  try {
    return isAfter(parseISO(value), new Date());
  } catch {
    return false;
  }
}
