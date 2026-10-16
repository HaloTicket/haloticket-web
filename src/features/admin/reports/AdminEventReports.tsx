import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  FiCalendar,
  FiDollarSign,
  FiDownload,
  FiRefreshCw,
  FiShoppingCart,
  FiSliders,
  FiTag,
  FiShoppingBag,
} from "react-icons/fi";
import { toast } from "sonner";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AdminDataState } from "@/components/admin/AdminDataState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { CustomSelect } from "@/components/common/CustomSelect";
import { AdminEventOrdersModal } from "./components/AdminEventOrdersModal";
import { adminConfigApi } from "@/services/adminConfigApi";
import { adminUserApi } from "@/services/adminUserApi";
import {
  getAdminEventReports,
  getAllAdminEventReportRows,
  type AdminEventReport,
  type EventReportFilters,
  type ReportSort,
} from "@/services/adminReportsApi";
import {
  buildVietnameseReportExport,
  filtersFromSearch,
  formatHcmInstant,
  isValidReportPeriod,
  percentageChange,
  reportRequestError,
  reportQuery,
  safeCsvCell,
  shiftDate,
  summarizeTimeline,
  hcmToday,
} from "@/utils/reportUtils";
import { reportStatusText, reportText } from "@/utils/reportTranslations";

type Metric = "revenue" | "orders" | "tickets";
const metrics: Metric[] = ["revenue", "orders", "tickets"];
const labels: Record<Metric, string> = {
  revenue: "Doanh thu vé",
  orders: "Đơn đã thanh toán",
  tickets: "Vé đã bán",
};
const money = (value: number, locale: string) =>
  new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
const number = (value: number, locale: string) =>
  new Intl.NumberFormat(locale).format(value);
const dateLabel = (date: string, locale: string) =>
  new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function AdminEventReports() {
  const { t: rawT, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage?.startsWith("en") ? "en-US" : "vi-VN";
  const t = useCallback(
    (value: string, options?: Record<string, unknown>) =>
      rawT(reportText(value, locale === "en-US" ? "en" : "vi"), options),
    [locale, rawT]
  );
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => filtersFromSearch(searchParams.toString()), [searchParams]);
  const validPeriod = isValidReportPeriod(filters.from, filters.to) && filters.to <= hcmToday();

  const [report, setReport] = useState<AdminEventReport | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [metric, setMetric] = useState<Metric>("revenue");
  const [grouping, setGrouping] = useState<"day" | "week">("day");
  const [showFilters, setShowFilters] = useState(false);
  const [periodError, setPeriodError] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // search input with debounce to prevent re-rendering on every keystroke
  const [searchInput, setSearchInput] = useState(filters.q ?? "");

  // real database categories & organizers
  const [dbCategories, setDbCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [dbOrganizers, setDbOrganizers] = useState<Array<{ id: string; name: string }>>([]);

  // modal to view detailed orders of an event
  const [selectedEventForOrders, setSelectedEventForOrders] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const version = useRef(0);

  // keep search input in sync if filters.q changes externally (e.g., reset)
  useEffect(() => {
    setSearchInput(filters.q ?? "");
  }, [filters.q]);

  // fetch real categories and organizers from database once
  useEffect(() => {
    adminConfigApi
      .getCategories()
      .then((res: any) => {
        const list = Array.isArray(res) ? res : res?.data || [];
        const cats = list.map((c: any) => ({
          id: String(c.id),
          name: c.name || c.vietnameseName || "Thể loại",
        }));
        setDbCategories(cats);
      })
      .catch((err) => console.warn("Failed to load real categories", err));

    adminUserApi
      .getUsers({ role: "ORGANIZER", size: 100 })
      .then((res: any) => {
        const list =
          res?.content || (Array.isArray(res) ? res : res?.data?.content || []);
        const orgs = list.map((u: any) => ({
          id: String(u.id),
          name: u.fullName || u.companyName || u.email || "Nhà tổ chức",
        }));
        setDbOrganizers(orgs);
      })
      .catch((err) => console.warn("Failed to load real organizers", err));
  }, []);

  // merge database items with report options
  const mergedCategories = useMemo(() => {
    const map = new Map<string, string>();
    dbCategories.forEach((c) => map.set(c.id, c.name));
    (report?.options?.categories || []).forEach((c) => map.set(c.id, c.name));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [dbCategories, report?.options?.categories]);

  const mergedOrganizers = useMemo(() => {
    const map = new Map<string, string>();
    dbOrganizers.forEach((o) => map.set(o.id, o.name));
    (report?.options?.organizers || []).forEach((o) => map.set(o.id, o.name));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [dbOrganizers, report?.options?.organizers]);

  const update = useCallback(
    (change: Partial<EventReportFilters>) => {
      const next = { ...filters, ...change };
      setSearchParams(new URLSearchParams(reportQuery(next)));
    },
    [filters, setSearchParams]
  );

  // debounce search typing handler
  useEffect(() => {
    const timer = setTimeout(() => {
      if ((filters.q ?? "") !== searchInput.trim()) {
        update({ q: searchInput.trim() || undefined, page: 1 });
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [searchInput, filters.q, update]);

  // load report data smoothly without unmounting UI
  useEffect(() => {
    if (!searchParams.has("from") || !searchParams.has("to")) {
      setSearchParams(new URLSearchParams(reportQuery(filters)), { replace: true });
      return;
    }
    if (!isValidReportPeriod(filters.from, filters.to) || filters.to > hcmToday()) return;

    const controller = new AbortController();
    const current = ++version.current;

    if (!report) {
      setInitialLoading(true);
    } else {
      setRefreshing(true);
    }

    getAdminEventReports(filters, controller.signal)
      .then((data) => {
        if (current !== version.current) return;
        setReport(data);
        setErrorMessage("");
        setInitialLoading(false);
      })
      .catch((error) => {
        if (controller.signal.aborted || current !== version.current) return;
        setErrorMessage(reportRequestError(error));
        setInitialLoading(false);
      })
      .finally(() => {
        if (current === version.current) {
          setRefreshing(false);
        }
      });

    return () => controller.abort();
  }, [filters, searchParams, setSearchParams, refreshKey]);

  const setPeriod = (from: string, to: string) => {
    if (!isValidReportPeriod(from, to) || to > hcmToday()) {
      setPeriodError(true);
      return;
    }
    setPeriodError(false);
    update({ from, to, page: 1 });
  };

  const reset = () => {
    setSearchInput("");
    setSearchParams(
      new URLSearchParams(
        reportQuery({
          ...filtersFromSearch("", hcmToday()),
          sort: "revenue",
          page: 1,
          size: 10,
        })
      )
    );
  };

  const chartData = useMemo(
    () => summarizeTimeline(report?.timeline ?? [], metric, grouping),
    [report?.timeline, metric, grouping]
  );

  // enhanced Vietnamese export for CSV & Excel
  const exportReport = async (format: "csv" | "xlsx") => {
    if (exporting || !report) return;
    setExporting(true);
    try {
      toast.info("Đang trích xuất dữ liệu báo cáo...");
      const full = await getAllAdminEventReportRows(filters);
      if (full.totalElements > 10000) {
        throw new Error("The export limit is 10,000 events.");
      }

      const selectedCategory = mergedCategories.find(
        (c) => c.id === filters.categoryId
      )?.name;
      const selectedOrganizer = mergedOrganizers.find(
        (o) => o.id === filters.organizerId
      )?.name;

      const matrix = buildVietnameseReportExport(full, filters, full.rows, {
        categoryName: selectedCategory,
        organizerName: selectedOrganizer,
      });

      const stamp = `${filters.from}_${filters.to}`;
      if (format === "csv") {
        const content = matrix
          .map((row) => row.map(safeCsvCell).join(","))
          .join("\r\n");
        saveBlob(
          new Blob(["\uFEFF", content], { type: "text/csv;charset=utf-8" }),
          `BaoCao_SuKien_${stamp}.csv`
        );
      } else {
        const XLSX = await import("xlsx");
        const sheet = XLSX.utils.aoa_to_sheet(matrix);
        sheet["!cols"] = [
          { wch: 6 }, // STT
          { wch: 20 }, // Mã sự kiện
          { wch: 38 }, // Tên sự kiện
          { wch: 25 }, // Nhà tổ chức
          { wch: 20 }, // Thể loại
          { wch: 16 }, // Trạng thái
          { wch: 18 }, // Đơn đã thanh toán
          { wch: 15 }, // Vé đã bán
          { wch: 22 }, // Doanh thu vé
        ];
        const book = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(book, sheet, "BaoCaoSuKien");
        XLSX.writeFile(book, `BaoCao_SuKien_${stamp}.xlsx`);
      }
      toast.success(t("Đã xuất báo cáo thành công."));
    } catch (error) {
      toast.error(t(reportRequestError(error, true)));
    } finally {
      setExporting(false);
    }
  };

  const summary = report?.summary;
  const prior = report?.previous;
  const cards: Array<{
    key: keyof NonNullable<AdminEventReport["summary"]>;
    label: string;
    currency?: boolean;
  }> = [
    { key: "revenue", label: "Doanh thu vé", currency: true },
    { key: "orders", label: "Đơn đã thanh toán" },
    { key: "tickets", label: "Vé đã bán" },
    { key: "eventsWithSales", label: "Sự kiện phát sinh bán vé" },
  ];

  return (
    <div className="space-y-5 min-w-0">
      <AdminPageHeader
        title={t("Báo cáo & thống kê sự kiện")}
        description={t("Kỳ thanh toán · Múi giờ Asia/Ho_Chi_Minh")}
        actions={
          <div className="flex items-center gap-3">
            <span className="text-xs app-text-muted hidden sm:inline-block">
              {refreshing
                ? t("Đang cập nhật dữ liệu…")
                : report
                ? `${t("Cập nhật")}: ${formatHcmInstant(report.generatedAt, locale)}`
                : ""}
            </span>
            <button
              type="button"
              onClick={() => setRefreshKey((value) => value + 1)}
              className="inline-flex min-h-9 items-center gap-2 rounded-md border app-border px-3 text-xs font-bold app-text-main transition-colors duration-150 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-slate-800 motion-reduce:transition-none shadow-xs cursor-pointer"
            >
              <FiRefreshCw className={refreshing ? "animate-spin text-blue-500" : ""} />
              {t("Làm mới")}
            </button>
            <div className="relative group">
              <button
                type="button"
                disabled={exporting}
                className="inline-flex min-h-9 items-center gap-2 rounded-md bg-blue-600 px-4 text-xs font-bold text-white transition-colors duration-150 hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-60 motion-reduce:transition-none shadow-xs cursor-pointer"
              >
                <FiDownload />
                {exporting ? t("Đang xuất…") : t("Xuất báo cáo")}
              </button>
              <span className="text-[10px] app-text-muted mt-1 absolute -bottom-5 right-1 w-max">
                {t("Tối đa 10.000 sự kiện")}
              </span>
              <div className="absolute top-10 right-0 z-20 hidden min-w-36 rounded-md border app-border app-bg-card p-1 shadow-lg group-focus-within:block group-hover:block">
                <button
                  type="button"
                  onClick={() => void exportReport("xlsx")}
                  className="block min-h-9 w-full rounded-md px-3 text-left text-xs font-medium transition-colors duration-150 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-slate-800 motion-reduce:transition-none cursor-pointer"
                >
                  Excel (.xlsx)
                </button>
                <button
                  type="button"
                  onClick={() => void exportReport("csv")}
                  className="block min-h-9 w-full rounded-md px-3 text-left text-xs font-medium transition-colors duration-150 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-slate-800 motion-reduce:transition-none cursor-pointer"
                >
                  CSV (.csv)
                </button>
              </div>
            </div>
          </div>
        }
      />

      {/* Filters Section */}
      <section
        className="rounded-lg border app-border app-bg-card p-5 shadow-xs"
        aria-label={t("Bộ lọc báo cáo")}
      >
        <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-center">
          <div className="flex flex-wrap gap-2" aria-label={t("Khoảng thời gian")}>
            {[7, 30, 90].map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setPeriod(shiftDate(hcmToday(), -(days - 1)), hcmToday())}
                className={`min-h-9 rounded-md border px-3 text-xs font-bold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 motion-reduce:transition-none cursor-pointer ${
                  filters.from === shiftDate(hcmToday(), -days + 1) &&
                  filters.to === hcmToday()
                    ? "border-blue-600 bg-blue-600/10 app-text-brand"
                    : "app-border app-text-main hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                {t("{{days}} ngày", { days })}
              </button>
            ))}
            <label className="flex min-h-9 items-center gap-2 rounded-md border app-border px-3 text-xs app-text-muted">
              {t("Từ")}
              <input
                aria-label={t("Từ ngày")}
                type="date"
                value={filters.from}
                max={filters.to}
                onChange={(event) => setPeriod(event.target.value, filters.to)}
                className="bg-transparent font-medium app-text-main dark:[color-scheme:dark] focus:outline-none cursor-pointer"
              />
            </label>
            <label className="flex min-h-9 items-center gap-2 rounded-md border app-border px-3 text-xs app-text-muted">
              {t("Đến")}
              <input
                aria-label={t("Đến ngày")}
                type="date"
                value={filters.to}
                min={filters.from}
                max={hcmToday()}
                onChange={(event) => setPeriod(filters.from, event.target.value)}
                className="bg-transparent font-medium app-text-main dark:[color-scheme:dark] focus:outline-none cursor-pointer"
              />
            </label>
          </div>

          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 2xl:min-w-[420px]">
            <input
              aria-label={t("Tìm sự kiện")}
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder={t("Tìm tên hoặc mã sự kiện")}
              className="min-h-9 min-w-[220px] flex-[1_1_220px] rounded-md border app-border app-bg-card px-3 text-xs font-medium app-text-main placeholder:app-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
            />
            <button
              type="button"
              aria-expanded={showFilters}
              onClick={() => setShowFilters((value) => !value)}
              className="inline-flex min-h-9 items-center gap-2 rounded-md border app-border px-3 text-xs font-bold app-text-main transition-colors duration-150 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-slate-800 motion-reduce:transition-none shadow-xs cursor-pointer"
            >
              <FiSliders />
              {t("Bộ lọc")}
            </button>
            <button
              type="button"
              onClick={reset}
              className="min-h-9 rounded-md px-3 text-xs font-bold app-text-brand transition-colors duration-150 hover:bg-blue-50 hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-blue-950/30 dark:hover:text-blue-300 motion-reduce:transition-none cursor-pointer"
            >
              {t("Xóa bộ lọc")}
            </button>
          </div>
        </div>

        {(periodError || !validPeriod) && (
          <p role="alert" className="mt-2 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
            {t("Chọn khoảng ngày hợp lệ trong tối đa 366 ngày và không sau hôm nay.")}
          </p>
        )}

        {showFilters && (
          <div className="mt-4 grid gap-3 border-t app-border pt-4 sm:grid-cols-3">
            <label className="grid gap-1.5 text-xs font-semibold app-text-muted">
              {t("Thể loại")}
              <CustomSelect
                value={filters.categoryId ?? ""}
                onChange={(val) => update({ categoryId: val || undefined, page: 1 })}
                options={[
                  { value: "", label: t("Tất cả thể loại") },
                  ...mergedCategories.map((c) => ({ value: c.id, label: c.name })),
                ]}
              />
            </label>
            <label className="grid gap-1.5 text-xs font-semibold app-text-muted">
              {t("Nhà tổ chức")}
              <CustomSelect
                value={filters.organizerId ?? ""}
                onChange={(val) => update({ organizerId: val || undefined, page: 1 })}
                options={[
                  { value: "", label: t("Tất cả nhà tổ chức") },
                  ...mergedOrganizers.map((o) => ({ value: o.id, label: o.name })),
                ]}
              />
            </label>
            <label className="grid gap-1.5 text-xs font-semibold app-text-muted">
              {t("Trạng thái sự kiện")}
              <CustomSelect
                value={filters.status ?? ""}
                onChange={(val) => update({ status: val || undefined, page: 1 })}
                options={[
                  { value: "", label: t("Tất cả trạng thái") },
                  ...(report?.options?.statuses || ["APPROVED", "LIVE", "COMPLETED", "CANCELLED"]).map(
                    (s) => ({
                      value: s,
                      label: reportStatusText(s, locale === "en-US" ? "en" : "vi"),
                    })
                  ),
                ]}
              />
            </label>
          </div>
        )}
      </section>

      {/* Main Content Area */}
      {!validPeriod ? (
        <AdminDataState
          state="error"
          message={t("Chọn khoảng ngày hợp lệ trong tối đa 366 ngày và không sau hôm nay.")}
        />
      ) : initialLoading && !report ? (
        <AdminDataState state="loading" />
      ) : errorMessage && !report ? (
        <AdminDataState
          state="error"
          message={t(errorMessage)}
          onRetry={() => setRefreshKey((value) => value + 1)}
        />
      ) : report ? (
        <>
          {errorMessage && (
            <p
              role="alert"
              className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-[11px] font-semibold app-text-main"
            >
              {t(errorMessage)}
            </p>
          )}

          {/* Stat Cards */}
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((card, index) => {
              const current = summary?.[card.key] ?? 0;
              const previous = prior?.[card.key] ?? 0;
              const change = percentageChange(current, previous);
              const icons = [
                <FiDollarSign key="dollar" />,
                <FiShoppingCart key="cart" />,
                <FiTag key="tag" />,
                <FiCalendar key="cal" />,
              ];
              const iconColors = [
                "bg-blue-500/10 text-blue-700 dark:text-blue-300",
                "bg-green-500/10 text-green-700 dark:text-green-300",
                "bg-amber-500/10 text-amber-700 dark:text-amber-300",
                "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
              ];
              const valueColors = [
                "text-blue-700 dark:text-blue-300",
                "text-green-700 dark:text-green-300",
                "text-amber-700 dark:text-amber-300",
                "text-indigo-700 dark:text-indigo-300",
              ];
              return (
                <AdminStatCard
                  key={card.key}
                  title={t(card.label)}
                  value={card.currency ? money(current, locale) : number(current, locale)}
                  subtext={
                    change === null
                      ? t("Không có cơ sở so sánh")
                      : `${change > 0 ? "+" : ""}${change.toFixed(1)}% ${t("so với kỳ trước")}`
                  }
                  icon={icons[index]}
                  iconBgColor={iconColors[index]}
                  valueColor={valueColors[index]}
                />
              );
            })}
          </section>

          <p className="-mt-3 text-[11px] font-semibold app-text-muted">
            {t(
              "Doanh thu tính từ thanh toán vé gốc thành công trước hoàn tiền, không gồm phí nền tảng hoặc giao dịch bán lại."
            )}
          </p>

          {/* Trends Chart */}
          <section className="rounded-lg border app-border app-bg-card p-5 shadow-xs">
            <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-sm font-bold app-text-main">
                  {t("Xu hướng theo kỳ thanh toán")}
                </h2>
                <p className="text-[11px] font-semibold app-text-muted">
                  {filters.from} — {filters.to}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                {metrics.map((item) => {
                  const selectedStyle = {
                    revenue: "border-blue-600 bg-blue-600/10 text-blue-700 dark:text-blue-300",
                    orders: "border-green-600 bg-green-600/10 text-green-700 dark:text-green-300",
                    tickets: "border-amber-600 bg-amber-600/10 text-amber-700 dark:text-amber-300",
                  }[item];
                  return (
                    <button
                      key={item}
                      type="button"
                      aria-pressed={metric === item}
                      onClick={() => setMetric(item)}
                      className={`min-h-9 rounded-md border px-3 text-xs font-bold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 motion-reduce:transition-none cursor-pointer ${
                        metric === item
                          ? selectedStyle
                          : "app-border app-text-main hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      {t(labels[item])}
                    </button>
                  );
                })}
                <div className="w-28">
                  <CustomSelect
                    value={grouping}
                    onChange={(val) => setGrouping(val as "day" | "week")}
                    options={[
                      { value: "day", label: t("Ngày") },
                      { value: "week", label: t("Tuần") },
                    ]}
                  />
                </div>
              </div>
            </div>

            {chartData.length ? (
              <div className="h-64 w-full">
                <ResponsiveContainer>
                  <LineChart
                    data={chartData}
                    margin={{ top: 8, right: 16, left: 4, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) => dateLabel(value, locale)}
                      tick={{
                        fontSize: 10,
                        fill: "var(--color-muted-foreground)",
                        fontWeight: 600,
                      }}
                    />
                    <YAxis
                      width={68}
                      tickFormatter={(value) => number(value, locale)}
                      tick={{
                        fontSize: 10,
                        fill: "var(--color-muted-foreground)",
                        fontWeight: 600,
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--color-card)",
                        borderColor: "var(--color-border)",
                        color: "var(--color-foreground)",
                        borderRadius: "8px",
                        fontSize: "12px",
                        fontWeight: 600,
                      }}
                      labelFormatter={(value) => dateLabel(String(value), locale)}
                      formatter={(value) => [
                        metric === "revenue"
                          ? money(Number(value), locale)
                          : number(Number(value), locale),
                        t(labels[metric]),
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      isAnimationActive={false}
                      stroke={
                        metric === "revenue"
                          ? "var(--color-primary)"
                          : metric === "orders"
                          ? "var(--color-green-600)"
                          : "var(--color-amber-600)"
                      }
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <AdminDataState
                state="empty"
                message={t("Chưa có dữ liệu xu hướng trong kỳ này.")}
              />
            )}
          </section>

          {/* Comparison Table Section */}
          <section className="relative overflow-hidden rounded-lg border app-border app-bg-card shadow-xs">
            {/* Subtle Inline Refresh Overlay */}
            {refreshing && (
              <div className="absolute inset-0 z-10 bg-slate-900/10 dark:bg-black/20 backdrop-blur-[0.5px] flex items-center justify-center pointer-events-none transition-all">
                <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/80 px-4 py-2 text-xs font-bold text-white shadow-lg">
                  <FiRefreshCw className="h-3.5 w-3.5 animate-spin text-blue-400" />
                  <span>Đang cập nhật...</span>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 border-b app-border p-5">
              <div>
                <h2 className="text-sm font-bold app-text-main">
                  {t("So sánh sự kiện")}
                </h2>
                <p className="mt-0.5 text-xs font-semibold app-text-muted">
                  {t("{{count}} sự kiện", {
                    count: number(report.totalElements, locale),
                  })}
                </p>
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold app-text-muted">
                {t("Sắp xếp")}
                <div className="w-36">
                  <CustomSelect
                    value={filters.sort}
                    onChange={(val) => update({ sort: val as ReportSort, page: 1 })}
                    options={[
                      { value: "revenue", label: t("Doanh thu") },
                      { value: "orders", label: t("Đơn hàng") },
                      { value: "tickets", label: t("Vé đã bán") },
                      { value: "title", label: t("Tên sự kiện") },
                    ]}
                  />
                </div>
              </label>
            </div>

            {report.rows.length === 0 ? (
              <div className="p-5">
                <AdminDataState
                  state={
                    filters.q ||
                    filters.categoryId ||
                    filters.organizerId ||
                    filters.status
                      ? "no-results"
                      : "empty"
                  }
                  onReset={reset}
                />
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[950px] text-left text-xs">
                    <thead className="bg-slate-50/50 dark:bg-slate-800/30 text-[11px] uppercase tracking-wider app-text-muted">
                      <tr>
                        {[
                          "Sự kiện",
                          "Nhà tổ chức",
                          "Trạng thái",
                          "Đơn đã thanh toán",
                          "Vé đã bán",
                          "Doanh thu vé",
                        ].map((label) => (
                          <th key={label} className="px-4 py-3 font-bold border-b app-border">
                            {t(label)}
                          </th>
                        ))}
                        <th className="px-4 py-3 font-bold border-b app-border text-right">
                          Hành động
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                      {report.rows.map((row) => (
                        <tr
                          key={row.eventId}
                          className="group transition-colors duration-150 hover:bg-slate-50 dark:hover:bg-slate-800/50 motion-reduce:transition-none"
                        >
                          <td className="max-w-[300px] px-4 py-3">
                            <Link
                              to={`/admin/events/reports/${encodeURIComponent(
                                row.eventId
                              )}?${reportQuery(filters)}`}
                              title={row.title}
                              className="block truncate rounded font-bold app-text-main transition-colors group-hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:group-hover:text-blue-300 motion-reduce:transition-none"
                            >
                              {row.title || t("Sự kiện không có tên")}
                            </Link>
                            <span className="mt-1 block truncate text-[11px] leading-4 app-text-muted font-bold">
                              {row.category}
                            </span>
                          </td>
                          <td className="max-w-[180px] px-4 py-3 app-text-main font-semibold truncate">
                            {row.organizer}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded px-2 py-0.5 text-[10px] font-bold border ${
                                row.status === "LIVE"
                                  ? "border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400"
                                  : row.status === "APPROVED"
                                  ? "border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400"
                                  : row.status === "COMPLETED"
                                  ? "border-indigo-200 dark:border-indigo-900 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400"
                                  : row.status === "CANCELLED" || row.status === "REJECTED"
                                  ? "border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400"
                                  : "border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400"
                              }`}
                            >
                              {reportStatusText(row.status, locale === "en-US" ? "en" : "vi")}
                            </span>
                          </td>
                          <td className="px-4 py-3 tabular-nums app-text-main font-bold">
                            {number(row.orders, locale)}
                          </td>
                          <td className="px-4 py-3 tabular-nums app-text-main font-bold">
                            {number(row.tickets, locale)}
                          </td>
                          <td className="px-4 py-3 font-bold tabular-nums text-blue-600 dark:text-blue-400">
                            {money(row.revenue, locale)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedEventForOrders({
                                  id: row.eventId,
                                  title: row.title,
                                })
                              }
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 text-xs font-bold transition-colors cursor-pointer"
                              title="Xem danh sách đơn hàng"
                            >
                              <FiShoppingBag className="w-3.5 h-3.5" />
                              <span>Xem đơn</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <AdminPagination
                  page={report.page}
                  totalPages={report.totalPages}
                  totalElements={report.totalElements}
                  size={report.size}
                  loading={refreshing}
                  itemLabel={t("sự kiện")}
                  onPageChange={(page) => update({ page })}
                  onPageSizeChange={(size) => update({ size, page: 1 })}
                />
              </>
            )}
          </section>
        </>
      ) : null}

      {/* Event Orders Modal */}
      {selectedEventForOrders && (
        <AdminEventOrdersModal
          isOpen={Boolean(selectedEventForOrders)}
          onClose={() => setSelectedEventForOrders(null)}
          eventId={selectedEventForOrders.id}
          eventTitle={selectedEventForOrders.title}
        />
      )}
    </div>
  );
}
