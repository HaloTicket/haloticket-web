import type { AnalyticsDailyStat, AnalyticsSource, EventAnalyticsQuery } from "@/types/eventAnalytics";

export const MAX_CUSTOM_DAYS = 366;

/** Lựa chọn khoảng thời gian của thống kê: 24 giờ, 7 ngày, 30 ngày hoặc khoảng tự chọn. */
export type PeriodChoice = "24h" | "7d" | "30d" | "custom";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Kiểm tra chuỗi có đúng dạng {@code YYYY-MM-DD} và là ngày có thật hay không. */
const isDate = (value: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));

/** Lý do khoảng tự chọn chưa gửi được (khóa thông báo để màn hình dịch), hoặc {@code null} nếu hợp lệ. */
export function customPeriodProblem(from: string, to: string): string | null {
  if (!from || !to) return "Chọn cả ngày bắt đầu và ngày kết thúc";
  if (!isDate(from) || !isDate(to)) return "Ngày không hợp lệ";
  if (to < from) return "Ngày kết thúc phải sau ngày bắt đầu";
  const days = Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS) + 1;
  if (days > MAX_CUSTOM_DAYS) return "Khoảng thời gian tối đa là 366 ngày";
  return null;
}

/** Tham số truy vấn tương ứng với lựa chọn; khoảng tự chọn chưa hợp lệ thì tạm dùng 30 ngày. */
export function queryFor(choice: PeriodChoice, from: string, to: string, compare: boolean): EventAnalyticsQuery {
  if (choice === "custom" && customPeriodProblem(from, to) === null) return { from, to, compare };
  return { timeRange: choice === "custom" ? "30d" : choice, compare };
}

/** Đổi ngày dạng {@code YYYY-MM-DD} sang dạng ngắn {@code DD/MM} để hiển thị. */
export function shortDay(date: string): string {
  const [, month, day] = date.split("-");
  return month && day ? `${day}/${month}` : date;
}

/** Định dạng mức thay đổi như "+12,5%", "-3%", "0%"; trả {@code null} khi không có số liệu để so sánh. */
export function formatChange(change: number | null | undefined): string | null {
  if (change === null || change === undefined || !Number.isFinite(change)) return null;
  const text = String(Math.abs(change)).replace(".", ",");
  if (change > 0) return `+${text}%`;
  if (change < 0) return `-${text}%`;
  return "0%";
}

/** Cho biết xu hướng so với kỳ trước: tăng, giảm, đi ngang hoặc không có số liệu ({@code none}). */
export function changeDirection(change: number | null | undefined): "up" | "down" | "flat" | "none" {
  if (change === null || change === undefined || !Number.isFinite(change)) return "none";
  return change > 0 ? "up" : change < 0 ? "down" : "flat";
}

/** Kỳ không bán được gì thì không có dữ liệu để vẽ biểu đồ. */
export function hasSales(days: AnalyticsDailyStat[] | undefined): boolean {
  return (days ?? []).some((day) => day.revenue > 0 || day.ticketsSold > 0);
}

const SOURCE_LABELS: Record<AnalyticsSource, string> = {
  booking: "đơn hàng",
  tickets: "loại vé",
  views: "lượt xem",
};

/** Tên các nguồn dữ liệu không phản hồi, viết theo cách màn hình gọi (người gọi sẽ dịch tiếp). */
export function unavailableLabels(sources: string[] | undefined): string[] {
  return (sources ?? []).map((source) => SOURCE_LABELS[source as AnalyticsSource] ?? source);
}

/** Ngày hôm nay theo múi giờ của nền tảng, dạng {@code YYYY-MM-DD} (múi giờ backend dùng để tính ngày, không phụ thuộc múi giờ trình duyệt). */
export function todayInVietnam(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(now);
}

/** Cộng (hoặc trừ, nếu số âm) một số ngày vào ngày {@code YYYY-MM-DD} và trả về ngày mới cùng dạng. */
export function addDays(date: string, days: number): string {
  const moved = new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS);
  return moved.toISOString().slice(0, 10);
}
