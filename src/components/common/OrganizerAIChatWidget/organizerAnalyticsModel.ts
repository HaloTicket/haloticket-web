import type {
  AiSystemAction,
  OrganizerChatCard,
  OrganizerChatMetric,
  OrganizerChatPeriod,
  OrganizerChatWarning,
} from "@/types/ai";
import { pickChartColumns } from "@/utils/chartColumns";
import { formatCurrency } from "@/utils/formatters";
import type { AnalyticsExportColumn } from "./organizerAnalyticsExport";

export type MetricUnit = OrganizerChatMetric["unit"];
export type ChartTabMode = "bar" | "donut" | "line" | "table";
export type ProgressThresholdTone = "high" | "medium" | "low";

export interface ScopedActionLink {
  href: string;
  labelKey: string;
  defaultVi: string;
  defaultEn: string;
}

export interface PeriodDeltaInfo {
  pct: number;
  direction: "up" | "down" | "flat";
  formattedPct: string;
  priorValue: number;
  priorPeriodStr: string;
}

export interface KpiCardItem {
  key: string;
  unit: MetricUnit;
  current: OrganizerChatMetric;
  prior: OrganizerChatMetric | null;
  currentPeriodStr: string;
  delta: PeriodDeltaInfo | null;
}

export interface ComparisonCell {
  key: string;
  unit: MetricUnit;
  value: number | null;
  completeness: OrganizerChatMetric["completeness"];
  formatted: string;
  progress: {
    clampedValue: number;
    tone: ProgressThresholdTone;
  } | null;
}

export interface ComparisonRow {
  id: string;
  kind?: OrganizerChatCard["kind"];
  label: string;
  subtitle?: string;
  manageLink: ScopedActionLink | null;
  cells: Record<string, ComparisonCell>;
}

export interface ComparisonColumn {
  key: string;
  label: string;
  unit: MetricUnit;
  isNumeric: boolean;
}

export interface ComparisonMatrixSpec {
  entityHeaderKey: string;
  entityHeaderVi: string;
  entityHeaderEn: string;
  columns: ComparisonColumn[];
  rows: ComparisonRow[];
}

export interface InlineChartSeries {
  key: string;
  label: string;
  color: string;
}

export interface InlineChartPoint {
  label: string;
  shortLabel: string;
  timestampMs?: number;
  manageLink?: ScopedActionLink | null;
  [seriesKey: string]: unknown;
}

export interface InlineChartSpec {
  source: "cards" | "periods" | "data_table";
  consumedActionIndex?: number;
  title: string;
  unit: MetricUnit;
  series: InlineChartSeries[];
  points: InlineChartPoint[];
  enabledTabs: Record<ChartTabMode, boolean>;
  defaultTab: ChartTabMode;
  isTemporal: boolean;
  maxLabelLength: number;
  tableMatrix: ComparisonMatrixSpec;
  exportColumns: AnalyticsExportColumn[];
  exportRows: Record<string, unknown>[];
}

export const CANONICAL_KPI_KEYS = [
  "ticket_sales_revenue",
  "tickets_sold",
  "paid_orders",
  "check_ins",
] as const;

export const KNOWN_METRIC_UNITS: Record<string, MetricUnit> = {
  ticket_sales_revenue: "VND",
  listed_price: "VND",
  tickets_sold: "count",
  check_ins: "count",
  paid_orders: "count",
  orders_pending: "count",
  orders_paid: "count",
  orders_confirmed: "count",
  orders_cancelled: "count",
  orders_expired: "count",
  orders_refunded: "count",
  eligible_tickets: "count",
  checked_in_tickets: "count",
  available_tickets: "count",
  ticket_capacity: "count",
  paid_orders_missing_tickets: "count",
  missing_tickets: "count",
  check_in_rate: "percent",
  occupancy_rate: "percent",
};

const QUESTION_METRIC_PATTERNS: [RegExp, string[]][] = [
  [/doanh thu|revenue|gia tri ve|gross|tien ve/, ["ticket_sales_revenue", "listed_price"]],
  [/lap day|occupancy|ghe/, ["occupancy_rate", "tickets_sold"]],
  [/check.?in|tham gia|attendance/, ["check_ins", "checked_in_tickets", "check_in_rate"]],
  [/ton ve|con lai|con bao nhieu|remaining|available|stock/, ["available_tickets", "ticket_capacity"]],
  [/don hang|paid orders|booking/, ["paid_orders", "orders_paid"]],
  [/ban chay|ban cham|ban tot|so ve|ve da ban|ticket sales|tickets sold|sell/, ["tickets_sold"]],
];

export function normalizeVietnameseQuery(input: string): string {
  return input
    .toLowerCase()
    .replace(/đ/g, "d")
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

/** Định dạng ngày giờ theo múi giờ Việt Nam (Asia/Ho_Chi_Minh). */
export function formatVietnamDateTime(isoString?: string | null, isEn = false): string {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return String(isoString);
    return new Intl.DateTimeFormat(isEn ? "en-US" : "vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(d);
  } catch {
    return String(isoString);
  }
}

/** Định dạng giờ HH:mm ở chân bong bóng theo múi giờ Việt Nam; trả chuỗi rỗng nếu không hợp lệ. */
export function formatMessageTime(timestamp?: Date | string | number | null): string {
  if (timestamp === null || timestamp === undefined || timestamp === "") return "";
  try {
    const d = timestamp instanceof Date ? timestamp : new Date(timestamp);
    if (Number.isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(d);
  } catch {
    return "";
  }
}

/**
 * Kiểm tra mốc thời gian có phải đúng nửa đêm 00:00:00.000 theo giờ Việt Nam (Asia/Ho_Chi_Minh)
 * và có thành phần thời gian rõ ràng (`T...`) hay không.
 * Chỉ những mốc nửa đêm của truy vấn `[from, to)` mới là biên độc quyền (exclusive day boundary).
 */
export function isExclusiveVietnamMidnight(isoStr?: string | null): boolean {
  if (!isoStr || typeof isoStr !== "string" || !isoStr.includes("T")) return false;
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime()) || d.getUTCMilliseconds() !== 0) return false;
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Ho_Chi_Minh",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).formatToParts(d);
    const hour = parts.find((p) => p.type === "hour")?.value;
    const minute = parts.find((p) => p.type === "minute")?.value;
    const second = parts.find((p) => p.type === "second")?.value;
    return (hour === "00" || hour === "24") && minute === "00" && second === "00";
  } catch {
    return false;
  }
}

/**
 * Định dạng khoảng thời gian hiển thị theo múi giờ Việt Nam.
 * Nếu `to` là mốc nửa đêm 00:00:00+07:00 của khoảng nửa mở `[from, to)` với `to > from`,
 * lùi 1ms để hiển thị đúng ngày kết thúc bao gồm (inclusive). Không lùi nếu `to` là mốc giờ trong ngày hoặc chuỗi chỉ có ngày.
 */
export function formatVietnamPeriod(
  fromStr?: string | null,
  toStr?: string | null,
  isEn = false,
): string {
  if (!fromStr || !toStr) return "";
  const fromD = new Date(fromStr);
  const toD = new Date(toStr);
  if (Number.isNaN(fromD.getTime()) || Number.isNaN(toD.getTime())) {
    return `${fromStr} - ${toStr}`;
  }
  const shouldShiftInclusive =
    toD.getTime() > fromD.getTime() && isExclusiveVietnamMidnight(toStr);
  const displayTo = shouldShiftInclusive ? new Date(toD.getTime() - 1) : toD;

  const options: Intl.DateTimeFormatOptions = {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  };
  const locale = isEn ? "en-US" : "vi-VN";
  const fromFmt = new Intl.DateTimeFormat(locale, options).format(fromD);
  const toFmt = new Intl.DateTimeFormat(locale, options).format(displayTo);

  if (fromFmt === toFmt && shouldShiftInclusive && isExclusiveVietnamMidnight(fromStr)) {
    return fromFmt;
  }
  return `${fromFmt} - ${toFmt}`;
}

/** Định dạng một con số hữu hạn theo đơn vị (`VND`, `percent`, `count`) và ngôn ngữ. */
export function formatRawUnitValue(value: number, unit: MetricUnit, isEn = false): string {
  const locale = isEn ? "en-US" : "vi-VN";
  if (unit === "VND") return formatCurrency(value);
  if (unit === "percent") {
    return `${value.toLocaleString(locale, { maximumFractionDigits: 1 })}%`;
  }
  return value.toLocaleString(locale);
}

/** Định dạng giá trị metric kèm tiền tố `≥ ` khi `completeness === 'partial'` và `—` khi thiếu dữ liệu. */
export function formatMetricValue(metric?: OrganizerChatMetric | null, isEn = false): string {
  if (
    !metric ||
    metric.value === null ||
    metric.value === undefined ||
    !Number.isFinite(metric.value) ||
    metric.completeness === "missing"
  ) {
    return "—";
  }
  const formatted = formatRawUnitValue(metric.value, metric.unit, isEn);
  return metric.completeness === "partial" ? `≥ ${formatted}` : formatted;
}

/** Xác định ngưỡng màu thanh tiến độ cho chỉ số phần trăm: >=80% xanh lá, 30-79% xanh dương, <30% cam cảnh báo. */
export function getPercentProgressMeta(value: number): {
  clampedValue: number;
  tone: ProgressThresholdTone;
} {
  const clampedValue = Math.min(100, Math.max(0, value));
  const tone: ProgressThresholdTone =
    value >= 80 ? "high" : value >= 30 ? "medium" : "low";
  return { clampedValue, tone };
}

function parsePeriodMs(period?: OrganizerChatPeriod | null): { fromMs: number; toMs: number } | null {
  if (!period?.from || !period?.to) return null;
  const fromMs = new Date(period.from).getTime();
  const toMs = new Date(period.to).getTime();
  if (Number.isNaN(fromMs) || Number.isNaN(toMs) || toMs < fromMs) return null;
  return { fromMs, toMs };
}

/**
 * Tính chênh lệch kỳ thật sự (true period delta).
 * Chỉ tính khi trùng `key` + `unit`, kỳ trước đứng trước và không chồng lấn với kỳ hiện tại,
 * cả hai đều `completeness === 'complete'`, số hữu hạn và kỳ trước > 0.
 */
export function computeTruePeriodDelta(
  current: OrganizerChatMetric,
  prior: OrganizerChatMetric | null | undefined,
  isEn = false,
): PeriodDeltaInfo | null {
  if (!prior) return null;
  if (current.key !== prior.key || current.unit !== prior.unit) return null;
  if (current.completeness !== "complete" || prior.completeness !== "complete") return null;
  if (
    typeof current.value !== "number" ||
    !Number.isFinite(current.value) ||
    typeof prior.value !== "number" ||
    !Number.isFinite(prior.value) ||
    prior.value <= 0
  ) {
    return null;
  }
  const curRange = parsePeriodMs(current.period);
  const priorRange = parsePeriodMs(prior.period);
  if (!curRange || !priorRange) return null;
  if (!(priorRange.fromMs < curRange.fromMs && priorRange.toMs <= curRange.fromMs)) {
    return null;
  }

  const rawPct = ((current.value - prior.value) / prior.value) * 100;
  const pct = Math.round(rawPct * 10) / 10;
  const direction: "up" | "down" | "flat" = pct > 0 ? "up" : pct < 0 ? "down" : "flat";
  const absText = Math.abs(pct).toLocaleString(isEn ? "en-US" : "vi-VN", {
    maximumFractionDigits: 1,
  });
  const formattedPct =
    direction === "up" ? `+${absText}%` : direction === "down" ? `-${absText}%` : "0%";

  return {
    pct,
    direction,
    formattedPct,
    priorValue: prior.value,
    priorPeriodStr: formatVietnamPeriod(prior.period?.from, prior.period?.to, isEn),
  };
}

/**
 * Dựng danh sách thẻ KPI 2x2 mở sẵn từ `totals` (hoặc từ thẻ `event` duy nhất khi ở phạm vi 1 sự kiện).
 * Không bao giờ tự bịa số 0 cho các chỉ số vắng mặt hoặc thiếu dữ liệu.
 */
export function buildKpiCards(
  totals: OrganizerChatMetric[] | undefined,
  cards: OrganizerChatCard[] | undefined,
  isEn = false,
): KpiCardItem[] {
  let source: OrganizerChatMetric[] = [];
  if (totals && totals.length > 0) {
    source = totals;
  } else if (cards && cards.length > 0) {
    const eventCards = cards.filter((c) => c.kind === "event");
    if (eventCards.length === 1) {
      const candidateMetrics = eventCards[0].metrics.filter(
        (m) => (CANONICAL_KPI_KEYS as readonly string[]).includes(m.key) && m.period !== null,
      );
      const uniqueKeys = new Set(candidateMetrics.map((m) => m.key));
      if (uniqueKeys.size >= 2) {
        source = candidateMetrics;
      }
    }
  }
  if (source.length === 0) return [];

  const presentKeys = Array.from(new Set(source.map((m) => m.key)));
  const orderedKeys = [
    ...CANONICAL_KPI_KEYS.filter((k) => presentKeys.includes(k)),
    ...presentKeys.filter((k) => !(CANONICAL_KPI_KEYS as readonly string[]).includes(k)),
  ];

  const items: KpiCardItem[] = [];
  for (const key of orderedKeys) {
    const entries = source.filter((m) => m.key === key);
    if (entries.length === 0) continue;

    const withPeriods = entries
      .map((metric) => ({ metric, range: parsePeriodMs(metric.period) }))
      .filter((item): item is { metric: OrganizerChatMetric; range: { fromMs: number; toMs: number } } =>
        Boolean(item.range),
      )
      .sort((a, b) => b.range.fromMs - a.range.fromMs || b.range.toMs - a.range.toMs);

    const current = withPeriods[0]?.metric ?? entries[0];
    let prior: OrganizerChatMetric | null = null;

    if (withPeriods.length >= 2) {
      const curRange = withPeriods[0].range;
      const priorMatch = withPeriods
        .slice(1)
        .find(
          (candidate) =>
            candidate.metric.unit === current.unit &&
            candidate.range.fromMs < curRange.fromMs &&
            candidate.range.toMs <= curRange.fromMs,
        );
      prior = priorMatch?.metric ?? null;
    }

    items.push({
      key,
      unit: current.unit,
      current,
      prior,
      currentPeriodStr: current.period
        ? formatVietnamPeriod(current.period.from, current.period.to, isEn)
        : "",
      delta: computeTruePeriodDelta(current, prior, isEn),
    });
  }

  return items;
}

/**
 * Tạo liên kết hành động hợp lệ trong router hiện tại (`src/routes/index.tsx`) cho từng mã cảnh báo.
 */
export function resolveWarningActionLink(warning: OrganizerChatWarning): ScopedActionLink | null {
  const rawId = warning.event_id?.trim();
  if (!rawId) return null;
  const encodedId = encodeURIComponent(rawId);

  switch (warning.code) {
    case "paid_order_missing_tickets":
      return {
        href: `/organizer/events/${encodedId}/manage/orders`,
        labelKey: "ai.organizer.analytics.warningAction.orders",
        defaultVi: "Kiểm tra đơn hàng →",
        defaultEn: "Review orders →",
      };
    case "low_stock":
      return {
        href: `/organizer/events/${encodedId}/manage/showtimes`,
        labelKey: "ai.organizer.analytics.warningAction.showtimes",
        defaultVi: "Kiểm tra tồn vé →",
        defaultEn: "Check stock →",
      };
    case "slow_showtime":
      return {
        href: `/organizer/events/${encodedId}/manage/overview`,
        labelKey: "ai.organizer.analytics.warningAction.overview",
        defaultVi: "Xem thống kê →",
        defaultEn: "View analytics →",
      };
    default:
      return {
        href: `/organizer/events/${encodedId}/manage`,
        labelKey: "ai.organizer.manageEventLink",
        defaultVi: "Quản lý sự kiện →",
        defaultEn: "Manage event →",
      };
  }
}

/**
 * Tạo liên kết quản lý hợp lệ trong router hiện tại cho từng dòng thẻ (`event`, `showtime`, `ticket_type`).
 */
export function resolveCardManageLink(card: OrganizerChatCard): ScopedActionLink | null {
  const rawId = card.event_id?.trim();
  if (!rawId) return null;
  const encodedId = encodeURIComponent(rawId);

  const hasOnlyCheckinMetrics =
    card.metrics.length > 0 &&
    card.metrics.every((m) =>
      ["check_ins", "checked_in_tickets", "check_in_rate", "eligible_tickets"].includes(m.key),
    );

  if (hasOnlyCheckinMetrics) {
    return {
      href: `/organizer/events/${encodedId}/manage/checkin`,
      labelKey: "ai.organizer.analytics.manageCheckinLink",
      defaultVi: "Quản lý check-in →",
      defaultEn: "Manage check-in →",
    };
  }

  if (card.kind === "showtime" || card.kind === "ticket_type") {
    return {
      href: `/organizer/events/${encodedId}/manage/showtimes`,
      labelKey: "ai.organizer.analytics.manageShowtimesLink",
      defaultVi: "Quản lý →",
      defaultEn: "Manage →",
    };
  }

  return {
    href: `/organizer/events/${encodedId}/manage`,
    labelKey: "ai.organizer.analytics.manageShortLink",
    defaultVi: "Quản lý →",
    defaultEn: "Manage →",
  };
}

/** Lấy chỉ số chính (ưu tiên kỳ hiện tại mới nhất hoặc snapshot) cho một `key` bên trong thẻ. */
export function pickPrimaryCardMetric(
  metrics: OrganizerChatMetric[],
  key: string,
): OrganizerChatMetric | undefined {
  const matching = metrics.filter((m) => m.key === key);
  if (matching.length <= 1) return matching[0];
  const withPeriod = matching
    .map((m) => ({ m, range: parsePeriodMs(m.period) }))
    .filter((x): x is { m: OrganizerChatMetric; range: { fromMs: number; toMs: number } } => Boolean(x.range))
    .sort((a, b) => b.range.fromMs - a.range.fromMs || b.range.toMs - a.range.toMs);
  return withPeriod[0]?.m ?? matching[0];
}

export function formatCardDisplayName(card: OrganizerChatCard, includeEventPrefix = true): string {
  if (card.kind === "ticket_type") {
    const parts = includeEventPrefix
      ? [card.ticket_type_title, card.showtime_title]
      : [card.ticket_type_title];
    const filtered = parts.filter(Boolean);
    if (filtered.length > 0) return filtered.join(" · ");
  }
  if (card.kind === "showtime") {
    const parts = includeEventPrefix
      ? [card.showtime_title, card.event_title]
      : [card.showtime_title];
    const filtered = parts.filter(Boolean);
    if (filtered.length > 0) return filtered.join(" · ");
  }
  return [card.event_title, card.showtime_title, card.ticket_type_title].filter(Boolean).join(" · ");
}

/**
 * Dựng ma trận so sánh (Comparison Matrix) ghim cột đầu tiên, căn phải ô số và gắn thanh tiến độ cho `%`.
 * Giữ hiển thị đầy đủ các số liệu `partial` với nhãn `≥` để BTC nắm rõ cận dưới.
 */
export function buildCardsComparisonMatrix(
  cards: OrganizerChatCard[],
  question: string,
  isEn: boolean,
  translateMetric: (key: string) => string,
): ComparisonMatrixSpec | null {
  if (!cards || cards.length === 0) return null;

  const uniqueEventIds = new Set(cards.map((c) => c.event_id));
  const singleEvent = uniqueEventIds.size === 1;
  const normalizedQ = normalizeVietnameseQuery(question);
  const preferredKeys = QUESTION_METRIC_PATTERNS
    .filter(([pattern]) => pattern.test(normalizedQ))
    .flatMap(([, keys]) => keys);

  const allMetricKeys: string[] = [];
  const unitByKey = new Map<string, MetricUnit>();
  for (const card of cards) {
    for (const m of card.metrics) {
      if (!allMetricKeys.includes(m.key)) {
        allMetricKeys.push(m.key);
        unitByKey.set(m.key, m.unit);
      }
    }
  }

  const defaultPriority = [
    "ticket_sales_revenue",
    "tickets_sold",
    "occupancy_rate",
    "check_in_rate",
    "available_tickets",
    "paid_orders",
    "check_ins",
    "checked_in_tickets",
    "eligible_tickets",
    "listed_price",
    "ticket_capacity",
  ];

  const sortedKeys = [...allMetricKeys].sort((a, b) => {
    const prefA = preferredKeys.indexOf(a);
    const prefB = preferredKeys.indexOf(b);
    if (prefA !== -1 || prefB !== -1) {
      return (prefA === -1 ? 999 : prefA) - (prefB === -1 ? 999 : prefB);
    }
    const prioA = defaultPriority.indexOf(a);
    const prioB = defaultPriority.indexOf(b);
    return (prioA === -1 ? 999 : prioA) - (prioB === -1 ? 999 : prioB);
  });

  const selectedKeys = sortedKeys.slice(0, 6);

  const columns: ComparisonColumn[] = selectedKeys.map((key) => ({
    key,
    label: translateMetric(key),
    unit: unitByKey.get(key) ?? "count",
    isNumeric: true,
  }));

  const kinds = new Set(cards.map((c) => c.kind));
  const entityHeaderVi =
    kinds.size === 1
      ? cards[0].kind === "ticket_type"
        ? "Hạng vé"
        : cards[0].kind === "showtime"
          ? "Suất diễn"
          : "Sự kiện"
      : "Mục phân tích";
  const entityHeaderEn =
    kinds.size === 1
      ? cards[0].kind === "ticket_type"
        ? "Ticket tier"
        : cards[0].kind === "showtime"
          ? "Showtime"
          : "Event"
      : "Item";

  const rows: ComparisonRow[] = cards.map((card, idx) => {
    const cells: Record<string, ComparisonCell> = {};
    for (const col of columns) {
      const m = pickPrimaryCardMetric(card.metrics, col.key);
      const isValidNumber =
        m !== undefined &&
        typeof m.value === "number" &&
        Number.isFinite(m.value) &&
        m.completeness !== "missing";
      cells[col.key] = {
        key: col.key,
        unit: m?.unit ?? col.unit,
        value: isValidNumber ? m!.value : null,
        completeness: m?.completeness ?? "missing",
        formatted: formatMetricValue(m, isEn),
        progress:
          isValidNumber && (m!.unit === "percent" || col.unit === "percent")
            ? getPercentProgressMeta(m!.value as number)
            : null,
      };
    }

    const label =
      singleEvent && card.kind !== "event"
        ? formatCardDisplayName(card, true)
        : [card.event_title, card.showtime_title, card.ticket_type_title].filter(Boolean).join(" · ");

    return {
      id: `${card.kind}-${card.event_id}-${card.showtime_id ?? ""}-${card.ticket_type_id ?? ""}-${idx}`,
      kind: card.kind,
      label: label || card.event_id,
      subtitle: card.start_time ? formatVietnamDateTime(card.start_time, isEn) : undefined,
      manageLink: resolveCardManageLink(card),
      cells,
    };
  });

  return {
    entityHeaderKey: "ai.organizer.analytics.entityColumn",
    entityHeaderVi,
    entityHeaderEn,
    columns,
    rows,
  };
}

function truncateChartLabel(label: string, max = 18): string {
  return label.length > max ? `${label.slice(0, max - 1)}…` : label;
}

export function inferColumnUnit(colName: string): MetricUnit {
  if (colName in KNOWN_METRIC_UNITS) {
    return KNOWN_METRIC_UNITS[colName];
  }
  const lower = colName.toLowerCase();
  if (/(rate|percent|ratio|occupancy|ty_le|phan_tram)/.test(lower)) {
    return "percent";
  }
  if (/(revenue|amount|price|gross|net|doanh_thu|gia_tri|thanh_tien|so_tien|vnd)/.test(lower)) {
    return "VND";
  }
  return "count";
}

export function resolveColumnDisplayLabel(
  colName: string,
  translateMetric: (key: string) => string,
): string {
  if (colName in KNOWN_METRIC_UNITS) {
    return translateMetric(colName);
  }
  return colName;
}

function parseStrictTemporalLabel(label: string): number | null {
  const trimmed = label.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}(?:[T\s].*)?$/.test(trimmed)) {
    const ms = Date.parse(trimmed.length === 10 ? `${trimmed}T00:00:00Z` : trimmed);
    return Number.isNaN(ms) ? null : ms;
  }
  if (/^\d{4}-\d{2}$/.test(trimmed)) {
    const ms = Date.parse(`${trimmed}-01T00:00:00Z`);
    return Number.isNaN(ms) ? null : ms;
  }
  const dmy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) {
    const [, dd, mm, yyyy] = dmy;
    const iso = `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}T00:00:00Z`;
    const ms = Date.parse(iso);
    return Number.isNaN(ms) ? null : ms;
  }
  return null;
}

function formatTemporalAxisLabel(raw: string, isEn: boolean): string {
  const isoDay = raw.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDay) {
    const [, , mm, dd] = isoDay;
    return isEn ? `${mm}/${dd}` : `${dd}/${mm}`;
  }
  const isoMonth = raw.trim().match(/^(\d{4})-(\d{2})$/);
  if (isoMonth) {
    const [, yyyy, mm] = isoMonth;
    return `${mm}/${yyyy}`;
  }
  return truncateChartLabel(raw);
}

/**
 * Tìm bảng dữ liệu `DISPLAY_DATA_TABLE` đầu tiên có thể dựng biểu đồ để dùng làm biểu đồ chính mà không bị nhân đôi.
 */
export function findPrimaryChartableDataTable(
  actions?: AiSystemAction[],
): { actionIndex: number; rows: Record<string, unknown>[] } | null {
  if (!actions || actions.length === 0) return null;
  for (let i = 0; i < actions.length; i += 1) {
    const act = actions[i];
    if (act.action !== "DISPLAY_DATA_TABLE" || !Array.isArray(act.database_data)) continue;
    const validRows = act.database_data.filter(
      (r: unknown): r is Record<string, unknown> =>
        Boolean(r && typeof r === "object" && !Array.isArray(r)),
    );
    if (validRows.length >= 2 && pickChartColumns(validRows)) {
      return { actionIndex: i, rows: validRows };
    }
  }
  return null;
}

/**
 * Quyết định biểu đồ cột nên xoay ngang (`layout="vertical"` trong Recharts) hay dọc:
 * Xoay ngang khi ở khung thu gọn (`!isExpanded`) hoặc nhãn dài (`> 14` ký tự), trừ chuỗi ngày tháng theo thời gian.
 */
export function shouldUseHorizontalBars(spec: InlineChartSpec, isExpanded: boolean): boolean {
  if (spec.isTemporal) {
    return false;
  }
  if (!isExpanded) return true;
  return spec.maxLabelLength > 14;
}

/**
 * Suy diễn cấu hình biểu đồ Recharts tương tác từ:
 * 1. `DISPLAY_DATA_TABLE` (đặc biệt là chuỗi ngày ISO `YYYY-MM-DD` từ PostgreSQL với khóa metric chuẩn),
 * 2. `cards` đồng nhất theo `kind` (chỉ vẽ các điểm `completeness === 'complete'`; không bao giờ coi các sự kiện/suất diễn khác nhau là chuỗi xu hướng thời gian),
 * 3. `totals` / so sánh kỳ (Grouped Bars cho các chỉ số `complete` cùng đơn vị).
 */
export function deriveInlineChartSpec(params: {
  cards?: OrganizerChatCard[];
  totals?: OrganizerChatMetric[];
  tableRows?: Record<string, unknown>[];
  consumedActionIndex?: number;
  question?: string;
  isEn?: boolean;
  translateMetric: (key: string) => string;
  dateColumnLabel?: string;
  periodLabels?: { current: string; previous: string };
}): InlineChartSpec | null {
  const {
    cards = [],
    totals = [],
    tableRows,
    consumedActionIndex,
    question = "",
    isEn = false,
    translateMetric,
    dateColumnLabel = isEn ? "Date" : "Ngày",
    periodLabels = {
      current: isEn ? "Current period" : "Kỳ hiện tại",
      previous: isEn ? "Previous period" : "Kỳ trước",
    },
  } = params;

  const normalizedQ = normalizeVietnameseQuery(question);
  const wantsShare = /co cau|ty trong|dong gop|phan bo|share|breakdown|proportion/.test(normalizedQ);
  const wantsPeriodComparison =
    /tuan nay.*tuan truoc|tuan truoc.*tuan nay|ky truoc|so voi ky|this week.*last week|last week.*this week|previous period/.test(
      normalizedQ,
    );

  // 1. Nguồn DISPLAY_DATA_TABLE (bao gồm chuỗi ngày ISO YYYY-MM-DD thực tế từ PostgreSQL)
  if (tableRows && tableRows.length >= 2) {
    const picked = pickChartColumns(tableRows);
    if (picked) {
      const { labelCol, numCols } = picked;
      const preferredMetricKeys = QUESTION_METRIC_PATTERNS
        .filter(([pattern]) => pattern.test(normalizedQ))
        .flatMap(([, keys]) => keys);
      const valueCol =
        numCols.find((col) => preferredMetricKeys.includes(col)) ??
        numCols.find((col) => col in KNOWN_METRIC_UNITS) ??
        numCols[0];

      const unit = inferColumnUnit(valueCol);
      const valueColDisplayLabel = resolveColumnDisplayLabel(valueCol, translateMetric);

      const parsedPoints = tableRows
        .map((row, idx) => {
          const rawVal = row[valueCol];
          const numVal =
            typeof rawVal === "number"
              ? rawVal
              : typeof rawVal === "string" && rawVal.trim() !== ""
                ? Number(rawVal)
                : NaN;
          if (!Number.isFinite(numVal)) return null;
          const label = String(row[labelCol] ?? `#${idx + 1}`).trim() || `#${idx + 1}`;
          const ts = parseStrictTemporalLabel(label);
          return {
            rawRow: row,
            label,
            value: numVal,
            timestampMs: ts ?? undefined,
          };
        })
        .filter((p): p is NonNullable<typeof p> => p !== null);

      if (parsedPoints.length >= 2) {
        const allTemporal =
          parsedPoints.every((p) => typeof p.timestampMs === "number") &&
          new Set(parsedPoints.map((p) => p.timestampMs)).size === parsedPoints.length;

        const ordered = allTemporal
          ? [...parsedPoints].sort((a, b) => (a.timestampMs ?? 0) - (b.timestampMs ?? 0))
          : parsedPoints;

        const sum = ordered.reduce((acc, p) => acc + p.value, 0);
        // Ngày theo lịch không phải tỷ trọng phần trăm; Donut chỉ bật cho danh mục không âm, cộng được và tổng > 0
        const canDonut =
          !allTemporal &&
          unit !== "percent" &&
          ordered.length <= 12 &&
          ordered.every((p) => p.value >= 0) &&
          sum > 0;

        const enabledTabs: Record<ChartTabMode, boolean> = {
          bar: true,
          donut: canDonut,
          line: allTemporal,
          table: true,
        };

        const defaultTab: ChartTabMode = allTemporal
          ? "line"
          : wantsShare && canDonut
            ? "donut"
            : "bar";

        const allCols = Object.keys(tableRows[0]);
        const isDateColName =
          allTemporal || /^(date|day|sale_date|ngay|created_date|period)$/i.test(labelCol);
        const resolvedEntityHeader = isDateColName ? dateColumnLabel : labelCol;

        const exportColumns: AnalyticsExportColumn[] = allCols.map((key) => ({
          key,
          label:
            key === labelCol && isDateColName
              ? dateColumnLabel
              : resolveColumnDisplayLabel(key, translateMetric),
        }));

        const displayColumns: ComparisonColumn[] = allCols
          .filter((c) => c !== labelCol)
          .slice(0, 6)
          .map((c) => ({
            key: c,
            label: resolveColumnDisplayLabel(c, translateMetric),
            unit: inferColumnUnit(c),
            isNumeric: numCols.includes(c),
          }));

        const matrixRows: ComparisonRow[] = ordered.map((pt, idx) => {
          const cells: Record<string, ComparisonCell> = {};
          for (const col of displayColumns) {
            const rv = pt.rawRow[col.key];
            const nv =
              typeof rv === "number"
                ? rv
                : typeof rv === "string" && rv.trim() !== ""
                  ? Number(rv)
                  : NaN;
            const finite = Number.isFinite(nv);
            cells[col.key] = {
              key: col.key,
              unit: col.unit,
              value: finite ? nv : null,
              completeness: rv === null || rv === undefined ? "missing" : "complete",
              formatted: finite
                ? formatRawUnitValue(nv, col.unit, isEn)
                : rv === null || rv === undefined
                  ? "—"
                  : String(rv),
              progress:
                finite && col.unit === "percent" ? getPercentProgressMeta(nv) : null,
            };
          }
          return {
            id: `dt-row-${idx}`,
            label: pt.label,
            manageLink: null,
            cells,
          };
        });

        return {
          source: "data_table",
          consumedActionIndex,
          title: valueColDisplayLabel,
          unit,
          series: [{ key: "value", label: valueColDisplayLabel, color: "#2563eb" }],
          points: ordered.map((pt) => ({
            label: pt.label,
            shortLabel: allTemporal
              ? formatTemporalAxisLabel(pt.label, isEn)
              : truncateChartLabel(pt.label),
            timestampMs: pt.timestampMs,
            value: pt.value,
          })),
          enabledTabs,
          defaultTab,
          isTemporal: allTemporal,
          maxLabelLength: Math.max(...ordered.map((p) => p.label.length)),
          tableMatrix: {
            entityHeaderKey: isDateColName
              ? "ai.organizer.analytics.dateColumn"
              : "ai.organizer.analytics.entityColumn",
            entityHeaderVi: resolvedEntityHeader,
            entityHeaderEn: resolvedEntityHeader,
            columns: displayColumns,
            rows: matrixRows,
          },
          exportColumns,
          exportRows: ordered.map((pt) => pt.rawRow),
        };
      }
    }
  }

  // 2. Nguồn Peer Cards đồng nhất theo `kind`:
  // - Chỉ vẽ các điểm `completeness === 'complete'` để không bóp méo chiều cao cột / tỷ trọng Donut bởi cận dưới `partial`.
  // - Không bao giờ bật tab `Xu hướng` (Line) cho danh sách sự kiện / suất diễn / hạng vé riêng biệt.
  if (cards.length >= 2) {
    const byKind: Record<OrganizerChatCard["kind"], OrganizerChatCard[]> = {
      event: cards.filter((c) => c.kind === "event"),
      showtime: cards.filter((c) => c.kind === "showtime"),
      ticket_type: cards.filter((c) => c.kind === "ticket_type"),
    };

    const wantsTier = /hang ve|loai ve|vip|tier|ticket type/.test(normalizedQ);
    const wantsShowtime = /suat|lich dien|showtime/.test(normalizedQ);

    const kindPriority: OrganizerChatCard["kind"][] = wantsTier
      ? ["ticket_type", "showtime", "event"]
      : wantsShowtime
        ? ["showtime", "ticket_type", "event"]
        : ["event", "ticket_type", "showtime"];

    const peerKind = kindPriority.find((k) => byKind[k].length >= 2);
    if (peerKind) {
      const peers = byKind[peerKind];
      const uniqueEventIds = new Set(peers.map((c) => c.event_id));
      const singleEvent = uniqueEventIds.size === 1;

      const preferredKeys = QUESTION_METRIC_PATTERNS
        .filter(([pattern]) => pattern.test(normalizedQ))
        .flatMap(([, keys]) => keys);
      const candidateOrder = [
        ...preferredKeys,
        "ticket_sales_revenue",
        "tickets_sold",
        "paid_orders",
        "occupancy_rate",
        "check_in_rate",
        "check_ins",
        "checked_in_tickets",
        "available_tickets",
      ];
      const allPeerKeys = Array.from(new Set(peers.flatMap((c) => c.metrics.map((m) => m.key))));
      const orderedCandidateKeys = [
        ...candidateOrder.filter((k) => allPeerKeys.includes(k)),
        ...allPeerKeys.filter((k) => !candidateOrder.includes(k)),
      ];

      for (const metricKey of orderedCandidateKeys) {
        const extracted = peers
          .map((card) => {
            const primary = pickPrimaryCardMetric(card.metrics, metricKey);
            // Ưu tiên tuyệt đối dữ liệu `complete` cho biểu đồ trực quan
            if (
              !primary ||
              typeof primary.value !== "number" ||
              !Number.isFinite(primary.value) ||
              primary.completeness !== "complete"
            ) {
              return null;
            }
            const sameKeyCompletePeriods = card.metrics
              .filter(
                (m) =>
                  m.key === metricKey &&
                  m.unit === primary.unit &&
                  typeof m.value === "number" &&
                  Number.isFinite(m.value) &&
                  m.completeness === "complete",
              )
              .map((m) => ({ m, range: parsePeriodMs(m.period) }))
              .filter((x): x is { m: OrganizerChatMetric; range: { fromMs: number; toMs: number } } =>
                Boolean(x.range),
              )
              .sort((a, b) => b.range.fromMs - a.range.fromMs);

            let priorVal: number | null = null;
            if (sameKeyCompletePeriods.length >= 2) {
              const curR = sameKeyCompletePeriods[0].range;
              const prevMatch = sameKeyCompletePeriods
                .slice(1)
                .find((x) => x.range.fromMs < curR.fromMs && x.range.toMs <= curR.fromMs);
              if (prevMatch && typeof prevMatch.m.value === "number") {
                priorVal = prevMatch.m.value;
              }
            }

            const label =
              singleEvent && card.kind !== "event"
                ? formatCardDisplayName(card, true)
                : [card.event_title, card.showtime_title, card.ticket_type_title]
                    .filter(Boolean)
                    .join(" · ") || card.event_id;

            return {
              card,
              label,
              unit: primary.unit,
              value: primary.value,
              priorValue: priorVal,
            };
          })
          .filter((item): item is NonNullable<typeof item> => item !== null);

        if (extracted.length < 2) continue;
        const firstUnit = extracted[0].unit;
        if (!extracted.every((item) => item.unit === firstUnit)) continue;

        const completeForBothPeriods = extracted.filter((item) => typeof item.priorValue === "number");
        const useGroupedPeriodBars =
          wantsPeriodComparison && completeForBothPeriods.length >= 2;
        const plottedItems = useGroupedPeriodBars ? completeForBothPeriods : extracted;

        // Nếu nhóm đồng hạng có thêm thẻ `partial`, không bật Donut (tỷ trọng % trên toàn tập sẽ thiếu chính xác)
        const hasExcludedPartialPeer = peers.some((card) => {
          const m = pickPrimaryCardMetric(card.metrics, metricKey);
          return m && m.completeness === "partial" && typeof m.value === "number";
        });

        const metricTitle = translateMetric(metricKey);
        const sum = plottedItems.reduce((acc, item) => acc + item.value, 0);
        const canDonut =
          !useGroupedPeriodBars &&
          !hasExcludedPartialPeer &&
          firstUnit !== "percent" &&
          plottedItems.length <= 12 &&
          plottedItems.every((item) => item.value >= 0) &&
          sum > 0;

        // So sánh các sự kiện / suất diễn / hạng vé KHÔNG phải chuỗi thời gian -> `line: false`
        const enabledTabs: Record<ChartTabMode, boolean> = {
          bar: true,
          donut: canDonut,
          line: false,
          table: true,
        };

        const defaultTab: ChartTabMode = wantsShare && canDonut ? "donut" : "bar";

        const series: InlineChartSeries[] = useGroupedPeriodBars
          ? [
              { key: "previousValue", label: periodLabels.previous, color: "#94a3b8" },
              { key: "currentValue", label: periodLabels.current, color: "#2563eb" },
            ]
          : [{ key: "value", label: metricTitle, color: "#2563eb" }];

        const points: InlineChartPoint[] = plottedItems.map((item) => ({
          label: item.label,
          shortLabel: truncateChartLabel(item.label),
          manageLink: resolveCardManageLink(item.card),
          ...(useGroupedPeriodBars
            ? {
                previousValue: item.priorValue,
                currentValue: item.value,
              }
            : { value: item.value }),
        }));

        // Tab `Bảng` giữ toàn bộ `peers` (gồm cả thẻ `partial` với nhãn `≥`) để không ẩn dữ liệu cận dưới
        const tableMatrix = buildCardsComparisonMatrix(peers, question, isEn, translateMetric)!;

        const entityColLabel = isEn ? tableMatrix.entityHeaderEn : tableMatrix.entityHeaderVi;
        const exportColumns: AnalyticsExportColumn[] = [
          { key: "__entity", label: entityColLabel },
          ...tableMatrix.columns.map((c) => ({ key: c.key, label: c.label })),
        ];
        const exportRows: Record<string, unknown>[] = tableMatrix.rows.map((r) => {
          const rec: Record<string, unknown> = { __entity: r.label };
          for (const col of tableMatrix.columns) {
            const cell = r.cells[col.key];
            rec[col.key] =
              cell?.completeness === "partial" && cell.value !== null
                ? `>= ${cell.value}`
                : (cell?.value ?? "");
          }
          return rec;
        });

        return {
          source: "cards",
          title: metricTitle,
          unit: firstUnit,
          series,
          points,
          enabledTabs,
          defaultTab,
          isTemporal: false,
          maxLabelLength: Math.max(...plottedItems.map((p) => p.label.length)),
          tableMatrix,
          exportColumns,
          exportRows,
        };
      }
    }
  }

  // 3. Nguồn Alternate Periods: chỉ vẽ cột ghép cho các chỉ số `completeness === 'complete'` ở cả hai kỳ
  const kpis = buildKpiCards(totals, cards, isEn);
  const comparablePeriodKpis = kpis.filter(
    (item) =>
      item.prior !== null &&
      item.current.unit === item.prior.unit &&
      typeof item.current.value === "number" &&
      Number.isFinite(item.current.value) &&
      item.current.completeness === "complete" &&
      typeof item.prior.value === "number" &&
      Number.isFinite(item.prior.value) &&
      item.prior.completeness === "complete",
  );

  if (comparablePeriodKpis.length >= 1) {
    const wantsRevenue = /doanh thu|revenue|gia tri ve|vnd/.test(normalizedQ);
    const vndGroup = comparablePeriodKpis.filter((k) => k.unit === "VND");
    const countGroup = comparablePeriodKpis.filter((k) => k.unit === "count");

    const chosenGroup =
      wantsRevenue && vndGroup.length > 0
        ? vndGroup
        : countGroup.length > 0
          ? countGroup
          : vndGroup.length > 0
            ? vndGroup
            : comparablePeriodKpis.filter((k) => k.unit === comparablePeriodKpis[0].unit);

    if (chosenGroup.length >= 1) {
      const unit = chosenGroup[0].unit;
      const points: InlineChartPoint[] = chosenGroup.map((item) => {
        const label = translateMetric(item.key);
        return {
          label,
          shortLabel: truncateChartLabel(label),
          previousValue: item.prior!.value,
          currentValue: item.current.value,
        };
      });

      const columns: ComparisonColumn[] = [
        { key: "previousValue", label: periodLabels.previous, unit, isNumeric: true },
        { key: "currentValue", label: periodLabels.current, unit, isNumeric: true },
      ];

      // Bảng đối chiếu kỳ giữ hiển thị cả các chỉ số cùng đơn vị có `partial` (với tiền tố `≥`)
      const tableGroup = kpis.filter(
        (item) =>
          item.unit === unit &&
          item.prior !== null &&
          item.current.completeness !== "missing" &&
          item.prior.completeness !== "missing",
      );

      const matrixRows: ComparisonRow[] = tableGroup.map((item) => ({
        id: `period-${item.key}`,
        label: translateMetric(item.key),
        manageLink: null,
        cells: {
          previousValue: {
            key: "previousValue",
            unit,
            value: item.prior!.value,
            completeness: item.prior!.completeness,
            formatted: formatMetricValue(item.prior, isEn),
            progress:
              unit === "percent" && typeof item.prior!.value === "number"
                ? getPercentProgressMeta(item.prior!.value)
                : null,
          },
          currentValue: {
            key: "currentValue",
            unit,
            value: item.current.value,
            completeness: item.current.completeness,
            formatted: formatMetricValue(item.current, isEn),
            progress:
              unit === "percent" && typeof item.current.value === "number"
                ? getPercentProgressMeta(item.current.value)
                : null,
          },
        },
      }));

      const metricHeader = isEn ? "Metric" : "Chỉ số";
      const exportColumns: AnalyticsExportColumn[] = [
        { key: "metric", label: metricHeader },
        { key: "previousValue", label: periodLabels.previous },
        { key: "currentValue", label: periodLabels.current },
      ];
      const exportRows = tableGroup.map((item) => ({
        metric: translateMetric(item.key),
        previousValue:
          item.prior!.completeness === "partial" ? `>= ${item.prior!.value}` : item.prior!.value,
        currentValue:
          item.current.completeness === "partial" ? `>= ${item.current.value}` : item.current.value,
      }));

      return {
        source: "periods",
        title: `${periodLabels.current} vs ${periodLabels.previous}`,
        unit,
        series: [
          { key: "previousValue", label: periodLabels.previous, color: "#94a3b8" },
          { key: "currentValue", label: periodLabels.current, color: "#2563eb" },
        ],
        points,
        enabledTabs: {
          bar: true,
          donut: false,
          line: false,
          table: true,
        },
        defaultTab: "bar",
        isTemporal: false,
        maxLabelLength: Math.max(...points.map((p) => p.label.length)),
        tableMatrix: {
          entityHeaderKey: "ai.organizer.analytics.metricColumn",
          entityHeaderVi: "Chỉ số",
          entityHeaderEn: "Metric",
          columns,
          rows: matrixRows,
        },
        exportColumns,
        exportRows,
      };
    }
  }

  return null;
}
