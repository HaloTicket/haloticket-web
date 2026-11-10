import type { PaidWithoutTicketsItem, PaymentExceptionItem, StockDiscrepancyItem } from "@/services/adminReconciliationApi";

export const ALL = "all";

/** Case-insensitive "contains" over several fields; an empty query matches everything. */
export function matchesText(query: string, ...fields: Array<string | null | undefined>): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return fields.some((f) => typeof f === "string" && f.toLowerCase().includes(q));
}

export interface ExceptionFilters { kind: string; q: string }
export interface PaidFilters { method: string; age: string; q: string }
export interface StockFilters { event: string; issue: string; q: string }

export const EMPTY_EXCEPTION_FILTERS: ExceptionFilters = { kind: ALL, q: "" };
export const EMPTY_PAID_FILTERS: PaidFilters = { method: ALL, age: ALL, q: "" };
export const EMPTY_STOCK_FILTERS: StockFilters = { event: ALL, issue: ALL, q: "" };

export const isFiltering = (f: Record<string, string>) => Object.values(f).some((v) => v !== ALL && v !== "");

export function filterExceptions(items: PaymentExceptionItem[], f: ExceptionFilters): PaymentExceptionItem[] {
  return items.filter(
    (i) => (f.kind === ALL || i.kind === f.kind)
      && matchesText(f.q, i.bookingCode, i.customerName, i.customerEmail, i.customerPhone, i.eventTitle, i.paymentId, i.bookingId),
  );
}

/** "recent" = paid less than 30 minutes ago, "waiting" = 30 minutes to 2 hours, "stale" = more than 2 hours. */
export function ageBucketOf(minutes: number): "recent" | "waiting" | "stale" {
  return minutes < 30 ? "recent" : minutes < 120 ? "waiting" : "stale";
}

export function filterPaid(items: PaidWithoutTicketsItem[], f: PaidFilters): PaidWithoutTicketsItem[] {
  return items.filter(
    (i) => (f.method === ALL || (i.paymentMethod ?? "") === f.method)
      && (f.age === ALL || ageBucketOf(i.minutesSincePaid) === f.age)
      && matchesText(f.q, i.bookingCode, i.customerName, i.customerEmail, i.customerPhone, i.eventTitle, i.bookingId),
  );
}

/** What is wrong with a stock row, as one filterable category (the first that applies). */
export function stockIssueOf(item: StockDiscrepancyItem): "unrecorded" | "notDeducted" | "overDeducted" | "held" | "other" {
  if (typeof item.initial !== "number" || (item.note ?? "").includes("INITIAL_QUANTITY_NULL")) return "unrecorded";
  if (typeof item.diffStockVsIssued === "number" && item.diffStockVsIssued < 0) return "notDeducted";
  if (typeof item.diffStockVsIssued === "number" && item.diffStockVsIssued > 0) return "overDeducted";
  if (typeof item.diffHeldVsReservations === "number" && item.diffHeldVsReservations !== 0) return "held";
  return "other";
}

export function filterStock(items: StockDiscrepancyItem[], f: StockFilters): StockDiscrepancyItem[] {
  return items.filter(
    (i) => (f.event === ALL || (i.eventId ?? "") === f.event)
      && (f.issue === ALL || stockIssueOf(i) === f.issue)
      && matchesText(f.q, i.eventTitle, i.name, i.eventId, i.ticketTypeId),
  );
}

/** Distinct values with a label, sorted by label, for a CustomSelect built from the loaded rows. */
export function distinctOptions<T>(items: T[], pick: (item: T) => { value?: string | null; label?: string | null }): { value: string; label: string }[] {
  const seen = new Map<string, string>();
  for (const item of items) {
    const { value, label } = pick(item);
    if (value && !seen.has(value)) seen.set(value, label || value);
  }
  return [...seen.entries()].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
}
