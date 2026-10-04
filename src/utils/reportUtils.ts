import type { AdminEventReport, EventReportFilters, EventReportRow, ReportTimelinePoint } from "@/services/adminReportsApi";
import axios from "axios";

export function hcmToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const value = (name: string) => parts.find(part => part.type === name)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}
export function shiftDate(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day + days));
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}-${String(value.getUTCDate()).padStart(2, "0")}`;
}
export function isValidReportPeriod(from: string, to: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to) return false;
  const parse = (value: string) => { const [year, month, day] = value.split("-").map(Number); const date = new Date(Date.UTC(year, month - 1, day)); return date.toISOString().slice(0, 10) === value ? date : null; };
  const start = parse(from); const end = parse(to);
  return Boolean(start && end && (end.getTime() - start.getTime()) / 86_400_000 < 366);
}
export function filtersFromSearch(search: string, today = hcmToday()): EventReportFilters {
  const params = new URLSearchParams(search);
  const to = params.get("to") || today;
  const from = params.get("from") || shiftDate(to, -29);
  const sort = params.get("sort");
  const requestedPage = Number(params.get("page"));
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  return { from, to, q: params.get("q") || undefined, categoryId: params.get("categoryId") || undefined,
    organizerId: params.get("organizerId") || undefined, status: params.get("status") || undefined,
    sort: sort === "orders" || sort === "tickets" || sort === "title" ? sort : "revenue",
    page, size: [10, 20, 50].includes(Number(params.get("size"))) ? Number(params.get("size")) : 10 };
}
export function reportQuery(filters: EventReportFilters): string {
  const params = new URLSearchParams();
  (Object.entries(filters) as [keyof EventReportFilters, EventReportFilters[keyof EventReportFilters]][]).forEach(([key, value]) => {
    if (value != null && value !== "") params.set(key, String(value));
  });
  return params.toString();
}
export function reportScopeKey(filters: EventReportFilters, eventId?: string): string {
  const params = new URLSearchParams();
  for (const key of ["from", "to", "q", "categoryId", "organizerId", "status"] as const) {
    const value = filters[key];
    if (value) params.set(key, value);
  }
  if (eventId) params.set("eventId", eventId);
  return params.toString();
}
export function summarizeTimeline(points: ReportTimelinePoint[], metric: "revenue" | "orders" | "tickets", grouping: "day" | "week"): Array<{ date: string; value: number }> {
  if (grouping === "day") return points.map(point => ({ date: point.date, value: point[metric] }));
  const weeks = new Map<string, number>();
  points.forEach(point => {
    const [year, month, day] = point.date.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
    const key = date.toISOString().slice(0, 10);
    weeks.set(key, (weeks.get(key) ?? 0) + point[metric]);
  });
  return [...weeks].sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({ date, value }));
}
export function percentageChange(current: number, previous: number): number | null {
  return previous === 0 ? null : ((current - previous) / Math.abs(previous)) * 100;
}
export function money(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
}
export function number(value: number, locale: string): string { return new Intl.NumberFormat(locale).format(value); }
export function safeCsvCell(value: unknown): string {
  let text = String(value ?? "");
  let first = 0;
  while (first < text.length && (text.charCodeAt(first) <= 0x20 || /\s/u.test(text[first]))) first += 1;
  if (typeof value === "string" && /[-=+@]/.test(text[first] ?? "")) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
export const REPORT_COLUMNS: Array<{ key: keyof EventReportRow; label: string }> = [
  { key: "eventId", label: "Event ID" }, { key: "title", label: "Event" }, { key: "organizer", label: "Organizer" },
  { key: "category", label: "Category" }, { key: "status", label: "Status" }, { key: "orders", label: "Paid orders" },
  { key: "tickets", label: "Tickets sold" }, { key: "revenue", label: "Ticket revenue (VND)" },
];
export function buildExportMetadata(report: Pick<AdminEventReport, "from" | "to" | "timezone" | "completeness" | "warnings" | "generatedAt">, filters: EventReportFilters): unknown[][] {
  return [["Period", `${report.from} – ${report.to}`], ["Timezone", report.timezone], ["Generated at", report.generatedAt], ["Data completeness", report.completeness], ["Warnings", report.warnings.join("; ")], ["Revenue definition", "Gross original ticket payments before refunds; excludes platform fees and resale transactions"],
    ["Event scope", "APPROVED, LIVE, COMPLETED"],
    ["Search", filters.q ?? ""], ["Category ID", filters.categoryId ?? ""], ["Organizer ID", filters.organizerId ?? ""], ["Status", filters.status ?? ""], ["Sort", filters.sort], []];
}
export function formatHcmInstant(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(value));
}
export function reportRequestError(error: unknown, exporting = false): string {
  if (axios.isAxiosError(error) && error.response?.status === 422) {
    const data: unknown = error.response.data;
    if (typeof data === "string" && data.trim()) return data;
    if (data && typeof data === "object") {
      const payload = data as Record<string, unknown>;
      for (const key of ["message", "detail"]) if (typeof payload[key] === "string") return payload[key] as string;
    }
    return exporting ? "Báo cáo vượt quá giới hạn 10.000 sự kiện. Vui lòng thu hẹp bộ lọc trước khi xuất." : "Có quá nhiều đơn thanh toán trong kỳ để tổng hợp. Vui lòng thu hẹp khoảng thời gian.";
  }
  if (axios.isAxiosError(error) && error.response?.data && typeof error.response.data === "object") {
    const payload = error.response.data as Record<string, unknown>;
    for (const key of ["message", "detail"]) if (typeof payload[key] === "string") return payload[key] as string;
  }
  if (error instanceof Error && /10000 row limit|10,000 events/i.test(error.message)) return "Báo cáo vượt quá giới hạn 10.000 sự kiện. Vui lòng thu hẹp bộ lọc trước khi xuất.";
  return "Không thể tải báo cáo sự kiện. Vui lòng thử lại.";
}
