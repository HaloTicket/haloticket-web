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
export const REPORT_COLUMNS_VI = [
  { key: "index", label: "STT" },
  { key: "eventId", label: "Mã sự kiện" },
  { key: "title", label: "Tên sự kiện" },
  { key: "organizer", label: "Nhà tổ chức" },
  { key: "category", label: "Thể loại" },
  { key: "status", label: "Trạng thái" },
  { key: "orders", label: "Đơn đã thanh toán" },
  { key: "tickets", label: "Vé đã bán" },
  { key: "revenue", label: "Doanh thu vé (VNĐ)" },
];

export function buildVietnameseReportExport(
  report: Pick<AdminEventReport, "from" | "to" | "summary" | "generatedAt">,
  filters: EventReportFilters,
  rows: EventReportRow[],
  filterNames?: {
    categoryName?: string;
    organizerName?: string;
  }
): unknown[][] {
  const sortLabels: Record<string, string> = {
    revenue: "Doanh thu",
    orders: "Đơn hàng",
    tickets: "Vé đã bán",
    title: "Tên sự kiện",
  };

  const statusMap: Record<string, string> = {
    APPROVED: "Đã duyệt",
    LIVE: "Đang diễn ra",
    COMPLETED: "Đã kết thúc",
    CANCELLED: "Đã hủy",
    REJECTED: "Từ chối",
    DRAFT: "Bản nháp",
  };

  const activeFilters = [
    filters.q ? `Tìm kiếm: "${filters.q}"` : "",
    filterNames?.categoryName ? `Thể loại: ${filterNames.categoryName}` : filters.categoryId ? `Mã thể loại: ${filters.categoryId}` : "Thể loại: Tất cả",
    filterNames?.organizerName ? `Nhà tổ chức: ${filterNames.organizerName}` : filters.organizerId ? `Mã nhà tổ chức: ${filters.organizerId}` : "Nhà tổ chức: Tất cả",
    filters.status ? `Trạng thái: ${statusMap[filters.status] || filters.status}` : "Trạng thái: Tất cả",
    filters.sort ? `Sắp xếp: ${sortLabels[filters.sort] || filters.sort}` : "",
  ].filter(Boolean).join(" | ");

  const metadata: unknown[][] = [
    ["BÁO CÁO THỐNG KÊ VÀ DOANH THU SỰ KIỆN - HALOTICKET"],
    ["Kỳ báo cáo:", `${report.from} đến ${report.to}`],
    ["Thời gian xuất:", new Date().toLocaleString("vi-VN")],
    ["Múi giờ:", "Asia/Ho_Chi_Minh (UTC+7)"],
    ["Bộ lọc áp dụng:", activeFilters || "Mặc định"],
    [],
    ["TỔNG QUAN SỐ LIỆU TOÀN KỲ (THEO BỘ LỌC)"],
    ["Tổng doanh thu vé (VNĐ):", report.summary?.revenue ?? 0],
    ["Tổng số đơn đã thanh toán:", report.summary?.orders ?? 0],
    ["Tổng số vé đã bán:", report.summary?.tickets ?? 0],
    ["Số sự kiện phát sinh bán vé:", report.summary?.eventsWithSales ?? 0],
    [],
    ["STT", "Mã sự kiện", "Tên sự kiện", "Nhà tổ chức", "Thể loại", "Trạng thái", "Đơn đã thanh toán", "Vé đã bán", "Doanh thu vé (VNĐ)"],
  ];

  let totalOrders = 0;
  let totalTickets = 0;
  let totalRevenue = 0;

  const dataRows: unknown[][] = rows.map((row, idx) => {
    const orders = Number(row.orders) || 0;
    const tickets = Number(row.tickets) || 0;
    const revenue = Number(row.revenue) || 0;
    totalOrders += orders;
    totalTickets += tickets;
    totalRevenue += revenue;

    return [
      idx + 1,
      row.eventId,
      row.title || "Sự kiện không có tên",
      row.organizer || "N/A",
      row.category || "N/A",
      statusMap[row.status] || row.status,
      orders,
      tickets,
      revenue,
    ];
  });

  const totalRow: unknown[][] = [
    ["", "TỔNG CỘNG", "", "", "", "", totalOrders, totalTickets, totalRevenue],
  ];

  return [...metadata, ...dataRows, ...totalRow];
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