import React, { useMemo, useState, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download } from "lucide-react";
import { formatCompactVnd } from "@/utils/formatters";
import {
  type ChartTabMode,
  type InlineChartSpec,
  formatRawUnitValue,
  shouldUseHorizontalBars,
} from "./organizerAnalyticsModel";
import {
  downloadAnalyticsCsv,
  downloadAnalyticsXlsx,
} from "./organizerAnalyticsExport";
import { OrganizerComparisonTable } from "./OrganizerComparisonTable";

const DONUT_PALETTE = [
  "#2563eb",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#64748b",
];

function subscribeReducedMotion(onStoreChange: () => void): () => void {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return () => {};
  }
  const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (!mql || typeof mql.addEventListener !== "function") {
    return () => {};
  }
  mql.addEventListener("change", onStoreChange);
  return () => mql.removeEventListener("change", onStoreChange);
}

function getReducedMotionSnapshot(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return Boolean(window.matchMedia("(prefers-reduced-motion: reduce)")?.matches);
}

function getServerReducedMotionSnapshot(): boolean {
  return false;
}

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getServerReducedMotionSnapshot,
  );
}

interface OrganizerInlineChartProps {
  spec: InlineChartSpec;
  isExpanded?: boolean;
  exportBaseName?: string;
}

/**
 * Khối biểu đồ tương tác nhúng trực tiếp trong tin nhắn BTC (`OrganizerInlineChart`):
 * - Chuyển đổi 4 tab `Cột` · `Tỷ trọng` · `Xu hướng` · `Bảng` (chỉ bật chế độ hợp lệ với dữ liệu).
 * - Tự xoay cột ngang ở khung thu gọn / nhãn dài, nâng chiều cao 210px -> 300px khi `isExpanded`.
 * - Xuất trực tiếp `.xlsx` và `.csv` an toàn chống chèn công thức bảng tính.
 */
export const OrganizerInlineChart: React.FC<OrganizerInlineChartProps> = ({
  spec,
  isExpanded = false,
  exportBaseName = "haloticket_organizer_analytics",
}) => {
  const { t, i18n } = useTranslation();
  const isEn = Boolean(i18n.language && i18n.language.startsWith("en"));
  const prefersReducedMotion = usePrefersReducedMotion();

  const [selectedTab, setSelectedTab] = useState<ChartTabMode>(spec.defaultTab);

  const activeTab: ChartTabMode = spec.enabledTabs[selectedTab] ? selectedTab : spec.defaultTab;

  const chartHeight = isExpanded ? 300 : 210;
  const horizontalBars = shouldUseHorizontalBars(spec, isExpanded);
  const animateChart = !prefersReducedMotion;

  const tabs: { mode: ChartTabMode; label: string }[] = [
    {
      mode: "bar",
      label: t("ai.organizer.analytics.tabBar", { defaultValue: isEn ? "Bar" : "Cột" }),
    },
    {
      mode: "donut",
      label: t("ai.organizer.analytics.tabDonut", { defaultValue: isEn ? "Share" : "Tỷ trọng" }),
    },
    {
      mode: "line",
      label: t("ai.organizer.analytics.tabLine", { defaultValue: isEn ? "Trend" : "Xu hướng" }),
    },
    {
      mode: "table",
      label: t("ai.organizer.analytics.tabTable", { defaultValue: isEn ? "Table" : "Bảng" }),
    },
  ];

  const donutTotal = useMemo(() => {
    if (!spec.enabledTabs.donut) return 0;
    return spec.points.reduce((sum, pt) => sum + (Number(pt.value) || 0), 0);
  }, [spec]);

  const formatAxisTick = (val: unknown): string => {
    const num = Number(val);
    if (!Number.isFinite(num)) return String(val ?? "");
    if (spec.unit === "VND") return formatCompactVnd(num);
    if (spec.unit === "percent") return `${num}%`;
    return num.toLocaleString(isEn ? "en-US" : "vi-VN");
  };

  const formatTooltipVal = (value: unknown, name: unknown): [string, string] => {
    const num = Number(value);
    const seriesLabel = String(name ?? spec.title);
    if (!Number.isFinite(num)) return ["—", seriesLabel];
    const formatted = formatRawUnitValue(num, spec.unit, isEn);
    if (activeTab === "donut" && donutTotal > 0) {
      const share = Math.round((num / donutTotal) * 1000) / 10;
      const shareText = share.toLocaleString(isEn ? "en-US" : "vi-VN", { maximumFractionDigits: 1 });
      return [`${formatted} (${shareText}%)`, seriesLabel];
    }
    return [formatted, seriesLabel];
  };

  return (
    <section
      data-testid="organizer-inline-chart"
      aria-label={spec.title}
      className="mt-3 rounded-xl border border-gray-200 dark:border-gray-700/80 bg-gray-50/60 dark:bg-[#202024] p-3"
    >
      {/* Thanh tiêu đề + Chuyển đổi chế độ xem + Xuất Excel/CSV */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
        <div className="text-xs font-bold text-gray-800 dark:text-gray-100 truncate max-w-full">
          {spec.title}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <div
            role="tablist"
            aria-label={t("ai.organizer.analytics.chartModeAria", {
              defaultValue: isEn ? "Chart view" : "Chế độ hiển thị biểu đồ",
            })}
            className="inline-flex items-center rounded-lg bg-gray-200/70 dark:bg-[#18181b] p-0.5"
          >
            {tabs.map((tab) => {
              const enabled = spec.enabledTabs[tab.mode];
              const isSelected = activeTab === tab.mode;
              return (
                <button
                  key={tab.mode}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  disabled={!enabled}
                  onClick={() => enabled && setSelectedTab(tab.mode)}
                  className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-colors motion-reduce:transition-none ${
                    isSelected
                      ? "bg-white dark:bg-[#27272a] text-brand-primary shadow-2xs"
                      : enabled
                        ? "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white cursor-pointer"
                        : "text-gray-400 dark:text-gray-600 opacity-50 cursor-not-allowed"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {spec.exportRows.length > 0 && (
            <div className="inline-flex items-center gap-1">
              <button
                type="button"
                onClick={() =>
                  downloadAnalyticsXlsx(spec.exportColumns, spec.exportRows, exportBaseName)
                }
                aria-label={t("ai.organizer.analytics.exportXlsxAria", {
                  defaultValue: isEn ? "Export Excel" : "Xuất Excel",
                })}
                title={t("ai.organizer.analytics.exportXlsxAria", {
                  defaultValue: isEn ? "Export Excel" : "Xuất Excel",
                })}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#18181b] text-[11px] font-medium text-gray-700 dark:text-gray-200 hover:border-brand-primary/50 hover:text-brand-primary transition-colors motion-reduce:transition-none cursor-pointer"
              >
                <Download size={12} aria-hidden="true" />
                <span>Excel</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  downloadAnalyticsCsv(spec.exportColumns, spec.exportRows, exportBaseName)
                }
                aria-label={t("ai.organizer.analytics.exportCsvAria", {
                  defaultValue: isEn ? "Export CSV" : "Xuất CSV",
                })}
                title={t("ai.organizer.analytics.exportCsvAria", {
                  defaultValue: isEn ? "Export CSV" : "Xuất CSV",
                })}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#18181b] text-[11px] font-medium text-gray-700 dark:text-gray-200 hover:border-brand-primary/50 hover:text-brand-primary transition-colors motion-reduce:transition-none cursor-pointer"
              >
                <Download size={12} aria-hidden="true" />
                <span>CSV</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Khu vực hiển thị Biểu đồ hoặc Bảng */}
      {activeTab === "table" ? (
        <OrganizerComparisonTable matrix={spec.tableMatrix} />
      ) : (
        <div
          data-testid="organizer-chart-viewport"
          className={`w-full ${isExpanded ? "h-[300px]" : "h-[210px]"}`}
          style={{ height: `${chartHeight}px` }}
        >
          {activeTab === "donut" ? (
            <div className="flex h-full items-center gap-3">
              <div className="h-full flex-1 min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={spec.points}
                      dataKey="value"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius="50%"
                      outerRadius="80%"
                      paddingAngle={2}
                      isAnimationActive={animateChart}
                    >
                      {spec.points.map((pt, idx) => (
                        <Cell
                          key={`slice-${pt.label}-${idx}`}
                          fill={DONUT_PALETTE[idx % DONUT_PALETTE.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={formatTooltipVal}
                      contentStyle={{
                        borderRadius: "10px",
                        fontSize: "12px",
                        border: "1px solid var(--border-color)",
                        backgroundColor: "var(--bg-card)",
                        color: "var(--text-main)",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="w-2/5 max-h-full overflow-y-auto space-y-1.5 pr-1 text-[11px]">
                {spec.points.map((pt, idx) => {
                  const raw = Number(pt.value) || 0;
                  const pct =
                    donutTotal > 0 ? Math.round((raw / donutTotal) * 1000) / 10 : 0;
                  return (
                    <li key={`legend-${pt.label}-${idx}`} className="flex items-start justify-between gap-1.5">
                      <span className="flex items-center gap-1.5 min-w-0 text-gray-700 dark:text-gray-300">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: DONUT_PALETTE[idx % DONUT_PALETTE.length] }}
                          aria-hidden="true"
                        />
                        <span className="truncate" title={pt.label}>
                          {pt.label}
                        </span>
                      </span>
                      <span className="font-semibold tabular-nums text-gray-900 dark:text-gray-100 shrink-0">
                        {pct.toLocaleString(isEn ? "en-US" : "vi-VN", { maximumFractionDigits: 1 })}%
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : activeTab === "line" ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={spec.points} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis
                  dataKey="shortLabel"
                  tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={formatAxisTick}
                  tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                  axisLine={false}
                  tickLine={false}
                  width={54}
                />
                <Tooltip
                  formatter={formatTooltipVal}
                  labelFormatter={(_label, payload) => {
                    const first = Array.isArray(payload) && payload[0]?.payload;
                    return first?.label ? String(first.label) : String(_label ?? "");
                  }}
                  contentStyle={{
                    borderRadius: "10px",
                    fontSize: "12px",
                    border: "1px solid var(--border-color)",
                    backgroundColor: "var(--bg-card)",
                    color: "var(--text-main)",
                  }}
                />
                {spec.series.map((s) => (
                  <Line
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    name={s.label}
                    stroke={s.color}
                    strokeWidth={2.5}
                    dot={{ r: 3.5 }}
                    activeDot={{ r: 5 }}
                    connectNulls={false}
                    isAnimationActive={animateChart}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : horizontalBars ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={spec.points}
                layout="vertical"
                barGap={4}
                margin={{ top: 4, right: 14, left: 4, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-color)" />
                <XAxis
                  type="number"
                  tickFormatter={formatAxisTick}
                  tick={{ fontSize: 10.5, fill: "var(--text-muted)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="shortLabel"
                  width={isExpanded ? 140 : 104}
                  tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={formatTooltipVal}
                  contentStyle={{
                    borderRadius: "10px",
                    fontSize: "12px",
                    border: "1px solid var(--border-color)",
                    backgroundColor: "var(--bg-card)",
                    color: "var(--text-main)",
                  }}
                />
                {spec.series.length > 1 && <Legend wrapperStyle={{ fontSize: "11px" }} />}
                {spec.series.map((s) => (
                  <Bar
                    key={s.key}
                    dataKey={s.key}
                    name={s.label}
                    fill={s.color}
                    radius={[0, 6, 6, 0]}
                    maxBarSize={22}
                    isAnimationActive={animateChart}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={spec.points}
                layout="horizontal"
                barGap={4}
                margin={{ top: 8, right: 12, left: 4, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis
                  dataKey="shortLabel"
                  tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={formatAxisTick}
                  tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                  axisLine={false}
                  tickLine={false}
                  width={54}
                />
                <Tooltip
                  formatter={formatTooltipVal}
                  contentStyle={{
                    borderRadius: "10px",
                    fontSize: "12px",
                    border: "1px solid var(--border-color)",
                    backgroundColor: "var(--bg-card)",
                    color: "var(--text-main)",
                  }}
                />
                {spec.series.length > 1 && <Legend wrapperStyle={{ fontSize: "11px" }} />}
                {spec.series.map((s) => (
                  <Bar
                    key={s.key}
                    dataKey={s.key}
                    name={s.label}
                    fill={s.color}
                    radius={[6, 6, 0, 0]}
                    maxBarSize={28}
                    isAnimationActive={animateChart}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      )}
    </section>
  );
};

export default OrganizerInlineChart;
