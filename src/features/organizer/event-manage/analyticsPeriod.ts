import type { AnalyticsDailyStat, AnalyticsSource, EventAnalyticsQuery } from "@/types/eventAnalytics";

export const MAX_CUSTOM_DAYS = 366;

export type PeriodChoice = "24h" | "7d" | "30d" | "custom";

const DAY_MS = 24 * 60 * 60 * 1000;

const isDate = (value: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));

/** Why a custom period cannot be sent (a message key the screen translates), or null when it can. */
export function customPeriodProblem(from: string, to: string): string | null {
  if (!from || !to) return "Chọn cả ngày bắt đầu và ngày kết thúc";
  if (!isDate(from) || !isDate(to)) return "Ngày không hợp lệ";
  if (to < from) return "Ngày kết thúc phải sau ngày bắt đầu";
  const days = Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS) + 1;
  if (days > MAX_CUSTOM_DAYS) return "Khoảng thời gian tối đa là 366 ngày";
  return null;
}

/** The query the choice stands for; a custom choice that is not valid yet falls back to 30 days. */
export function queryFor(choice: PeriodChoice, from: string, to: string, compare: boolean): EventAnalyticsQuery {
  if (choice === "custom" && customPeriodProblem(from, to) === null) return { from, to, compare };
  return { timeRange: choice === "custom" ? "30d" : choice, compare };
}

/** Day of YYYY-MM-DD shown as DD/MM. */
export function shortDay(date: string): string {
  const [, month, day] = date.split("-");
  return month && day ? `${day}/${month}` : date;
}

/** "+12,5%" / "-3%" / "0%"; null when there is no figure to compare with. */
export function formatChange(change: number | null | undefined): string | null {
  if (change === null || change === undefined || !Number.isFinite(change)) return null;
  const text = String(Math.abs(change)).replace(".", ",");
  if (change > 0) return `+${text}%`;
  if (change < 0) return `-${text}%`;
  return "0%";
}

export function changeDirection(change: number | null | undefined): "up" | "down" | "flat" | "none" {
  if (change === null || change === undefined || !Number.isFinite(change)) return "none";
  return change > 0 ? "up" : change < 0 ? "down" : "flat";
}

/** A period in which nothing was sold has nothing to draw. */
export function hasSales(days: AnalyticsDailyStat[] | undefined): boolean {
  return (days ?? []).some((day) => day.revenue > 0 || day.ticketsSold > 0);
}

const SOURCE_LABELS: Record<AnalyticsSource, string> = {
  booking: "đơn hàng",
  tickets: "loại vé",
  views: "lượt xem",
};

/** Names of the sources that did not answer, as the screen words them (translated by the caller). */
export function unavailableLabels(sources: string[] | undefined): string[] {
  return (sources ?? []).map((source) => SOURCE_LABELS[source as AnalyticsSource] ?? source);
}

/** Today in the platform zone as YYYY-MM-DD (the zone the backend counts days in, whatever the browser's zone is). */
export function todayInVietnam(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(now);
}

export function addDays(date: string, days: number): string {
  const moved = new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS);
  return moved.toISOString().slice(0, 10);
}
