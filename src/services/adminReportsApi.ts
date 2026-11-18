import axiosClient from "@/services/axiosClient";

/** Tiêu chí sắp xếp báo cáo sự kiện: doanh thu, số đơn, số vé hoặc tên sự kiện. */
export type ReportSort = "revenue" | "orders" | "tickets" | "title";
/** Bộ lọc báo cáo sự kiện: khoảng thời gian, từ khóa, danh mục, nhà tổ chức, trạng thái, sắp xếp và phân trang. */
export interface EventReportFilters {
  from: string; to: string; q?: string; categoryId?: string; organizerId?: string;
  status?: string; sort: ReportSort; page: number; size: number; eventId?: string;
}
/** Số liệu tổng hợp của một kỳ: doanh thu, số đơn, số vé và số sự kiện có bán được vé. */
export interface ReportSummary { revenue: number; orders: number; tickets: number; eventsWithSales: number }
/** Một điểm trên biểu đồ theo thời gian (doanh thu, đơn, vé trong một ngày). */
export interface ReportTimelinePoint { date: string; revenue: number; orders: number; tickets: number }
/** Một dòng báo cáo cho từng sự kiện kèm doanh thu, số đơn và số vé. */
export interface EventReportRow {
  eventId: string; title: string; organizer: string; category: string; status: string;
  revenue: number; orders: number; tickets: number;
}
/** Một lựa chọn trong bộ lọc (mã và tên hiển thị). */
export interface ReportOption { id: string; name: string }
/** Kết quả báo cáo sự kiện của quản trị: tổng hợp kỳ này và kỳ trước, biểu đồ theo ngày, các dòng đã phân trang, cảnh báo và các lựa chọn bộ lọc. */
export interface AdminEventReport {
  from: string; to: string; timezone: "Asia/Ho_Chi_Minh"; generatedAt: string;
  completeness: "COMPLETE" | "PARTIAL"; warnings: string[];
  summary: ReportSummary; previous: ReportSummary; timeline: ReportTimelinePoint[];
  rows: EventReportRow[]; page: number; size: number; totalElements: number; totalPages: number;
  options: { categories: ReportOption[]; organizers: ReportOption[]; statuses: string[] };
}

const endpoint = "/events/admin/reports";
/** Lấy một trang báo cáo sự kiện theo bộ lọc. */
export async function getAdminEventReports(filters: EventReportFilters, signal?: AbortSignal): Promise<AdminEventReport> {
  const response = await axiosClient.get<AdminEventReport>(endpoint, { params: filters, signal });
  return response as unknown as AdminEventReport;
}

/** Lấy toàn bộ các dòng báo cáo để xuất file: bỏ `page` và `size` khỏi bộ lọc rồi gọi endpoint export. */
export async function getAllAdminEventReportRows(filters: EventReportFilters, signal?: AbortSignal): Promise<AdminEventReport> {
  const scope: Partial<EventReportFilters> = { ...filters };
  delete scope.page;
  delete scope.size;
  const response = await axiosClient.get<AdminEventReport>(`${endpoint}/export`, {
    params: scope, signal,
  });
  return response as unknown as AdminEventReport;
}
