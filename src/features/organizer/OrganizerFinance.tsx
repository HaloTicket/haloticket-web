import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import * as Dialog from "@radix-ui/react-dialog";
import { useTranslation } from "react-i18next";
import { FiAlertCircle, FiCheck, FiCheckCircle, FiChevronLeft, FiChevronRight, FiCopy, FiDollarSign, FiDownload, FiInbox, FiRefreshCw, FiSearch, FiX } from "react-icons/fi";
import { TablePagination } from "@/components/common/TablePagination";
import { organizerApi } from "@/services/organizerApi";
import { payoutApi } from "@/services/payoutApi";
import { normalizePayoutFilter, payoutStatusGroup, payoutStatusGroups } from "@/utils/payoutStatusGroups";
import { PATHS } from "@/routes/paths";
import { OrganizerFinanceReports } from "@/features/organizer/finance/OrganizerFinanceReports";
import { OrganizerFinanceAnalytics } from "@/features/organizer/finance/OrganizerFinanceAnalytics";
import { revenueRange, type RevenuePeriod } from "@/features/organizer/finance/revenuePeriods";
import type { EventSettlement, FinanceSummary, OrganizerFinanceAnalytics as OrganizerFinanceAnalyticsData, PayoutAccount, PayoutQuote, PayoutResponse } from "@/types";

type FinanceTab = "overview" | "history";
type EventFilter = "all" | "eligible" | "processing";
type EventSort = "recent" | "gross" | "available" | "name";


const money = (value?: string | number) => {
  if (value === undefined || value === null || value === "") return "—";
  try { return `${BigInt(String(value)).toLocaleString("vi-VN")} ₫`; } catch { return "—"; }
};
const date = (value?: string) => value ? new Date(value).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";
const statusCopy = payoutStatusGroups;
const reasonCopy: Record<string, string> = {
  IDENTITY_VERIFICATION_REQUIRED: "Cần hoàn tất xác minh danh tính để rút tiền",
  KYC_REQUIRED: "Cần hoàn tất xác minh danh tính để rút tiền",
  PAYMENT_BOOKING_MISMATCH: "Đang kiểm tra dữ liệu thanh toán",
  EVENT_CANCELLED: "Sự kiện đã hủy",
  EVENT_NOT_ENDED: "Sự kiện chưa kết thúc",
  PAYOUT_ACCOUNT_MISSING: "Chưa có tài khoản nhận tiền",
  PAYOUT_ACCOUNT_UNVERIFIED: "Tài khoản nhận tiền chưa xác minh",
  FINANCIAL_PERMISSION_REQUIRED: "Bạn chưa có quyền tài chính cho sự kiện này",
  FUNDS_ON_HOLD: "Một phần tiền đang được tạm giữ",
  PAYOUT_IN_PROGRESS: "Đã có yêu cầu khác đang xử lý",
  NO_AVAILABLE_FUNDS: "Chưa có số dư đủ điều kiện",
};
const reasonLabel = (code?: string) => code ? reasonCopy[code] || code : "Chưa đủ điều kiện";
const statusStyle = (status: string) => status === "COMPLETED" ? "bg-green-50 text-green-700" : ["PENDING", "APPROVED", "PROCESSING", "NEEDS_VERIFICATION"].includes(status) ? "bg-amber-50 text-amber-700" : ["FAILED", "REJECTED", "DISPUTE"].includes(status) ? "bg-rose-50 text-rose-700" : "bg-zinc-100 text-zinc-700";
const errorText = (error: unknown) => {
  const err = error as { response?: { status?: number; data?: { message?: string } }; message?: string };
  if (err?.response?.status === 403) return "Bạn chưa được cấp quyền xem dữ liệu tài chính này.";
  if (err?.response?.status === 409) return err.response.data?.message || "Điều kiện hoặc số dư đã thay đổi. Hãy tải lại dữ liệu.";
  return err?.response?.data?.message || err?.message || "Không thể tải dữ liệu. Vui lòng thử lại.";
};

export const OrganizerFinance: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab: FinanceTab = searchParams.get("tab") === "history" ? "history" : "overview";
  const query = searchParams.get("q") || "";
  const requestedFilter = searchParams.get("filter");
  const filter: EventFilter = requestedFilter === "eligible" || requestedFilter === "processing" ? requestedFilter : "all";
  const payoutFilter = normalizePayoutFilter(searchParams.get("status"));
  const reportEventId = searchParams.get("reportEvent") || "";
  const [today] = useState(() => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()));
  const queryFrom = searchParams.get("from") || "";
  const queryTo = searchParams.get("to") || "";
  const hasExplicitRange = Boolean(queryFrom || queryTo);
  const requestedPeriod = searchParams.get("period");
  const period: RevenuePeriod = ["recent", "month", "year", "custom"].includes(requestedPeriod || "")
    ? requestedPeriod as RevenuePeriod
    : hasExplicitRange ? "custom" : "recent";
  const overviewDefaultRange = period === "custom" ? { from: "", to: "" } : revenueRange(period, today);
  const reportEndDate = new Date(`${today}T00:00:00Z`);
  reportEndDate.setUTCDate(reportEndDate.getUTCDate() - 29);
  const reportsDefaultRange = { from: reportEndDate.toISOString().slice(0, 10), to: today };
  const dateFrom = tab === "history" ? queryFrom : queryFrom || overviewDefaultRange.from;
  const dateTo = tab === "history" ? queryTo : queryTo || overviewDefaultRange.to;
  const reportFrom = searchParams.get("reportFrom") || reportsDefaultRange.from;
  const reportTo = searchParams.get("reportTo") || reportsDefaultRange.to;
  const [reportsOpen, setReportsOpen] = useState(searchParams.get("tab") === "reports");
  const [eventDetails, setEventDetails] = useState<EventSettlement | null>(null);
  const [eventSort, setEventSort] = useState<EventSort>("recent");
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [events, setEvents] = useState<EventSettlement[]>([]);
  const [payouts, setPayouts] = useState<PayoutResponse[]>([]);
  const [analytics, setAnalytics] = useState<OrganizerFinanceAnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState("");
  const analyticsRequestRef = useRef(0);
  const [reportAnalytics, setReportAnalytics] = useState<OrganizerFinanceAnalyticsData | null>(null);
  const reportScope = JSON.stringify([reportFrom, reportTo, reportEventId]);
  const [loadedReportScope, setLoadedReportScope] = useState("");
  const [reportAnalyticsLoading, setReportAnalyticsLoading] = useState(false);
  const [reportAnalyticsError, setReportAnalyticsError] = useState("");
  const reportAnalyticsRequestRef = useRef(0);
  const [loading, setLoading] = useState(true);
  const [dataError, setDataError] = useState("");
  const [summaryError, setSummaryError] = useState("");
  const [historyError, setHistoryError] = useState("");
  const [page, setPage] = useState(Number(searchParams.get("page") || 1));
  const [pageSize, setPageSize] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [eligibleEvents, setEligibleEvents] = useState<EventSettlement[]>([]);
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [eligibleError, setEligibleError] = useState("");
  const [eligibleLoading, setEligibleLoading] = useState(false);
  const quoteRequestRef = useRef(0);
  const [quotes, setQuotes] = useState<PayoutQuote[]>([]);
  const [quoteError, setQuoteError] = useState("");
  const [account, setAccount] = useState<PayoutAccount | null>(null);
  const [accountError, setAccountError] = useState("");
  const [accountEditorOpen, setAccountEditorOpen] = useState(false);
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountSaveError, setAccountSaveError] = useState("");
  const [accountForm, setAccountForm] = useState({ bankName: "", accountHolder: "", accountNumber: "" });
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitUncertain, setSubmitUncertain] = useState(false);
  const [sent, setSent] = useState<{ eventId: string; payout: PayoutResponse }[]>([]);
  const [copiedRequestId, setCopiedRequestId] = useState("");
  const requestKeys = useRef(new Map<string, string>());
  const [payoutSearch, setPayoutSearch] = useState(searchParams.get("q") || "");
  const [eventSearch, setEventSearch] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setDataError(""); setSummaryError(""); setHistoryError("");
    const [summaryResult, eventsResult, payoutsResult] = await Promise.allSettled([
      payoutApi.getOrganizerSummary(), payoutApi.getOrganizerEvents({ page: 0, size: 100 }), payoutApi.getOrganizerPayouts(),
    ]);
    if (summaryResult.status === "fulfilled") setSummary(summaryResult.value); else { setSummary(null); setSummaryError(errorText(summaryResult.reason)); }
    const eventRows = eventsResult.status === "fulfilled" ? eventsResult.value.content || [] : [];
    if (eventsResult.status === "fulfilled") setEvents(eventRows); else { setEvents([]); setDataError(errorText(eventsResult.reason)); }
    if (payoutsResult.status === "fulfilled") {
      const payoutRows = Array.isArray(payoutsResult.value) ? payoutsResult.value : payoutsResult.value.content || [];
      const eventNames = new Map(eventRows.map(event => [event.eventId, event.eventName]));
      setPayouts(payoutRows.map(payout => ({ ...payout, eventName: payout.eventName || eventNames.get(payout.eventId) })));
    } else { setPayouts([]); setHistoryError(errorText(payoutsResult.reason)); }
    setLoading(false);
  }, [setLoading, setDataError, setSummaryError, setHistoryError, setSummary, setEvents, setPayouts]);
  useEffect(() => {
    const timer = window.setTimeout(() => { void loadData(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (tab === "history") setPayoutSearch(searchParams.get("q") || "");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [searchParams, tab]);

  const loadAnalytics = useCallback(async () => {
    const requestId = ++analyticsRequestRef.current;
    setAnalytics(null); setAnalyticsLoading(true); setAnalyticsError("");
    if (tab === "history") {
      setAnalyticsLoading(false);
      return;
    }
    if (dateFrom && dateTo && dateFrom > dateTo) {
      setAnalyticsError("Ngày bắt đầu phải bằng hoặc trước ngày kết thúc.");
      setAnalyticsLoading(false);
      return;
    }
    if (dateFrom && dateTo && (Date.parse(dateTo) - Date.parse(dateFrom)) / 86400000 >= 366) {
      setAnalyticsError("Vui lòng chọn khoảng thời gian không quá 366 ngày.");
      setAnalyticsLoading(false);
      return;
    }
    try {
      const response = await payoutApi.getOrganizerAnalytics(dateFrom, dateTo);
      if (requestId === analyticsRequestRef.current) setAnalytics(response);
    } catch (error) {
      if (requestId === analyticsRequestRef.current) { setAnalytics(null); setAnalyticsError(errorText(error)); }
    } finally { if (requestId === analyticsRequestRef.current) setAnalyticsLoading(false); }
  }, [dateFrom, dateTo, tab, setAnalytics, setAnalyticsLoading, setAnalyticsError]);
  useEffect(() => {
    if (tab === "history") return;
    const timer = window.setTimeout(() => { void loadAnalytics(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadAnalytics, tab]);

  const loadReportAnalytics = useCallback(async () => {
    const requestId = ++reportAnalyticsRequestRef.current;
    setReportAnalytics(null); setReportAnalyticsLoading(true); setReportAnalyticsError("");
    if (!reportsOpen || tab !== "overview") { setReportAnalyticsLoading(false); return; }
    if (reportFrom > reportTo) {
      setReportAnalyticsError("Ngày bắt đầu phải bằng hoặc trước ngày kết thúc.");
      setReportAnalyticsLoading(false);
      return;
    }
    if ((Date.parse(reportTo) - Date.parse(reportFrom)) / 86400000 >= 366) {
      setReportAnalyticsError("Vui lòng chọn khoảng thời gian không quá 366 ngày.");
      setReportAnalyticsLoading(false);
      return;
    }
    try {
      const response = await payoutApi.getOrganizerAnalytics(reportFrom, reportTo, reportEventId || undefined);
      if (requestId === reportAnalyticsRequestRef.current) { setReportAnalytics(response); setLoadedReportScope(reportScope); }
    } catch (error) {
      if (requestId === reportAnalyticsRequestRef.current) { setReportAnalytics(null); setReportAnalyticsError(errorText(error)); }
    } finally { if (requestId === reportAnalyticsRequestRef.current) setReportAnalyticsLoading(false); }
  }, [reportEventId, reportFrom, reportTo, reportScope, reportsOpen, tab, setReportAnalytics, setReportAnalyticsLoading, setReportAnalyticsError, setLoadedReportScope]);
  useEffect(() => {
    const timer = window.setTimeout(() => { void loadReportAnalytics(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadReportAnalytics]);

  const updateSearch = (patch: Record<string, string | number | null>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([key, value]) => value === null || value === "" ? next.delete(key) : next.set(key, String(value)));
    setSearchParams(next, { replace: true });
  };
  const updateAnalyticsRange = (from: string, to: string, nextPeriod: RevenuePeriod) => {
    updateSearch({ from: from || null, to: to || null, period: nextPeriod, page: null });
    setPage(1);
  };
  const openRequest = async (eventId = "") => {
    quoteRequestRef.current++;
    setDialogOpen(true); setStep(1); setSelectedEventIds(eventId ? [eventId] : []); setEventSearch(""); setQuotes([]); setConfirmed(false); setSubmitError(""); setSubmitUncertain(false); setEligibleError(""); setAccountError(""); setSent([]); setCopiedRequestId("");
    requestKeys.current.clear();
    setEligibleLoading(true);
    try { setEligibleEvents((await payoutApi.getOrganizerEvents({ page: 0, size: 100 })).content); } catch (error) { setEligibleError(errorText(error)); }
    finally { setEligibleLoading(false); }
  };
  const availableEvents = eligibleEvents.filter(event => event.eligible);
  const selectedEvents = availableEvents.filter(event => selectedEventIds.includes(event.eventId));
  const allSelected = availableEvents.length > 0 && selectedEvents.length === availableEvents.length;
  const pendingEvents = selectedEvents.filter(event => !sent.some(item => item.eventId === event.eventId));
  const completed = sent.length > 0 && pendingEvents.length === 0;
  const readyToSubmit = pendingEvents.length > 0 && quotes.length === pendingEvents.length
    && pendingEvents.every(event => quotes.some(quote => quote.eventId === event.eventId && quote.eligible && quote.quoteId))
    && account?.verified && !accountError && !quoteError && confirmed && !submitting && !accountSaving && !accountEditorOpen;
  const totalExpected = quotes.filter(quote => pendingEvents.some(event => event.eventId === quote.eventId))
    .reduce((total, quote) => total + BigInt(quote.expectedTransferAmount), 0n);
  const eventName = (eventId: string) => eligibleEvents.find(event => event.eventId === eventId)?.eventName || eventId;

  const canRequestEvent = (event: EventSettlement) => event.eligible;
  const hasProcessingPayout = useCallback((eventId: string) => payouts.some(payout => payout.eventId === eventId && ["PENDING", "APPROVED", "PROCESSING", "NEEDS_VERIFICATION", "DISPUTE"].includes(payout.status)), [payouts]);
  const filteredEvents = useMemo(() => {
    const rows = events.filter(event => {
      const text = `${event.eventName} ${event.eventId}`.toLocaleLowerCase("vi");
      const matchesQuery = text.includes(query.toLocaleLowerCase("vi"));
      const matchesFilter = filter === "all" || (filter === "eligible" && canRequestEvent(event)) || (filter === "processing" && hasProcessingPayout(event.eventId));
      return matchesQuery && matchesFilter;
    });
    return rows.sort((a, b) => {
      if (eventSort === "name") return a.eventName.localeCompare(b.eventName, "vi");
      if (eventSort === "gross") return BigInt(b.grossAmount || "0") < BigInt(a.grossAmount || "0") ? -1 : BigInt(b.grossAmount || "0") > BigInt(a.grossAmount || "0") ? 1 : 0;
      if (eventSort === "available") return BigInt(b.availableAmount || "0") < BigInt(a.availableAmount || "0") ? -1 : BigInt(b.availableAmount || "0") > BigInt(a.availableAmount || "0") ? 1 : 0;
      return String(b.eventEndAt || "").localeCompare(String(a.eventEndAt || ""));
    });
  }, [events, eventSort, filter, hasProcessingPayout, query]);
  const eventCounts = useMemo(() => ({
    all: events.length,
    eligible: events.filter(canRequestEvent).length,
    processing: events.filter(event => hasProcessingPayout(event.eventId)).length,
  }), [events, hasProcessingPayout]);
  const filteredPayouts = useMemo(() => payouts.filter(p => {
    const createdDate = p.createdAt ? new Date(p.createdAt).toISOString().slice(0, 10) : "";
    return `${p.id} ${p.eventName || "Sự kiện không xác định"}`.toLocaleLowerCase("vi").includes(payoutSearch.toLocaleLowerCase("vi")) &&
      (payoutFilter === "ALL" || payoutStatusGroup(p.status) === payoutFilter) &&
      (!dateFrom || (createdDate && createdDate >= dateFrom)) && (!dateTo || (createdDate && createdDate <= dateTo));
  }), [dateFrom, dateTo, payoutFilter, payoutSearch, payouts]);
  const paginatedEvents = filteredEvents.slice((page - 1) * pageSize, page * pageSize);
  const paginatedPayouts = filteredPayouts.slice((page - 1) * pageSize, page * pageSize);
  const grossRevenueForRange = analytics?.series.reduce((total, item) => total + BigInt(item.grossAmount), 0n).toString();

  const getQuote = async () => {
    if (!pendingEvents.length || submitUncertain) return;
    const requestId = ++quoteRequestRef.current;
    setQuoteError(""); setAccountError(""); setSubmitError(""); setQuotes([]); setConfirmed(false); setStep(2);
    const [quoteResult, accountResult] = await Promise.allSettled([
      Promise.all(pendingEvents.map(event => payoutApi.getPayoutQuote(event.eventId, "FINAL_SETTLEMENT"))),
      organizerApi.getPayoutAccountFromServer(),
    ]);
    if (requestId !== quoteRequestRef.current) return;
    if (quoteResult.status === "fulfilled") setQuotes(quoteResult.value);
    else setQuoteError(errorText(quoteResult.reason));
    if (accountResult.status === "fulfilled") setAccount(accountResult.value);
    else setAccountError(errorText(accountResult.reason));
  };
  const saveAccount = async () => {
    if (!accountForm.bankName.trim() || !accountForm.accountHolder.trim() || !accountForm.accountNumber.trim()) {
      setAccountSaveError("Nhập ngân hàng, số tài khoản và tên chủ tài khoản.");
      return;
    }
    setAccountSaving(true); setAccountSaveError("");
    try {
      const savedAccount = await organizerApi.savePayoutAccountForFinance({
        bankName: accountForm.bankName.trim(),
        accountHolder: accountForm.accountHolder.trim(),
        accountNumber: accountForm.accountNumber.trim(),
        businessType: "individual",
      });
      setAccount(savedAccount);
      setAccountForm({ bankName: "", accountHolder: "", accountNumber: "" });
      setAccountEditorOpen(false);
      await getQuote();
    } catch (error) { setAccountSaveError(errorText(error)); }
    finally { setAccountSaving(false); }
  };
  const submitRequest = async () => {
    if (!readyToSubmit) return;
    setSubmitting(true); setSubmitError("");
    let sentAny = false;
    try {
      for (const event of pendingEvents) {
        const quote = quotes.find(item => item.eventId === event.eventId);
        if (!quote) break;
        const previousKey = requestKeys.current.get(event.eventId);
        const key = previousKey ?? crypto.randomUUID();
        requestKeys.current.set(event.eventId, key);
        let payout: PayoutResponse | null = null;
        try {
          payout = await payoutApi.requestPayout(event.eventId, "FINAL_SETTLEMENT", quote.quoteId, quote.accountVersion, quote.availableAmount, key);
        } catch (error) {
          const status = (error as { response?: { status?: number } })?.response?.status;
          const uncertain = !status || status >= 500 || status === 408;
          let needsLookup = uncertain || Boolean(previousKey);
          if (needsLookup) {
            try {
              payout = await payoutApi.lookupPayoutByKey(key);
              if (!payout && !uncertain) needsLookup = false;
            } catch (lookupError) {
              const lookupStatus = (lookupError as { response?: { status?: number } })?.response?.status;
              if (lookupStatus === 404 && !uncertain) needsLookup = false;
            }
          }
          if (!payout) {
            setSubmitUncertain(needsLookup);
            if (!needsLookup) requestKeys.current.delete(event.eventId);
            const message = needsLookup
              ? "Chưa xác định được kết quả gửi yêu cầu. Hãy tra cứu lại bằng cùng mã an toàn."
              : errorText(error);
            setSubmitError(`${event.eventName}: ${message}`);
            break;
          }
        }
        requestKeys.current.delete(event.eventId);
        setSubmitUncertain(false);
        setSent(previous => [...previous, { eventId: event.eventId, payout }]);
        sentAny = true;
      }
    } finally {
      if (sentAny) await loadData();
      setSubmitting(false);
    }
  };
  const copyRequestId = async (id: string) => {
    if (!navigator.clipboard?.writeText) return;
    try {
      await navigator.clipboard.writeText(id);
      setCopiedRequestId(id);
      window.setTimeout(() => setCopiedRequestId(current => current === id ? "" : current), 1800);
    } catch { setCopiedRequestId(""); }
  };

  return <Dialog.Root open={reportsOpen} onOpenChange={setReportsOpen}><div className="finance-theme w-full min-h-screen app-bg-page p-4 md:p-8 space-y-6">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-sm app-text-muted">{t("Organizer Center")}</p><h1 className="text-2xl font-bold app-text-main">Doanh thu & Rút tiền</h1><p className="mt-1 text-sm app-text-muted">Quản lý doanh thu, yêu cầu rút tiền và báo cáo tài chính.</p></div>
      <div className="flex gap-2">
        {tab === "overview" && <><Dialog.Trigger asChild><button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-xl border app-border app-bg-card px-4 text-sm font-semibold app-text-main"><FiDownload aria-hidden="true" />Xuất Excel</button></Dialog.Trigger></>}
        <button onClick={() => void loadData()} className="inline-flex min-h-11 items-center gap-2 rounded-xl border app-border app-bg-card px-4 text-sm font-semibold app-text-main" aria-label="Làm mới dữ liệu"><FiRefreshCw />Làm mới</button>
        <button onClick={() => void openRequest()} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"><FiDollarSign />Yêu cầu rút tiền</button>
      </div>
    </header>

    <nav className="flex gap-1 overflow-x-auto border-b app-border" role="tablist" aria-label="Doanh thu và rút tiền">
      {([{ value: "overview", label: "Tổng quan" }, { value: "history", label: "Lịch sử rút tiền" }] as const).map(item => <button key={item.value} type="button" role="tab" id={`finance-tab-${item.value}`} aria-selected={tab === item.value} aria-controls="finance-content" onClick={() => { setPage(1); setPayoutSearch(""); if (item.value === "history") setReportsOpen(false); updateSearch({ tab: item.value === "overview" ? null : item.value, q: null, status: null, page: null }); }} className={`min-h-11 shrink-0 border-b-2 px-4 py-3 text-sm font-semibold ${tab === item.value ? "border-blue-600 text-blue-700" : "border-transparent app-text-muted hover:text-blue-700"}`}>{item.label}</button>)}
    </nav>
    <div id="finance-content" role="tabpanel" aria-labelledby={`finance-tab-${tab}`} className="space-y-6">

    {tab === "overview" && summaryError && <ErrorBanner message={summaryError} onRetry={() => void loadData()} />}
    {tab === "overview" && <section aria-label="Tổng quan tài chính" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryCard label="Tổng doanh thu" amount={grossRevenueForRange} icon="₫" tone="blue" loading={analyticsLoading} />
      <SummaryCard label="Số tiền đã nhận" amount={summary?.paidAmount} icon="✓" tone="navy" loading={loading} />
      <SummaryCard label="Số tiền có thể rút" amount={summary?.availableAmount} icon="↗" tone="emerald" loading={loading} />
      <SummaryCard label="Đang xử lý" amount={summary?.processingAmount} icon="◷" tone="navy" loading={loading} />
    </section>}
    {tab === "overview" && <><OrganizerFinanceAnalytics events={events} payouts={payouts} from={dateFrom} to={dateTo} period={period} loading={loading} error={dataError || analyticsError} onRangeChange={updateAnalyticsRange} />{summary?.updatedAt && <p className="text-right text-xs app-text-muted">Cập nhật số dư lúc {new Date(summary.updatedAt).toLocaleString("vi-VN")}</p>}</>}

    {tab === "overview" ? <><section className="overflow-hidden rounded-xl border app-border app-bg-card">
      <div className="border-b app-border px-4 pt-4">
        <h2 className="font-semibold app-text-main">Doanh thu theo sự kiện</h2>
        <div className="mt-3 flex gap-1 overflow-x-auto" role="tablist" aria-label="Lọc danh sách sự kiện">{([['all','Danh sách sự kiện'],['eligible','Có thể rút'],['processing','Đang xử lý']] as [EventFilter,string][]).map(([value,label]) => <button key={value} type="button" role="tab" aria-selected={filter === value} onClick={() => { updateSearch({ filter: value === "all" ? null : value, page: null }); setPage(1); }} className={`min-h-10 shrink-0 border-b-2 px-3 py-2 text-xs font-semibold ${filter === value ? "border-blue-600 text-blue-700" : "border-transparent app-text-muted"}`}>{label}{value !== "all" && <span className="ml-1 text-[10px]">({eventCounts[value]})</span>}</button>)}</div>
      </div>
      <div className="flex flex-col gap-3 border-b app-border p-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative"><FiSearch className="absolute left-3 top-3 app-text-muted" /><input value={query} onChange={e => { updateSearch({ q: e.target.value || null, page: null }); setPage(1); }} placeholder="Tìm tên hoặc mã sự kiện" className="h-10 w-full rounded-xl border app-border bg-white pl-9 pr-3 text-sm sm:w-64" /></label>
        <label className="flex items-center gap-2 text-xs font-semibold app-text-muted">Sắp xếp<select aria-label="Sắp xếp sự kiện" value={eventSort} onChange={e => setEventSort(e.target.value as EventSort)} className="h-10 rounded-xl border app-border bg-white px-3 text-sm app-text-main"><option value="recent">Mới nhất</option><option value="gross">Doanh thu cao nhất</option><option value="available">Số dư khả dụng cao nhất</option><option value="name">Tên sự kiện</option></select></label>
      </div>
      {dataError ? <ErrorBanner message={dataError} onRetry={() => void loadData()} /> : <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-zinc-50 text-xs font-semibold app-text-muted"><tr><th className="px-4 py-3">Sự kiện</th><th className="px-4 py-3">Doanh thu</th><th className="px-4 py-3">Đã chi trả</th><th className="px-4 py-3">Có thể rút</th><th className="px-4 py-3">Tình trạng</th><th className="px-4 py-3">Hành động</th></tr></thead>
          <tbody className="divide-y app-border">
            {loading ? <tr><td colSpan={6} className="p-8 text-center app-text-muted">Đang tải dữ liệu doanh thu…</td></tr> : paginatedEvents.length === 0 ? <tr><td colSpan={6} className="p-12 text-center"><FiInbox className="mx-auto mb-3 h-8 w-8 app-text-muted" /><p className="font-medium app-text-main">{events.length ? "Không có kết quả phù hợp" : "Chưa có dữ liệu đối soát"}</p><p className="mt-1 text-sm app-text-muted">{events.length ? "Thay đổi bộ lọc hoặc từ khóa tìm kiếm." : "Số liệu sẽ hiển thị khi dịch vụ đối soát cung cấp dữ liệu đã xác thực."}</p></td></tr> : paginatedEvents.map(event => <tr key={event.eventId} className="hover:bg-zinc-50">
              <td className="px-4 py-3"><div className="flex items-center gap-3">{event.imageUrl ? <img src={event.imageUrl} alt="" className="h-10 w-14 rounded-md object-cover" /> : <div className="h-10 w-14 rounded-md bg-zinc-100" />}<div><div className="font-semibold app-text-main">{event.eventName}</div><div className="text-xs app-text-muted">Kết thúc: {date(event.eventEndAt)}</div></div></div></td>
              <td className="px-4 py-3">{money(event.grossAmount)}</td><td className="px-4 py-3">{money(event.paidAmount)}</td><td className="px-4 py-3 font-semibold">{money(event.availableAmount)}</td>
              <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${canRequestEvent(event) ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>{canRequestEvent(event) ? "Có thể rút" : event.reason || reasonLabel(event.reasonCodes?.[0])}</span></td>
              <td className="px-4 py-3">{canRequestEvent(event) ? <button onClick={() => void openRequest(event.eventId)} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700">Rút tiền</button> : <button onClick={() => setEventDetails(event)} className="rounded-lg border app-border px-3 py-2 text-xs font-semibold text-blue-700">Xem chi tiết</button>}</td>
            </tr>)}
          </tbody>
        </table>
      </div>}
      {!dataError && <div className="border-t app-border p-3"><TablePagination currentPage={page} totalPages={Math.max(1, Math.ceil(filteredEvents.length / pageSize))} totalItems={filteredEvents.length} pageSize={pageSize} onPageChange={p => { setPage(p); updateSearch({ page: p > 1 ? p : null }); }} onPageSizeChange={size => { setPageSize(size); setPage(1); updateSearch({ page: null }); }} /></div>}
    </section>
    <Dialog.Root open={Boolean(eventDetails)} onOpenChange={open => { if (!open) setEventDetails(null); }}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" /><Dialog.Content className="finance-theme fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[min(92vw,480px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border app-border app-bg-card p-5 shadow-xl"><div className="flex items-start justify-between gap-4"><div><Dialog.Title className="text-lg font-bold app-text-main">Chi tiết doanh thu sự kiện</Dialog.Title><Dialog.Description className="mt-1 text-sm app-text-muted">Doanh thu, khoản khấu trừ và số dư của sự kiện.</Dialog.Description></div><Dialog.Close aria-label="Đóng chi tiết" className="rounded-lg p-2 app-text-muted hover:bg-slate-100"><FiX /></Dialog.Close></div>{eventDetails && <><div className="mt-4 flex items-center gap-3">{eventDetails.imageUrl ? <img src={eventDetails.imageUrl} alt="" className="h-12 w-16 rounded-md object-cover" /> : <div className="h-12 w-16 rounded-md bg-slate-100" />}<div><h3 className="font-semibold app-text-main">{eventDetails.eventName}</h3><p className="text-xs app-text-muted">Kết thúc: {date(eventDetails.eventEndAt)}</p></div></div><div className="mt-4 rounded-lg border app-border p-3"><MoneyRow label="Tổng doanh thu" value={String(eventDetails.grossAmount)} /><MoneyRow label="Phí nền tảng" value={String(eventDetails.platformFees ?? "")} /><MoneyRow label="Hoàn tiền" value={String(eventDetails.refunds ?? "")} /><MoneyRow label="Đã chi trả" value={String(eventDetails.paidAmount)} /><MoneyRow label="Đang giữ" value={String(eventDetails.heldAmount)} /><MoneyRow label="Có thể rút" value={String(eventDetails.availableAmount)} strong /></div><p className="mt-3 text-xs app-text-muted">Trạng thái: {eventDetails.settlementStatus || "Chưa có trạng thái"}{!canRequestEvent(eventDetails) && ` · ${eventDetails.reason || reasonLabel(eventDetails.reasonCodes[0])}`}</p></>}</Dialog.Content></Dialog.Portal></Dialog.Root></> : <section className="overflow-hidden rounded-xl border app-border app-bg-card">
      <div className="flex flex-col gap-3 border-b app-border p-4"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold app-text-main">Yêu cầu chi trả</h2><label className="relative"><FiSearch className="absolute left-3 top-3 app-text-muted" /><input value={payoutSearch} onChange={e => { setPayoutSearch(e.target.value); updateSearch({ q: e.target.value || null, page: null }); setPage(1); }} placeholder="Tìm mã yêu cầu hoặc sự kiện" className="h-10 w-full rounded-xl border app-border bg-white pl-9 pr-3 text-sm sm:w-72" /></label></div><div className="flex flex-wrap items-end gap-3"><label className="text-xs font-semibold app-text-muted">Trạng thái<select aria-label="Lọc trạng thái yêu cầu" value={payoutFilter} onChange={e => { updateSearch({ status: e.target.value === "ALL" ? null : e.target.value, page: null }); setPage(1); }} className="mt-1 block h-10 rounded-lg border app-border bg-white px-3 text-sm app-text-main"><option value="ALL">Tất cả trạng thái</option>{Object.entries(statusCopy).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="text-xs font-semibold app-text-muted">Từ ngày<input type="date" value={dateFrom} onChange={e => { updateSearch({ from: e.target.value || null, page: null }); setPage(1); }} className="mt-1 block h-10 rounded-lg border app-border bg-white px-3 text-sm app-text-main" /></label><label className="text-xs font-semibold app-text-muted">Đến ngày<input type="date" value={dateTo} onChange={e => { updateSearch({ to: e.target.value || null, page: null }); setPage(1); }} className="mt-1 block h-10 rounded-lg border app-border bg-white px-3 text-sm app-text-main" /></label></div></div>
      {dateFrom && dateTo && dateFrom > dateTo && <p role="alert" className="p-4 text-sm text-rose-700">Ngày bắt đầu phải bằng hoặc trước ngày kết thúc.</p>}
      {historyError ? <ErrorBanner message={historyError} onRetry={() => void loadData()} /> : <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className="bg-zinc-50 text-xs font-semibold app-text-muted"><tr><th className="px-4 py-3">Mã yêu cầu</th><th className="px-4 py-3">Loại</th><th className="px-4 py-3">Sự kiện</th><th className="px-4 py-3">Số tiền ròng</th><th className="px-4 py-3">Ngày gửi</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3">Chi tiết</th></tr></thead><tbody className="divide-y app-border">{loading ? <tr><td colSpan={7} className="p-8 text-center app-text-muted">Đang tải lịch sử…</td></tr> : paginatedPayouts.length === 0 ? <tr><td colSpan={7} className="p-12 text-center"><FiInbox className="mx-auto mb-3 h-8 w-8 app-text-muted" /><p className="font-medium app-text-main">Chưa có yêu cầu rút tiền</p></td></tr> : paginatedPayouts.map(p => <tr key={p.id}><td className="px-4 py-3 font-mono text-xs" title={p.id}>{p.id.slice(0, 8)}</td><td className="px-4 py-3">{p.requestType === "ADVANCE" ? "Tạm ứng (cũ)" : "Rút tiền"}</td><td className="px-4 py-3 font-medium">{p.eventName || "Sự kiện không xác định"}</td><td className="px-4 py-3 font-semibold">{money(p.netAmount)}</td><td className="px-4 py-3">{date(p.createdAt)}</td><td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle(payoutStatusGroup(p.status))}`}>{statusCopy[payoutStatusGroup(p.status)]}</span>{p.publicReason && <p className="mt-1 text-xs text-rose-700">{p.publicReason}</p>}</td><td className="px-4 py-3"><Link to={PATHS.FINANCE_WITHDRAWAL(p.id)} className="font-semibold text-blue-700 hover:underline">Xem chi tiết</Link></td></tr>)}</tbody></table></div>}
      {!historyError && <div className="border-t app-border p-3"><TablePagination currentPage={page} totalPages={Math.max(1, Math.ceil(filteredPayouts.length / pageSize))} totalItems={filteredPayouts.length} pageSize={pageSize} onPageChange={p => setPage(p)} onPageSizeChange={size => { setPageSize(size); setPage(1); }} /></div>}
    </section>}

    </div>
    <OrganizerFinanceReports events={events} payouts={payouts} series={reportAnalytics?.series || []} from={reportFrom} to={reportTo} refundDataAvailable={reportAnalytics?.refundDataAvailable ?? false} refundDataNote={reportAnalytics?.refundDataNote} loading={reportAnalyticsLoading || loading || (!reportAnalyticsError && (!reportAnalytics || loadedReportScope !== reportScope))} error={reportAnalyticsError || dataError || historyError} onRetry={() => { void loadReportAnalytics(); void loadData(); }} eventId={reportEventId} onEventChange={id => updateSearch({ reportEvent: id || null })} onRangeChange={(from, to) => updateSearch({ reportFrom: from, reportTo: to })} />
    <Dialog.Root open={dialogOpen} onOpenChange={open => {
      if (!submitting && !submitUncertain && !accountSaving) {
        if (!open) quoteRequestRef.current++;
        setDialogOpen(open);
      }
    }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/50" />
        <Dialog.Content className="finance-theme fixed left-1/2 top-1/2 z-[101] flex max-h-[90dvh] w-[calc(100%-24px)] max-w-[960px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border app-border app-bg-card shadow-xl focus:outline-none">
          <header className="flex shrink-0 items-start justify-between gap-4 border-b app-border p-5 sm:px-6">
            <div>
              <Dialog.Title className="text-xl font-bold app-text-main">{completed ? "Đã gửi yêu cầu rút tiền thành công!" : "Yêu cầu rút tiền"}</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm app-text-muted">
                {completed ? `Đã gửi ${sent.length} yêu cầu để HaloTicket xét duyệt.` : "Rút số dư khả dụng của các sự kiện đã kết thúc."}
              </Dialog.Description>
            </div>
            <Dialog.Close disabled={submitting || submitUncertain || accountSaving} className="rounded-lg p-2 app-text-muted hover:bg-slate-100 disabled:opacity-50" aria-label="Đóng hộp thoại"><FiX /></Dialog.Close>
          </header>
          {!completed && <div className="flex shrink-0 items-center gap-3 border-b app-border px-5 py-3 text-xs font-semibold sm:px-6">
            <StepCircle number={1} active complete={step > 1} /> <span>Chọn sự kiện</span>
            <StepConnector complete={step > 1} />
            <StepCircle number={2} active={step === 2} /> <span>Xác nhận rút tiền</span>
          </div>}
          <div className="min-h-0 overflow-y-auto p-5 sm:px-6">
            {step === 1 && <>
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <label className="relative min-w-48 flex-1">
                  <FiSearch className="absolute left-3 top-3 app-text-muted" />
                  <input aria-label="Tìm sự kiện" value={eventSearch} onChange={e => setEventSearch(e.target.value)} placeholder="Tìm sự kiện" className="h-10 w-full rounded-lg border app-border bg-white pl-9 pr-3 text-sm" />
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input type="checkbox" checked={allSelected} aria-checked={allSelected || (selectedEvents.length > 0 ? "mixed" : false)} disabled={eligibleLoading || !availableEvents.length}
                    onChange={() => setSelectedEventIds(allSelected ? [] : availableEvents.map(event => event.eventId))} />
                  Chọn tất cả ({availableEvents.length})
                </label>
              </div>
              {eligibleError && <ErrorBanner message={eligibleError} onRetry={() => void openRequest()} />}
              {eligibleLoading ? <p className="py-8 text-center app-text-muted">Đang tải điều kiện rút tiền…</p> :
                !eligibleEvents.length ? <p className="rounded-xl border app-border p-6 text-center">Chưa có sự kiện đủ điều kiện rút tiền</p> :
                <div className="grid gap-3 sm:grid-cols-2">
                  {[...eligibleEvents].sort((a, b) => Number(b.eligible) - Number(a.eligible))
                    .filter(event => event.eventName.toLocaleLowerCase("vi").includes(eventSearch.toLocaleLowerCase("vi")))
                    .map(event => {
                      const checked = selectedEventIds.includes(event.eventId) && event.eligible;
                      return <button type="button" key={event.eventId} aria-pressed={checked} disabled={!event.eligible}
                        onClick={() => setSelectedEventIds(ids => ids.includes(event.eventId) ? ids.filter(id => id !== event.eventId) : [...ids, event.eventId])}
                        className={`flex min-h-[72px] items-center gap-3 rounded-xl border p-3 text-left disabled:opacity-50 ${checked ? "border-blue-500 bg-blue-50" : "app-border"}`}>
                        {event.imageUrl ? <img src={event.imageUrl} alt="" className="h-11 w-14 shrink-0 rounded-md object-cover" /> : <div className="h-11 w-14 shrink-0 rounded-md bg-slate-100" />}
                        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{event.eventName}</span><span className="block text-xs app-text-muted">{date(event.eventEndAt)} · {event.eligible ? "Có thể rút" : reasonLabel(event.reasonCodes[0])}</span></span>
                        <span className="shrink-0 text-right text-xs font-bold text-emerald-700">{money(event.availableAmount)}<span aria-hidden="true" className="mt-1 block text-blue-600">{checked ? "☑" : "☐"}</span></span>
                      </button>;
                    })}
                </div>}
            </>}
            {step === 2 && <>
              {sent.length > 0 && <section className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <h3 className="mb-2 flex items-center gap-2 font-semibold text-emerald-800"><FiCheck /> Đã gửi {sent.length} yêu cầu</h3>
                {sent.map(({ eventId, payout }) => <div key={eventId} className="flex flex-wrap items-center justify-between gap-2 border-t border-emerald-200 py-2 text-sm">
                  <span className="font-medium">{eventName(eventId)}</span>
                  <span className="font-semibold text-emerald-700">{money(payout.netAmount)}</span>
                  <span className="flex flex-wrap items-center gap-3">
                    <button type="button" onClick={() => void copyRequestId(payout.id)} className="inline-flex items-center gap-1 text-xs" aria-label="Sao chép mã yêu cầu"><FiCopy />{copiedRequestId === payout.id ? "Đã sao chép" : payout.id.slice(0, 8)}</button>
                    <Link to={PATHS.FINANCE_WITHDRAWAL(payout.id)} className="font-semibold text-blue-700">Xem chi tiết yêu cầu</Link>
                  </span>
                </div>)}
              </section>}
              {!completed && <>
                {quoteError && <ErrorBanner message={quoteError} onRetry={() => void getQuote()} />}
                {!quotes.length && !quoteError && <p className="py-8 text-center app-text-muted">Đang tải số dư…</p>}
                {quotes.length > 0 && <div className="grid items-start gap-4 md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
                  <div className="space-y-3">
                    {quotes.filter(quote => pendingEvents.some(event => event.eventId === quote.eventId)).map(quote => {
                      const gross = Number(quote.grossAmount);
                      const rate = gross > 0 ? (Number(quote.deductions) / gross).toLocaleString("vi-VN", { style: "percent", maximumFractionDigits: 2 }) : "";
                      return <section key={quote.eventId} className="rounded-xl border app-border p-4">
                        <h3 className="mb-2 text-sm font-semibold">{eventName(quote.eventId)}</h3>
                        {!quote.eligible && <p role="alert" className="mb-2 text-sm text-rose-700">{quote.reasonCodes.map(reasonLabel).join(" · ") || "Yêu cầu hiện chưa đủ điều kiện."}</p>}
                        <MoneyRow label="Doanh thu đã thu" value={quote.grossAmount} />
                        <ReceiptRow label={`Khấu trừ${rate ? ` (${rate})` : ""}`} value={`−${money(quote.deductions)}`} valueClass="text-rose-700" />
                        <MoneyRow label="Dự kiến nhận" value={quote.expectedTransferAmount} strong />
                      </section>;
                    })}
                  </div>
                  <div className="space-y-3">
                    <section className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2">
                      <MoneyRow label="Tổng dự kiến nhận" value={totalExpected.toString()} strong />
                    </section>
                    <section className="rounded-xl border app-border p-4"><div className="flex items-center justify-between gap-2"><h3 className="text-sm font-semibold app-text-main">Tài khoản nhận tiền</h3><button disabled={submitting || submitUncertain || accountSaving} onClick={() => { setAccountForm({ bankName: account?.bankName || "", accountHolder: account?.accountHolder || "", accountNumber: "" }); setAccountSaveError(""); setAccountEditorOpen(value => !value); }} className="text-xs font-semibold text-blue-700">{accountEditorOpen ? "Đóng" : account ? "Thay đổi" : "Thêm tài khoản"}</button></div>{accountError ? <p className="mt-2 text-sm text-rose-700">Không tải được tài khoản: {accountError}</p> : account ? <p className="mt-2 text-sm app-text-muted">{account.bankName || "Ngân hàng chưa xác định"}<br />{account.accountHolder || "Chưa có tên chủ tài khoản"} · {account.accountNumberMasked || "••••"}<br />{account.verified ? "Đã xác minh" : "Chưa xác minh"}</p> : <p className="mt-2 text-sm app-text-muted">Chưa có tài khoản nhận tiền trên máy chủ.</p>}{accountEditorOpen && <div className="mt-3 space-y-3"><label className="block text-sm font-medium">Ngân hàng<input autoComplete="organization" value={accountForm.bankName} onChange={e => setAccountForm({ ...accountForm, bankName: e.target.value })} className="mt-1 h-10 w-full rounded-lg border app-border px-3" /></label><label className="block text-sm font-medium">Tên chủ tài khoản<input autoComplete="name" value={accountForm.accountHolder} onChange={e => setAccountForm({ ...accountForm, accountHolder: e.target.value })} className="mt-1 h-10 w-full rounded-lg border app-border px-3" /></label><label className="block text-sm font-medium">Số tài khoản<input autoComplete="off" inputMode="numeric" value={accountForm.accountNumber} onChange={e => setAccountForm({ ...accountForm, accountNumber: e.target.value })} className="mt-1 h-10 w-full rounded-lg border app-border px-3" /></label>{accountSaveError && <p role="alert" className="text-sm text-rose-700">{accountSaveError}</p>}<button onClick={() => void saveAccount()} disabled={accountSaving} className="min-h-10 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white disabled:opacity-50">{accountSaving ? "Đang lưu…" : "Lưu tài khoản"}</button></div>}</section>
                    <label className="flex items-start gap-2 rounded-xl border app-border p-3 text-sm">
                      <input type="checkbox" checked={confirmed} disabled={submitting} onChange={e => setConfirmed(e.target.checked)} className="mt-1" />
                      Tôi xác nhận thông tin tài khoản nhận tiền là chính xác.
                    </label>
                  </div>
                </div>}
                {submitError && <ErrorBanner message={submitError} onRetry={() => submitUncertain ? void submitRequest() : void getQuote()} />}
              </>}
            </>}
          </div>
          <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t app-border p-4 sm:px-6">
            {completed ? <button onClick={() => setDialogOpen(false)} className="ml-auto min-h-10 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white">Về tổng quan</button> : <>
              <button disabled={submitting || submitUncertain || accountSaving || sent.length > 0}
                onClick={() => { quoteRequestRef.current++; if (step === 1) setDialogOpen(false); else setStep(1); }}
                className="min-h-10 rounded-lg border app-border px-4 text-sm font-semibold disabled:opacity-50">
                {step === 1 ? "Hủy" : <><FiChevronLeft className="inline" /> Quay lại</>}
              </button>
              <div className="ml-auto flex flex-wrap items-center gap-3">
                {step === 1 ? <>
                  <span className="text-sm app-text-muted">Đã chọn {selectedEvents.length} sự kiện</span>
                  <button disabled={!selectedEvents.length || eligibleLoading} onClick={() => void getQuote()} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white disabled:opacity-50">Tiếp tục <FiChevronRight /></button>
                </> :
                  <button disabled={!readyToSubmit || Boolean(submitError && !submitUncertain)} onClick={() => void submitRequest()} className="min-h-10 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white disabled:opacity-50">
                    {submitting ? "Đang gửi…" : submitUncertain ? "Tra cứu / thử lại" : pendingEvents.length > 1 ? `Gửi ${pendingEvents.length} yêu cầu` : "Gửi yêu cầu"}
                  </button>}
              </div>
            </>}
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  </div></Dialog.Root>;
};

const SummaryCard = ({ label, amount, icon, tone, loading }: { label: string; amount?: string; icon: string; tone: "blue" | "emerald" | "navy"; loading: boolean }) => {
  const toneClasses = {
    blue: "bg-blue-50 text-blue-700",
    emerald: "bg-emerald-50 text-emerald-700",
    navy: "bg-slate-100 text-slate-800",
  }[tone];
  const valueClasses = { blue: "text-blue-700", emerald: "text-emerald-700", navy: "text-slate-900" }[tone];
  return <div className="rounded-xl border app-border app-bg-card p-4"><div className="flex items-center justify-between"><span className="text-sm app-text-muted">{label}</span><span className={`flex h-9 w-9 items-center justify-center rounded-lg font-bold ${toneClasses}`}>{icon}</span></div><div className={`mt-3 text-xl font-bold ${valueClasses}`}>{loading ? "Đang tải…" : amount === undefined ? "—" : money(amount)}</div></div>;
};
const ErrorBanner = ({ message, onRetry }: { message: string; onRetry: () => void }) => <div role="alert" className="m-4 flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 sm:flex-row sm:items-center sm:justify-between"><span className="flex items-start gap-2"><FiAlertCircle className="mt-0.5 shrink-0" />{message}</span><button onClick={onRetry} className="min-h-10 rounded-lg border border-rose-300 px-3 font-semibold">Thử lại</button></div>;
const StepCircle = ({ number, active, complete }: { number: number; active?: boolean; complete?: boolean }) => <span className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${complete ? "bg-emerald-500 text-white" : active ? "bg-blue-600 text-white" : "border app-border bg-white app-text-muted"}`}>{complete ? <FiCheckCircle aria-hidden="true" /> : number}</span>;
const StepConnector = ({ complete }: { complete?: boolean }) => <span className={`h-0.5 flex-1 ${complete ? "bg-emerald-400" : "bg-slate-200"}`} />;
const ReceiptRow = ({ label, value, valueClass = "app-text-main" }: { label: string; value: string; valueClass?: string }) => <div className="flex items-center justify-between gap-4 border-b border-slate-200/70 py-1.5 last:border-0"><span className="shrink-0 text-xs app-text-muted">{label}</span><span className={`min-w-0 break-words text-right text-sm font-semibold ${valueClass}`}>{value}</span></div>;
const MoneyRow = ({ label, value, strong }: { label: string; value: string; strong?: boolean }) => <div className="flex justify-between gap-3 py-1.5 text-sm"><span className="app-text-muted">{label}</span><span className={strong ? "font-bold text-emerald-700" : "font-medium app-text-main"}>{money(value)}</span></div>;

export default OrganizerFinance;
