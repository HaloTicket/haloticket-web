import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FiTrendingUp,
  FiUsers,
  FiShoppingBag,
  FiEye,
  FiAlertTriangle,
  FiRefreshCw,
  FiBarChart2,
  FiDollarSign,
  FiTag,
} from "react-icons/fi";
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

import { eventApi } from "@/services/eventApi";
import { formatCompactVnd, formatCurrency } from "@/utils/formatters";
import { useParams } from "react-router-dom";
import type { EventAnalytics, EventAnalyticsQuery } from "@/types/eventAnalytics";
import {
  addDays,
  changeDirection,
  customPeriodProblem,
  formatChange,
  hasSales,
  queryFor,
  shortDay,
  todayInVietnam,
  unavailableLabels,
  type PeriodChoice,
} from "./analyticsPeriod";

const AXIS_TICK = { fontSize: 11, fill: "var(--text-muted)" };
const TOOLTIP_STYLE = {
  backgroundColor: "var(--bg-card)",
  borderColor: "var(--border-color)",
  borderRadius: "12px",
  fontSize: "12px",
  color: "var(--text-main)",
};

const CHOICES: { value: PeriodChoice; label: string }[] = [
  { value: "24h", label: "24 giờ" },
  { value: "7d", label: "7 ngày" },
  { value: "30d", label: "30 ngày" },
  { value: "custom", label: "Tùy chọn" },
];

/** Kết quả một lần gọi API thống kê: khóa yêu cầu, sự kiện tương ứng, dữ liệu (nếu có) và cờ thất bại. */
interface Answer {
  key: string;
  eventId: string;
  data: EventAnalytics | null;
  failed: boolean;
}

/** Thẻ một chỉ số của kỳ thống kê, kèm mức thay đổi so với kỳ trước khi được yêu cầu so sánh. */
const StatCard: React.FC<{
  title: string;
  icon: React.ReactNode;
  value: string;
  caption: string;
  change?: number | null;
  showChange: boolean;
}> = ({ title, icon, value, caption, change, showChange }) => {
  const { t } = useTranslation();
  const text = formatChange(change);
  const direction = changeDirection(change);
  const tone =
    direction === "up" ? "text-emerald-600 dark:text-emerald-400"
      : direction === "down" ? "text-red-600 dark:text-red-400"
        : "app-text-muted";
  return (
    <div className="app-bg-card border app-border rounded-xl p-4 space-y-1 shadow-xs">
      <div className="flex items-center justify-between text-xs app-text-muted font-bold">
        <span>{title}</span>
        {icon}
      </div>
      <p className="text-xl font-black app-text-main truncate" title={value}>{value}</p>
      {showChange ? (
        <p className={`text-[10px] font-bold ${tone}`} title={text === null ? t("Kỳ trước chưa có số liệu để so sánh") : undefined}>
          {text === null ? t("Chưa có kỳ trước để so sánh") : `${text} ${t("so với kỳ trước")}`}
        </p>
      ) : (
        <p className="text-[10px] app-text-muted font-bold">{caption}</p>
      )}
    </div>
  );
};

/** Vòng tròn tiến độ dạng phần trăm (SVG), màu hổ phách hoặc xanh lục theo {@code tone}. */
const Ring: React.FC<{ percent: number; tone: "amber" | "emerald" }> = ({ percent, tone }) => (
  <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
      <path
        className="text-slate-200 dark:text-slate-800"
        strokeWidth="3.5"
        stroke="currentColor"
        fill="none"
        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
      />
      <path
        className={`${tone === "amber" ? "text-amber-500" : "text-emerald-500"} transition-all duration-1000 ease-out`}
        strokeDasharray={`${percent}, 100`}
        strokeWidth="3.5"
        strokeLinecap="round"
        stroke="currentColor"
        fill="none"
        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
      />
    </svg>
    <span className={`absolute text-xs font-black ${tone === "amber" ? "text-amber-500" : "text-emerald-500"}`}>{percent}%</span>
  </div>
);

/** Màn tổng quan sự kiện: chọn kỳ thống kê (24 giờ, 7 ngày, 30 ngày hoặc tùy chọn), so sánh với kỳ trước, thẻ chỉ số, tiến độ so với mục tiêu và biểu đồ doanh thu, vé theo ngày. */
export const EventOverview: React.FC = () => {
  const { t } = useTranslation();
  const { eventId } = useParams<{ eventId: string }>();
  const [choice, setChoice] = useState<PeriodChoice>("30d");
  const [compare, setCompare] = useState(true);
  // các ngày đang nhập, và các ngày dữ liệu được yêu cầu lần gần nhất (chỉ đổi ngày thì chưa gửi gì)
  const [draft, setDraft] = useState(() => ({ from: addDays(todayInVietnam(), -6), to: todayInVietnam() }));
  const [applied, setApplied] = useState(draft);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const query: EventAnalyticsQuery = useMemo(
    () => queryFor(choice, applied.from, applied.to, compare),
    [choice, applied, compare],
  );
  const requestKey = `${eventId ?? ""}|${JSON.stringify(query)}|${reloadKey}`;
  // kết quả của sự kiện này vẫn hiện (mờ đi) khi đang tải kết quả kế tiếp; kết quả của sự kiện khác thì không bao giờ hiện
  const current = answer && answer.eventId === (eventId ?? "") ? answer : null;
  const isRefreshing = current !== null && current.key !== requestKey;
  const isLoading = current === null;
  const analytics = current?.data ?? null;
  const loadFailed = current !== null && current.failed;
  const draftProblem = customPeriodProblem(draft.from, draft.to);

  useEffect(() => {
    if (!eventId) return;
    let isMounted = true;

    eventApi.getEventAnalytics(eventId, query).then((data: EventAnalytics | null) => {
      if (isMounted) setAnswer({ key: requestKey, eventId, data: data ?? null, failed: false });
    }).catch(() => {
      if (isMounted) setAnswer({ key: requestKey, eventId, data: null, failed: true });
    });

    return () => { isMounted = false; };
  }, [eventId, query, requestKey]);

  /** Tải lại số liệu bằng cách đổi khóa tải. */
  const retry = useCallback(() => setReloadKey((key) => key + 1), []);
  /** Áp dụng khoảng ngày đang nhập nếu hợp lệ. */
  const applyDraft = () => {
    if (draftProblem === null) setApplied(draft);
  };

  const totalRevenueTarget = analytics?.totalRevenueTarget || 0;
  const currentRevenue = analytics?.currentRevenue || 0;
  const revenuePercent = totalRevenueTarget > 0 ? Math.min(100, Math.round((currentRevenue / totalRevenueTarget) * 100)) : 0;

  const totalTicketsTarget = analytics?.totalTicketsTarget || 0;
  const currentTicketsSold = analytics?.currentTicketsSold || 0;
  const ticketsPercent = totalTicketsTarget > 0 ? Math.min(100, Math.round((currentTicketsSold / totalTicketsTarget) * 100)) : 0;

  const days = useMemo(() => analytics?.dailyStats ?? [], [analytics]);
  const chartData = useMemo(
    () => days.map((day) => ({ label: shortDay(day.date), revenue: day.revenue, tickets: day.ticketsSold })),
    [days],
  );
  const previous = analytics?.previous ?? null;
  const showChange = compare && previous !== null;
  const missing = unavailableLabels(analytics?.unavailableSources);
  const bookingMissing = (analytics?.unavailableSources ?? []).includes("booking");
  /** Định dạng số theo kiểu vi-VN, giá trị thiếu coi là 0. */
  const number = (value: number | undefined) => (value ?? 0).toLocaleString("vi-VN");

  if (isLoading) {
    return <div className="p-8 text-center app-text-muted text-sm font-bold">{t("Đang tải dữ liệu...")}</div>;
  }

  return (
    <div className={`space-y-2 animate-in fade-in duration-200 transition-opacity ${isRefreshing ? "opacity-60" : ""}`} aria-busy={isRefreshing}>
      {loadFailed && (
        <div role="alert" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-4 py-3">
          <p className="flex items-center gap-2 text-xs font-bold text-red-700 dark:text-red-300">
            <FiAlertTriangle className="w-4 h-4 shrink-0" />
            {t("Không tải được số liệu của sự kiện. Các con số bên dưới có thể chưa đúng.")}
          </p>
          <button
            type="button"
            onClick={retry}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer shrink-0"
          >
            <FiRefreshCw className="w-3.5 h-3.5" />
            {t("Thử lại")}
          </button>
        </div>
      )}

      {!loadFailed && analytics?.partial && (
        <div role="status" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 px-4 py-3">
          <p className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300">
            <FiAlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              {t("Chưa đọc được dữ liệu")}: {missing.map((label) => t(label)).join(", ")}. {t("Các số liệu liên quan đang hiện 0 vì thiếu dữ liệu, không phải vì chưa có doanh số.")}
            </span>
          </p>
          <button
            type="button"
            onClick={retry}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold cursor-pointer shrink-0"
          >
            <FiRefreshCw className="w-3.5 h-3.5" />
            {t("Thử lại")}
          </button>
        </div>
      )}

      {/* Kỳ thống kê và so sánh */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <p className="text-xs app-text-muted font-bold">
          {analytics?.periodFrom && analytics?.periodTo ? (
            <>
              {t("Kỳ đang xem")}: <span className="app-text-main">{shortDay(analytics.periodFrom)} – {shortDay(analytics.periodTo)}</span>
              {previous && compare && (
                <> · {t("Kỳ trước")}: <span className="app-text-main">{shortDay(previous.from)} – {shortDay(previous.to)}</span></>
              )}
            </>
          ) : null}
        </p>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <label className="flex items-center gap-2 text-xs font-bold app-text-muted cursor-pointer select-none">
            <input
              type="checkbox"
              checked={compare}
              onChange={(e) => setCompare(e.target.checked)}
              className="w-4 h-4 accent-blue-600 cursor-pointer"
            />
            {t("So sánh với kỳ trước")}
          </label>

          <div className="flex items-center gap-1.5 app-bg-card p-1 rounded-xl border app-border shadow-xs" role="group" aria-label={t("Khoảng thời gian")}>
            {CHOICES.map((item) => (
              <button
                key={item.value}
                type="button"
                aria-pressed={choice === item.value}
                onClick={() => setChoice(item.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${choice === item.value ? "bg-blue-600 text-white shadow-xs" : "app-text-muted hover:app-text-main"
                  }`}
              >
                {t(item.label)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {choice === "custom" && (
        <div className="flex flex-wrap items-end justify-end gap-3 app-bg-card border app-border rounded-xl p-3">
          <label className="text-xs font-bold app-text-muted space-y-1">
            <span className="block">{t("Từ ngày")}</span>
            <input
              type="date"
              value={draft.from}
              max={draft.to || undefined}
              onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))}
              className="app-bg-input border app-border rounded-lg px-2.5 py-1.5 text-xs app-text-main"
            />
          </label>
          <label className="text-xs font-bold app-text-muted space-y-1">
            <span className="block">{t("Đến ngày")}</span>
            <input
              type="date"
              value={draft.to}
              min={draft.from || undefined}
              onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))}
              className="app-bg-input border app-border rounded-lg px-2.5 py-1.5 text-xs app-text-main"
            />
          </label>
          <button
            type="button"
            onClick={applyDraft}
            disabled={draftProblem !== null}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold cursor-pointer"
          >
            {t("Áp dụng")}
          </button>
          {draftProblem !== null && <p role="alert" className="basis-full text-right text-[11px] font-bold text-red-600 dark:text-red-400">{t(draftProblem)}</p>}
        </div>
      )}

      {/* Các chỉ số của kỳ, mỗi chỉ số kèm mức thay đổi so với kỳ trước */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title={t("Doanh thu kỳ này")}
          icon={<FiDollarSign className="w-4 h-4 text-purple-500" />}
          value={formatCurrency(analytics?.periodRevenue ?? 0)}
          caption={t("Đơn đã thanh toán trong kỳ")}
          change={previous?.revenueChange}
          showChange={showChange}
        />
        <StatCard
          title={t("Vé bán kỳ này")}
          icon={<FiTag className="w-4 h-4 text-emerald-500" />}
          value={`${number(analytics?.periodTicketsSold)} ${t("vé")}`}
          caption={t("Vé thuộc đơn đã thanh toán")}
          change={previous?.ticketsSoldChange}
          showChange={showChange}
        />
        <StatCard
          title={t("Lượt truy cập")}
          icon={<FiEye className="w-4 h-4 text-blue-500" />}
          value={number(analytics?.pageViews)}
          caption={t("Theo dõi lượt xem")}
          change={previous?.pageViewsChange}
          showChange={showChange}
        />
        <StatCard
          title={t("Người dùng")}
          icon={<FiUsers className="w-4 h-4 text-purple-500" />}
          value={number(analytics?.uniqueUsers)}
          caption={t("Người xem duy nhất")}
          change={null}
          showChange={false}
        />
        <StatCard
          title={t("Người mua")}
          icon={<FiShoppingBag className="w-4 h-4 text-emerald-500" />}
          value={number(analytics?.buyers)}
          caption={t("Tài khoản đã thanh toán")}
          change={previous?.buyersChange}
          showChange={showChange}
        />
        <StatCard
          title={t("Tỉ lệ chuyển đổi")}
          icon={<FiTrendingUp className="w-4 h-4 text-amber-500" />}
          value={`${analytics?.conversionRate ?? 0} %`}
          caption={t("Người mua / Người dùng")}
          change={null}
          showChange={false}
        />
      </div>

      {/* Tiến độ so với mục tiêu, tính trên toàn bộ vòng đời sự kiện */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="app-bg-card border app-border rounded-2xl p-5 shadow-xs flex items-center justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs font-extrabold app-text-muted uppercase tracking-wider">{t("Tổng doanh thu")}</p>
            <h3 className="text-2xl font-black text-blue-600 dark:text-blue-400">
              {formatCurrency(currentRevenue)}
            </h3>
            <p className="text-xs font-medium app-text-muted">
              {t("Mục tiêu")}: <strong className="app-text-main">{formatCurrency(totalRevenueTarget)}</strong>
            </p>
          </div>
          <Ring percent={revenuePercent} tone="amber" />
        </div>

        <div className="app-bg-card border app-border rounded-2xl p-5 shadow-xs flex items-center justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs font-extrabold app-text-muted uppercase tracking-wider">{t("Tổng vé đã bán")}</p>
            <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {currentTicketsSold.toLocaleString("vi-VN")} {t("vé")}
            </h3>
            <p className="text-xs font-medium app-text-muted">
              {t("Tổng phát hành")}: <strong className="app-text-main">{totalTicketsTarget.toLocaleString("vi-VN")} {t("vé")}</strong>
            </p>
          </div>
          <Ring percent={ticketsPercent} tone="emerald" />
        </div>
      </div>

      {/* Doanh thu và số vé theo ngày trong kỳ */}
      <div className="app-bg-card border app-border rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b app-border pb-3">
          <h3 className="text-xs font-extrabold app-text-main uppercase tracking-wider flex items-center gap-2">
            <FiTrendingUp className="w-4 h-4 text-blue-600" />
            <span>{t("Doanh thu & Vé bán theo ngày")}</span>
          </h3>

          <div className="flex items-center gap-4 text-xs font-bold">
            <span className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
              <span className="w-3 h-3 rounded-full bg-purple-600 inline-block" />
              {t("Doanh thu")}
            </span>
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
              {t("Số vé bán")}
            </span>
          </div>
        </div>

        {!hasSales(days) ? (
          <div className="h-[300px] w-full flex flex-col items-center justify-center gap-2 text-center px-4">
            <FiBarChart2 className="w-8 h-8 app-text-muted" />
            <p className="text-sm font-bold app-text-main">
              {bookingMissing ? t("Chưa đọc được số liệu đơn hàng") : t("Chưa có đơn thanh toán trong kỳ này")}
            </p>
            <p className="text-xs app-text-muted max-w-md">
              {bookingMissing
                ? t("Biểu đồ chưa vẽ được vì dịch vụ đơn hàng chưa trả lời. Bấm Thử lại ở trên.")
                : t("Biểu đồ hiện khi có đơn hàng đã thanh toán trong khoảng thời gian đang chọn. Thử chọn khoảng dài hơn.")}
            </p>
          </div>
        ) : (
          <div className="h-[300px] w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" opacity={0.6} />
                <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} minTickGap={16} />
                <YAxis yAxisId="money" tick={AXIS_TICK} axisLine={false} tickLine={false} width={56} tickFormatter={(value: number) => formatCompactVnd(value)} />
                <YAxis yAxisId="tickets" orientation="right" allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} width={40} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  itemStyle={{ color: "var(--text-main)", fontWeight: "bold" }}
                  labelStyle={{ color: "var(--text-muted)" }}
                  formatter={(value: unknown, name: unknown) => {
                    const amount = Number(value);
                    if (name === t("Số vé bán")) return [`${amount.toLocaleString("vi-VN")} ${t("vé")}`, name as string];
                    return [formatCurrency(amount), name as string];
                  }}
                />
                <Bar yAxisId="money" dataKey="revenue" name={t("Doanh thu")} fill="#9333ea" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Line yAxisId="tickets" type="monotone" dataKey="tickets" name={t("Số vé bán")} stroke="#10b981" strokeWidth={3} dot={chartData.length <= 31 ? { r: 3, strokeWidth: 2 } : false} activeDot={{ r: 6 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventOverview;
