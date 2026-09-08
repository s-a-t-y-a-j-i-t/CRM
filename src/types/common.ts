export type IsoDateString = string;
export type EntityId = string;
export type UserId = string;
export type CurrencyCode = "INR" | "USD" | "EUR" | "GBP";

/** Integer minor units (paise/cents). Never use floating-point for money math. */
export type MoneyMinor = number;

export type RecordStatus = "active" | "inactive" | "archived";

export interface AuditFields {
  id: EntityId;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
  createdBy: UserId;
  updatedBy: UserId;
  status: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface ListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  filters?: Record<string, string | number | boolean | null | undefined>;
}

export interface SelectOption {
  value: string;
  label: string;
}

export type RelatedRecordType =
  | "customer"
  | "contact"
  | "lead"
  | "enquiry"
  | "opportunity"
  | "product"
  | "product_requirement"
  | "feasibility"
  | "costing"
  | "quotation"
  | "purchase_order"
  | "manufacturing_order"
  | "batch"
  | "dispatch"
  | "invoice"
  | "payment"
  | "complaint"
  | "document"
  | "activity";
