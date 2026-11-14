// Answer of GET /events/{id}/analytics. Money is whole VND. pageViews, uniqueUsers, buyers, periodRevenue, periodTicketsSold and
// conversionRate cover the requested period; currentRevenue and currentTicketsSold are for the whole life of the event.

export type AnalyticsRange = "24h" | "7d" | "30d";

export interface EventAnalyticsQuery {
  timeRange?: AnalyticsRange;
  /** whole days, YYYY-MM-DD, both included; they take the place of timeRange and must be given together */
  from?: string;
  to?: string;
  compare?: boolean;
}

export interface AnalyticsDailyStat {
  date: string;
  revenue: number;
  ticketsSold: number;
}

/** change* are percentages against the previous period; null when the previous value was 0 or its source was unavailable */
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

export type AnalyticsSource = "booking" | "tickets" | "views";

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
