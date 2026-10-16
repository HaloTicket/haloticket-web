import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FiDollarSign, FiShoppingCart, FiTag, FiShoppingBag } from "react-icons/fi";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AdminDataState } from "@/components/admin/AdminDataState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { AdminEventOrdersModal } from "./components/AdminEventOrdersModal";
import { getAdminEventReports, type AdminEventReport } from "@/services/adminReportsApi";
import { filtersFromSearch, formatHcmInstant, isValidReportPeriod, money, number, reportQuery, reportRequestError, summarizeTimeline, hcmToday } from "@/utils/reportUtils";
import { reportStatusText, reportText } from "@/utils/reportTranslations";

export default function AdminEventReportDetail() {
  const { eventId = "" } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t: rawT, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage?.startsWith("en") ? "en-US" : "vi-VN";
  const t = (value: string, options?: Record<string, unknown>) => rawT(reportText(value, locale === "en-US" ? "en" : "vi"), options);
  const filters = useMemo(() => filtersFromSearch(searchParams.toString()), [searchParams]);
  const validPeriod = isValidReportPeriod(filters.from, filters.to) && filters.to <= hcmToday();
  const [report, setReport] = useState<AdminEventReport | null>(null);
  const [state, setState] = useState<"loading" | "error" | "ready">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [resolvedKey, setResolvedKey] = useState("");
  const [retry, setRetry] = useState(0);
  const [showOrdersModal, setShowOrdersModal] = useState(false);
  const version = useRef(0);
  const requestKey = `${eventId}?${reportQuery(filters)}#${retry}`;
  useEffect(() => {
    if (!validPeriod) return;
    const request = ++version.current; const controller = new AbortController();
    getAdminEventReports({ ...filters, page: 1, size: 10, eventId }, controller.signal).then(value => {
      if (request === version.current) { setReport(value); setState("ready"); setResolvedKey(requestKey); }
    }).catch(error => { if (!controller.signal.aborted && request === version.current) { setErrorMessage(reportRequestError(error)); setState("error"); setResolvedKey(requestKey); } });
    return () => controller.abort();
  }, [eventId, filters, retry, requestKey, validPeriod]);
  const resolvedReport = resolvedKey === requestKey && state === "ready" ? report : null;
  const row = resolvedReport?.rows.find(item => item.eventId === eventId) ?? resolvedReport?.rows[0];
  const chart = summarizeTimeline(resolvedReport?.timeline ?? [], "revenue", "day");
  const backQuery = reportQuery(filters);
  const backTo = `/admin/events/reports?${backQuery}`;

  return <div className="space-y-5 min-w-0">
    <AdminPageHeader title={row?.title ?? t("Báo cáo sự kiện")} description={`${t("Kỳ thanh toán")}: ${filters.from} — ${filters.to} · Asia/Ho_Chi_Minh`}
      actions={<>
        <Link to={backTo} className="inline-flex min-h-9 items-center rounded-lg border app-border px-3 text-sm font-semibold app-text-main transition-colors duration-150 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-slate-800 motion-reduce:transition-none">{t("Quay lại báo cáo")}</Link>
        <button type="button" onClick={() => setShowOrdersModal(true)} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-blue-600 bg-blue-600/10 px-3 text-sm font-semibold text-blue-600 dark:text-blue-400 transition-colors duration-150 hover:bg-blue-600/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 motion-reduce:transition-none cursor-pointer"><FiShoppingBag className="w-4 h-4" />{t("Danh sách đơn hàng")}</button>
        <Link to={`/admin/events-approval/${encodeURIComponent(eventId)}`} className="inline-flex min-h-9 items-center rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 motion-reduce:transition-none">{t("Chi tiết kiểm duyệt")}</Link>
      </>} />
    {!validPeriod ? <AdminDataState state="error" message={t("Chọn khoảng ngày hợp lệ trong tối đa 366 ngày và không sau hôm nay.")} onReset={() => navigate(backTo)} /> : resolvedKey !== requestKey ? <AdminDataState state="loading" /> : state === "error" ? <AdminDataState state="error" message={t(errorMessage)} onRetry={() => setRetry(value => value + 1)} /> : !row ? <AdminDataState state="empty" message={t("Không tìm thấy dữ liệu cho sự kiện này trong kỳ đã chọn.")} onReset={() => navigate(backTo)} /> : <>
      <div className="flex flex-wrap gap-x-6 gap-y-2 rounded-xl border app-border app-bg-card px-4 py-3 text-sm app-text-muted"><span>{t("Mã sự kiện")}: <strong className="app-text-main">{eventId}</strong></span><span>{t("Nhà tổ chức")}: <strong className="app-text-main">{row.organizer}</strong></span><span>{t("Thể loại")}: <strong className="app-text-main">{row.category}</strong></span><span>{t("Trạng thái")}: <strong className="app-text-main">{reportStatusText(row.status, locale === "en-US" ? "en" : "vi")}</strong></span><span>{t("Cập nhật")}: <strong className="app-text-main">{formatHcmInstant(resolvedReport!.generatedAt, locale)}</strong></span></div>
      <section className="grid gap-3 sm:grid-cols-3"><AdminStatCard title={t("Doanh thu vé")} value={money(resolvedReport!.summary.revenue, locale)} icon={<FiDollarSign />} iconBgColor="bg-blue-500/10 text-blue-700 dark:text-blue-300" valueColor="text-blue-700 dark:text-blue-300" /><AdminStatCard title={t("Đơn đã thanh toán")} value={number(resolvedReport!.summary.orders, locale)} icon={<FiShoppingCart />} iconBgColor="bg-green-500/10 text-green-700 dark:text-green-300" valueColor="text-green-700 dark:text-green-300" /><AdminStatCard title={t("Vé đã bán")} value={number(resolvedReport!.summary.tickets, locale)} icon={<FiTag />} iconBgColor="bg-amber-500/10 text-amber-700 dark:text-amber-300" valueColor="text-amber-700 dark:text-amber-300" /></section>
      <p className="-mt-3 text-xs app-text-muted">{t("Doanh thu tính từ thanh toán vé gốc thành công trước hoàn tiền, không gồm phí nền tảng hoặc giao dịch bán lại.")}</p>
      <section className="rounded-xl border app-border app-bg-card p-4 sm:p-5"><h2 className="mb-4 font-bold app-text-main">{t("Doanh thu theo ngày")}</h2>{chart.length ? <div className="h-64 w-full"><ResponsiveContainer><LineChart data={chart}><CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.3} /><XAxis dataKey="date" tick={{ fontSize: 12, fill: "#94a3b8" }} /><YAxis tickFormatter={value => number(Number(value), locale)} tick={{ fontSize: 12, fill: "#94a3b8" }} /><Tooltip contentStyle={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)", color: "inherit" }} formatter={value => [money(Number(value), locale), t("Doanh thu vé")]} /><Line dataKey="value" type="monotone" isAnimationActive={false} stroke="#2563eb" strokeWidth={2.5} dot={false} /></LineChart></ResponsiveContainer></div> : <AdminDataState state="empty" message={t("Chưa có dữ liệu xu hướng trong kỳ này.")} />}</section>
    </>}

    {showOrdersModal && (
      <AdminEventOrdersModal
        isOpen={showOrdersModal}
        onClose={() => setShowOrdersModal(false)}
        eventId={eventId}
        eventTitle={row?.title || "Sự kiện"}
      />
    )}
  </div>;
}
