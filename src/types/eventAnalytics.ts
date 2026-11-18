// Phản hồi của GET /events/{id}/analytics. Tiền là số nguyên VND. pageViews, uniqueUsers, buyers, periodRevenue, periodTicketsSold và
// conversionRate tính theo khoảng thời gian được yêu cầu; currentRevenue và currentTicketsSold tính cho toàn bộ vòng đời sự kiện.

/** Khoảng thời gian định sẵn của phân tích: 24 giờ, 7 ngày hoặc 30 ngày. */
export type AnalyticsRange = "24h" | "7d" | "30d";

/** Tham số truy vấn phân tích sự kiện: khoảng định sẵn hoặc khoảng ngày tùy chọn, có thể so sánh với kỳ trước. */
export interface EventAnalyticsQuery {
  timeRange?: AnalyticsRange;
  /** các ngày nguyên, dạng YYYY-MM-DD, gồm cả hai đầu; thay cho timeRange và phải truyền cùng nhau */
  from?: string;
  to?: string;
  compare?: boolean;
}

/** Doanh thu và số vé bán được trong một ngày. */
export interface AnalyticsDailyStat {
  date: string;
  revenue: number;
  ticketsSold: number;
}

/** các trường change* là phần trăm so với kỳ trước; `null` khi giá trị kỳ trước bằng 0 hoặc nguồn dữ liệu không khả dụng */
export interface AnalyticsPreviousPeriod {
  from: string;
  to: string;
  pageViews: number;
  uniqueUsers: number;
  buyers: number;
  revenue: number;
  ticketsSold: number;
  pageViewsChange: number | null;
  buyersChange: number | null;
  revenueChange: number | null;
  ticketsSoldChange: number | null;
}

/** Nguồn dữ liệu của phân tích: đặt vé, vé hoặc lượt xem. */
export type AnalyticsSource = "booking" | "tickets" | "views";

/** Số liệu phân tích của sự kiện: lượt xem, người mua, doanh thu, số vé bán, kỳ trước và nguồn dữ liệu không khả dụng. */
export interface EventAnalytics {
  pageViews?: number;
  uniqueUsers?: number;
  buyers?: number;
  conversionRate?: number;
  currentRevenue?: number;
  totalRevenueTarget?: number;
  currentTicketsSold?: number;
  totalTicketsTarget?: number;
  periodFrom?: string;
  periodTo?: string;
  periodRevenue?: number;
  periodTicketsSold?: number;
  previous?: AnalyticsPreviousPeriod | null;
  dailyStats?: AnalyticsDailyStat[];
  partial?: boolean;
  unavailableSources?: AnalyticsSource[];
}
