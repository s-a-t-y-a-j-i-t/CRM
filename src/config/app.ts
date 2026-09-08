export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "PATRI CMO";
export const COMPANY_NAME =
  process.env.NEXT_PUBLIC_COMPANY_NAME ?? "Patri Pharmaceutical Manufacturing";

export const SESSION_COOKIE_NAME =
  process.env.SESSION_COOKIE_NAME ?? "patri_cmo_session";

export const SESSION_MAX_AGE_DAYS = Number(
  process.env.SESSION_COOKIE_MAX_AGE_DAYS ?? "5",
);

export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

export const DEFAULT_CURRENCY = "INR" as const;

export const TIME_ZONE = "Asia/Kolkata";
