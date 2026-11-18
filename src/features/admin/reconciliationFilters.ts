import type { PaidWithoutTicketsItem, PaymentExceptionItem, StockDiscrepancyItem } from "@/services/adminReconciliationApi";

export const ALL = "all";

/** So khớp không phân biệt hoa thường theo kiểu "chứa" trên nhiều trường; truy vấn rỗng thì khớp tất cả. */
export function matchesText(query: string, ...fields: Array<string | null | undefined>): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return fields.some((f) => typeof f === "string" && f.toLowerCase().includes(q));
}

/** Bộ lọc danh sách thanh toán ngoại lệ: loại ngoại lệ và từ khóa tìm kiếm. */
export interface ExceptionFilters { kind: string; q: string }
/** Bộ lọc danh sách đơn đã thanh toán thiếu vé: phương thức thanh toán, nhóm thời gian chờ và từ khóa. */
export interface PaidFilters { method: string; age: string; q: string }
/** Bộ lọc danh sách hạng vé lệch kho: sự kiện, loại lệch và từ khóa. */
export interface StockFilters { event: string; issue: string; q: string }

export const EMPTY_EXCEPTION_FILTERS: ExceptionFilters = { kind: ALL, q: "" };
export const EMPTY_PAID_FILTERS: PaidFilters = { method: ALL, age: ALL, q: "" };
export const EMPTY_STOCK_FILTERS: StockFilters = { event: ALL, issue: ALL, q: "" };

/** Cho biết có bộ lọc nào đang áp dụng (khác giá trị "tất cả" hoặc chuỗi rỗng) hay không. */
export const isFiltering = (f: Record<string, string>) => Object.values(f).some((v) => v !== ALL && v !== "");

/** Lọc danh sách ngoại lệ theo loại và từ khóa (mã đơn, thông tin khách, sự kiện, mã thanh toán). */
export function filterExceptions(items: PaymentExceptionItem[], f: ExceptionFilters): PaymentExceptionItem[] {
  return items.filter(
    (i) => (f.kind === ALL || i.kind === f.kind)
      && matchesText(f.q, i.bookingCode, i.customerName, i.customerEmail, i.customerPhone, i.eventTitle, i.paymentId, i.bookingId),
  );
}

/** Nhóm thời gian chờ: `recent` là đã thanh toán dưới 30 phút, `waiting` từ 30 phút đến 2 giờ, `stale` là trên 2 giờ. */
export function ageBucketOf(minutes: number): "recent" | "waiting" | "stale" {
  return minutes < 30 ? "recent" : minutes < 120 ? "waiting" : "stale";
}

/** Lọc danh sách đơn đã thanh toán thiếu vé theo phương thức, nhóm thời gian chờ và từ khóa. */
export function filterPaid(items: PaidWithoutTicketsItem[], f: PaidFilters): PaidWithoutTicketsItem[] {
  return items.filter(
    (i) => (f.method === ALL || (i.paymentMethod ?? "") === f.method)
      && (f.age === ALL || ageBucketOf(i.minutesSincePaid) === f.age)
      && matchesText(f.q, i.bookingCode, i.customerName, i.customerEmail, i.customerPhone, i.eventTitle, i.bookingId),
  );
}

/** Phân loại lỗi của một dòng kho thành một nhóm lọc được (lấy nhóm đầu tiên phù hợp). */
export function stockIssueOf(item: StockDiscrepancyItem): "unrecorded" | "notDeducted" | "overDeducted" | "held" | "other" {
  if (typeof item.initial !== "number" || (item.note ?? "").includes("INITIAL_QUANTITY_NULL")) return "unrecorded";
  if (typeof item.diffStockVsIssued === "number" && item.diffStockVsIssued < 0) return "notDeducted";
  if (typeof item.diffStockVsIssued === "number" && item.diffStockVsIssued > 0) return "overDeducted";
  if (typeof item.diffHeldVsReservations === "number" && item.diffHeldVsReservations !== 0) return "held";
  return "other";
}

/** Lọc danh sách hạng vé lệch kho theo sự kiện, loại lệch và từ khóa. */
export function filterStock(items: StockDiscrepancyItem[], f: StockFilters): StockDiscrepancyItem[] {
  return items.filter(
    (i) => (f.event === ALL || (i.eventId ?? "") === f.event)
      && (f.issue === ALL || stockIssueOf(i) === f.issue)
      && matchesText(f.q, i.eventTitle, i.name, i.eventId, i.ticketTypeId),
  );
}

/** Các giá trị không trùng kèm nhãn, sắp theo nhãn, dùng để dựng CustomSelect từ các dòng đã tải. */
export function distinctOptions<T>(items: T[], pick: (item: T) => { value?: string | null; label?: string | null }): { value: string; label: string }[] {
  const seen = new Map<string, string>();
  for (const item of items) {
    const { value, label } = pick(item);
    if (value && !seen.has(value)) seen.set(value, label || value);
  }
  return [...seen.entries()].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
}
