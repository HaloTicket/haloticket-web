import type { AdminEventReport, EventReportFilters, EventReportRow, ReportTimelinePoint } from "@/services/adminReportsApi";
import axios from "axios";

/**
 * Ngày hôm nay theo múi giờ Asia/Ho_Chi_Minh, dạng `yyyy-MM-dd`.
 *
 * @param now - Thời điểm tính, mặc định là hiện tại.
 */
export function hcmToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  /** Lấy giá trị của một thành phần ngày theo tên. */
  const value = (name: string) => parts.find(part => part.type === name)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}
/**
 * Dịch một ngày `yyyy-MM-dd` đi một số ngày (âm là lùi).
 *
 * @param date - Ngày gốc.
 * @param days - Số ngày dịch.
 */
export function shiftDate(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day + days));
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}-${String(value.getUTCDate()).padStart(2, "0")}`;
}
/** Kiểm tra khoảng báo cáo hợp lệ: cả hai ngày đúng định dạng và có thật, `from` không sau `to`, và dưới 366 ngày. */
export function isValidReportPeriod(from: string, to: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to) return false;
  /** Phân tích chuỗi ngày thành đối tượng ngày (UTC), hoặc `null` nếu không phải ngày có thật. */
  const parse = (value: string) => { const [year, month, day] = value.split("-").map(Number); const date = new Date(Date.UTC(year, month - 1, day)); return date.toISOString().slice(0, 10) === value ? date : null; };
  const start = parse(from); const end = parse(to);
  return Boolean(start && end && (end.getTime() - start.getTime()) / 86_400_000 < 366);
}
/**
 * Đọc bộ lọc báo cáo từ query của URL; mặc định là 30 ngày gần nhất, sắp xếp theo doanh thu, trang 1, kích thước trang 10.
 *
 * @param search - Chuỗi query.
 * @param today - Ngày hôm nay, mặc định theo múi giờ Hồ Chí Minh.
 */
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
/** Tạo chuỗi query từ bộ lọc, bỏ các giá trị rỗng. */
export function reportQuery(filters: EventReportFilters): string {
  const params = new URLSearchParams();
  (Object.entries(filters) as [keyof EventReportFilters, EventReportFilters[keyof EventReportFilters]][]).forEach(([key, value]) => {
    if (value != null && value !== "") params.set(key, String(value));
  });
  return params.toString();
}
/**
 * Khóa đại diện phạm vi dữ liệu của báo cáo (kỳ, từ khóa, thể loại, nhà tổ chức, trạng thái, sự kiện), không gồm phân trang và sắp xếp.
 *
 * @param filters - Bộ lọc.
 * @param eventId - Mã sự kiện nếu là báo cáo của một sự kiện.
 */
export function reportScopeKey(filters: EventReportFilters, eventId?: string): string {
  const params = new URLSearchParams();
  for (const key of ["from", "to", "q", "categoryId", "organizerId", "status"] as const) {
    const value = filters[key];
    if (value) params.set(key, value);
  }
  if (eventId) params.set("eventId", eventId);
  return params.toString();
}
/**
 * Tổng hợp chuỗi thời gian theo ngày hoặc theo tuần (tuần bắt đầu từ thứ hai).
 *
 * @param points - Các điểm theo ngày.
 * @param metric - Chỉ số cần lấy.
 * @param grouping - Gom theo ngày hay tuần.
 * @returns Danh sách ngày (đầu tuần nếu gom tuần) và giá trị.
 */
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
/** Phần trăm thay đổi so với kỳ trước; `null` khi kỳ trước bằng 0 vì không có cơ sở so sánh. */
export function percentageChange(current: number, previous: number): number | null {
  return previous === 0 ? null : ((current - previous) / Math.abs(previous)) * 100;
}
/** Định dạng số tiền VND, không có phần thập phân, theo ngôn ngữ cho trước. */
export function money(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
}
/** Định dạng một số theo ngôn ngữ cho trước. */
export function number(value: number, locale: string): string { return new Intl.NumberFormat(locale).format(value); }
/**
 * Tạo một ô CSV an toàn: đặt trong dấu nháy kép và chặn công thức (ô chuỗi bắt đầu bằng `-`, `=`, `+`, `@` sau khoảng trắng đầu được thêm dấu nháy đơn).
 *
 * @param value - Giá trị ô.
 */
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
/**
 * Tạo các dòng thông tin đầu tệp xuất báo cáo (bản tiếng Anh): kỳ, múi giờ, thời điểm tạo, độ đầy đủ dữ liệu, cảnh báo và bộ lọc áp dụng.
 *
 * @param report - Báo cáo.
 * @param filters - Bộ lọc đã dùng.
 */
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

/**
 * Tạo bảng dữ liệu xuất báo cáo bằng tiếng Việt: phần thông tin đầu (kỳ, múi giờ, bộ lọc, tổng quan), từng dòng sự kiện và dòng tổng cộng.
 *
 * @param report - Báo cáo (kỳ, tổng quan, thời điểm tạo).
 * @param filters - Bộ lọc đã dùng.
 * @param rows - Các dòng sự kiện.
 * @param filterNames - Tên thể loại và nhà tổ chức để hiển thị thay cho mã.
 * @returns Mảng các dòng ô để ghi ra tệp.
 */
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

/** Định dạng một thời điểm theo múi giờ Asia/Ho_Chi_Minh, kiểu ngắn. */
export function formatHcmInstant(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(value));
}
/**
 * Chọn thông báo lỗi tiếng Việt cho yêu cầu báo cáo thất bại: ưu tiên thông điệp của server (HTTP 422 hoặc có `message`/`detail`), nếu không thì dùng thông báo chung.
 *
 * @param error - Lỗi bắt được.
 * @param exporting - `true` nếu đang xuất báo cáo (dùng thông báo về giới hạn 10.000 sự kiện).
 */
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