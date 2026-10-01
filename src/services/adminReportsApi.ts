import axiosClient from "@/services/axiosClient";

export type ReportSort = "revenue" | "orders" | "tickets" | "title";
export interface EventReportFilters {
  from: string; to: string; q?: string; categoryId?: string; organizerId?: string;
  status?: string; sort: ReportSort; page: number; size: number; eventId?: string;
}
export interface ReportSummary { revenue: number; orders: number; tickets: number; eventsWithSales: number }
export interface ReportTimelinePoint { date: string; revenue: number; orders: number; tickets: number }
export interface EventReportRow {
  eventId: string; title: string; organizer: string; category: string; status: string;
  revenue: number; orders: number; tickets: number;
}
export interface ReportOption { id: string; name: string }
export interface AdminEventReport {
  from: string; to: string; timezone: "Asia/Ho_Chi_Minh"; generatedAt: string;
  completeness: "COMPLETE" | "PARTIAL"; warnings: string[];
  summary: ReportSummary; previous: ReportSummary; timeline: ReportTimelinePoint[];
  rows: EventReportRow[]; page: number; size: number; totalElements: number; totalPages: number;
  options: { categories: ReportOption[]; organizers: ReportOption[]; statuses: string[] };
}

const endpoint = "/events/admin/reports";
export async function getAdminEventReports(filters: EventReportFilters, signal?: AbortSignal): Promise<AdminEventReport> {
  const response = await axiosClient.get<AdminEventReport>(endpoint, { params: filters, signal });
  return response as unknown as AdminEventReport;
}

export async function getAllAdminEventReportRows(filters: EventReportFilters, signal?: AbortSignal): Promise<AdminEventReport> {
  const scope: Partial<EventReportFilters> = { ...filters };
  delete scope.page;
  delete scope.size;
  const response = await axiosClient.get<AdminEventReport>(`${endpoint}/export`, {
    params: scope, signal,
  });
  return response as unknown as AdminEventReport;
}
