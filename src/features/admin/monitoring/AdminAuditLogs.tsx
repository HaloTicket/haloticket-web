import { useEffect, useMemo, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiCopy,
  FiDownload,
  FiFileText,
  FiInfo,
  FiRefreshCw,
  FiSearch,
  FiPlay,
  FiPause,
  FiX,
  FiAlertCircle,
} from "react-icons/fi";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { CustomSelect } from "@/components/common/CustomSelect";
import { aiApi } from "@/services/aiApi";
import { toast } from "sonner";
import { resolveAiError, aiErrorMessage } from "@/utils/aiErrors";

const POLL_MS = 5000;
const MAX_BACKOFF_MS = 60000;
const MAX_LOGS = 500;

export interface AuditLogItem {
  id: string;
  time: string;
  service: string;
  event: string;
  status: "HEALTHY" | "WARN" | "INFO" | "ERROR";
  ipAddress?: string | null;
  operator?: string | null;
  endpoint?: string | null;
  details?: Record<string, unknown> | string;
}

export function AdminAuditLogs() {
  const { t, i18n } = useTranslation();
  const label = (vi: string, en: string) =>
    t(vi, { defaultValue: i18n.language.startsWith("en") ? en : vi });

  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRealtime, setIsRealtime] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedService, setSelectedService] = useState("ALL");
  const [filterMode, setFilterMode] = useState<"ALL" | "ERRORS_AND_WARNS" | "ERROR" | "WARN" | "HEALTHY">("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const failuresRef = useRef(0);
  const [sourceStatus, setSourceStatus] = useState<"ok" | "empty" | "unavailable" | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // fetch real logs from backend; returns true when the backend answered
  const fetchLogs = async (isInitial = false): Promise<boolean> => {
    if (isInitial) setIsLoading(true);
    try {
      const data = await aiApi.getSystemLogs();
      const mapped: AuditLogItem[] = data.entries.map((item) => {
        const status = item.status === "ERROR" || item.status === "WARN" ? item.status : "INFO";
        const time = item.time || "";
        const service = item.service || "";
        const event = item.event || "";
        return {
          // Stable id: the backend id, else derived from the entry itself so polling never duplicates rows.
          id: item.id || `${time}|${service}|${event}`,
          time,
          service,
          event,
          status,
          ipAddress: item.ipAddress ?? null,
          operator: item.operator ?? null,
          endpoint: item.endpoint ?? null,
          details: item.details || item.event,
        };
      });

      setLogs((prev) => {
        const incoming = new Map(mapped.map((m) => [m.id, m]));
        const kept = prev.filter((l) => !incoming.has(l.id));
        return [...mapped, ...kept].slice(0, MAX_LOGS);
      });
      setSourceStatus(data.source.status);
      setFetchError(null);
      failuresRef.current = 0;
      return true;
    } catch (err) {
      // keep the rows we already have, but say that the refresh failed
      failuresRef.current += 1;
      const info = resolveAiError(err);
      setFetchError(
        info.kind === "rate_limited"
          ? aiErrorMessage(info)
          : label("Không tải được nhật ký từ máy chủ.", "Could not load logs from the server.")
      );
      return false;
    } finally {
      if (isInitial) setIsLoading(false);
    }
  };

  // real-time polling: every 5 s, backing off after failures, paused while the tab is hidden
  useEffect(() => {
    let cancelled = false;
    const schedule = () => {
      if (cancelled || !isRealtime) return;
      const delay = Math.min(POLL_MS * 2 ** failuresRef.current, MAX_BACKOFF_MS);
      timerRef.current = setTimeout(tick, delay);
    };
    const tick = async () => {
      if (cancelled) return;
      if (typeof document !== "undefined" && document.hidden) {
        schedule();
        return;
      }
      await fetchLogs(false);
      schedule();
    };
    const onVisibility = () => {
      if (cancelled || !isRealtime || document.hidden) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      void tick();
    };
    void fetchLogs(true).then(schedule); // fetch immediately on mount with loading indicator
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRealtime]);

  // unique services
  const serviceOptions = useMemo(() => {
    const set = new Set(logs.map((l) => l.service));
    return ["ALL", ...Array.from(set)];
  }, [logs]);

  // counters
  const errorCount = useMemo(() => logs.filter((l) => l.status === "ERROR").length, [logs]);
  const warnCount = useMemo(() => logs.filter((l) => l.status === "WARN").length, [logs]);
  const healthyCount = useMemo(
    () => logs.filter((l) => l.status === "HEALTHY" || l.status === "INFO").length,
    [logs]
  );

  // filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch =
        !searchQuery.trim() ||
        log.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.event.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.operator && log.operator.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (log.endpoint && log.endpoint.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesService = selectedService === "ALL" || log.service === selectedService;

      let matchesStatus = true;
      if (filterMode === "ERRORS_AND_WARNS") {
        matchesStatus = log.status === "ERROR" || log.status === "WARN";
      } else if (filterMode === "ERROR") {
        matchesStatus = log.status === "ERROR";
      } else if (filterMode === "WARN") {
        matchesStatus = log.status === "WARN";
      } else if (filterMode === "HEALTHY") {
        matchesStatus = log.status === "HEALTHY" || log.status === "INFO";
      }

      return matchesSearch && matchesService && matchesStatus;
    });
  }, [logs, searchQuery, selectedService, filterMode]);

  // operator / endpoint are only shown when the source really provides them
  const showEndpoint = logs.some((l) => !!l.endpoint);
  const showOperator = logs.some((l) => !!l.operator);
  const columnCount = 6 + (showEndpoint ? 1 : 0) + (showOperator ? 1 : 0);

  const totalPages = Math.ceil(filteredLogs.length / pageSize) || 1;
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success("Đã sao chép nội dung log!");
  };

  const handleExportCSV = () => {
    const headers = ["Mã Log", "Thời Gian", "Dịch Vụ", "Nội Dung Sự Kiện", "Trạng Thái", "IP", "Người Thực Hiện", "Endpoint"];
    const rows = filteredLogs.map((l) => [
      l.id,
      `"${l.time}"`,
      `"${l.service}"`,
      `"${l.event.replace(/"/g, '""')}"`,
      l.status,
      l.ipAddress || "",
      l.operator || "",
      l.endpoint || "",
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Đã xuất file CSV thành công!");
  };

  const getStatusBadge = (status: AuditLogItem["status"]) => {
    switch (status) {
      case "ERROR":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <FiAlertCircle className="w-3 h-3" />
            <span>ERROR</span>
          </span>
        );
      case "WARN":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <FiAlertTriangle className="w-3 h-3" />
            <span>WARN</span>
          </span>
        );
      case "HEALTHY":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <FiCheckCircle className="w-3 h-3" />
            <span>HEALTHY</span>
          </span>
        );
      case "INFO":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <FiInfo className="w-3 h-3" />
            <span>INFO</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Title and Real-time Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b app-border pb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-bold app-text-main flex items-center gap-2">
              <FiFileText className="w-4 h-4 text-blue-500" />
              <span>{label("Nhật ký kiểm toán hệ thống (Audit Logs & Error Tracing)", "System Audit Logs & Error Tracing")}</span>
            </h2>
            {isRealtime ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {label("LIVE Real-time (5s)", "LIVE Real-time (5s)")}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 border app-border">
                {label("Tạm dừng", "Paused")}
              </span>
            )}
          </div>
          <p className="text-xs app-text-muted mt-1">
            {label("Theo dõi thời gian thực các sự kiện kiểm toán bảo mật, giao dịch bán vé và các log cảnh báo lỗi từ microservices", "Real-time auditing of security events, ticket transactions and microservice error traces")}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setIsRealtime(!isRealtime)}
            className={`inline-flex items-center min-h-9 gap-1.5 px-3 rounded-md text-xs font-semibold border app-border transition-colors cursor-pointer ${
              isRealtime
                ? "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200"
                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
            }`}
          >
            {isRealtime ? <FiPause className="w-3.5 h-3.5" /> : <FiPlay className="w-3.5 h-3.5" />}
            <span>{isRealtime ? label("Tạm dừng Realtime", "Pause Real-time") : label("Bật Realtime (5s)", "Enable Real-time (5s)")}</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center min-h-9.5 gap-2 px-3 text-xs font-semibold rounded-md border app-border app-bg-card hover:bg-slate-50 dark:hover:bg-slate-800 app-text-main transition-colors cursor-pointer shadow-xs disabled:opacity-60"
          >
            <FiDownload className="w-3.5 h-3.5" />
            <span>{label("Xuất CSV", "Export CSV")}</span>
          </button>

          <button
            type="button"
            onClick={async () => {
              setIsLoading(true);
              const ok = await fetchLogs();
              setIsLoading(false);
              if (ok) toast.success(label("Đã đồng bộ logs mới nhất!", "Synchronized latest logs!"));
              else toast.error(label("Không đồng bộ được logs. Vui lòng thử lại.", "Could not synchronize logs. Please try again."));
            }}
            disabled={isLoading}
            className="inline-flex items-center min-h-9 gap-1.5 px-3.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
          >
            <FiRefreshCw className={`w-3.5 h-3.5 ${isLoading ? "motion-safe:animate-spin" : ""}`} aria-hidden="true" />
            <span>{label("Làm mới", "Refresh")}</span>
          </button>
        </div>
      </div>

      {/* Real state of the log source and of the last refresh */}
      <div aria-live="polite" className="space-y-2 empty:hidden">
        {fetchError && (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 px-3 py-2 text-xs text-rose-700 dark:text-rose-300">
            <span>{fetchError}</span>
            <button
              type="button"
              onClick={() => { void fetchLogs(); }}
              className="px-2.5 py-1 rounded border border-rose-300 dark:border-rose-800 font-semibold cursor-pointer"
            >
              {label("Thử lại", "Retry")}
            </button>
          </div>
        )}
        {!fetchError && sourceStatus === "unavailable" && (
          <div role="status" className="rounded-md border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
            {label("Nguồn log không khả dụng", "Log source unavailable")}
          </div>
        )}
        {!fetchError && sourceStatus === "empty" && logs.length === 0 && (
          <div role="status" className="rounded-md border app-border app-bg-subnav px-3 py-2 text-xs app-text-muted">
            {label("Chưa có log", "No logs yet")}
          </div>
        )}
      </div>

      {/* Error & Warning Quick KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => {
            setFilterMode("ALL");
            setCurrentPage(1);
          }}
          className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
            filterMode === "ALL"
              ? "border-blue-500 ring-2 ring-blue-500/20 app-bg-card"
              : "app-border app-bg-subnav hover:border-slate-300 dark:hover:border-slate-700"
          }`}
        >
          <div className="text-[11px] font-bold app-text-muted uppercase">{label("Tổng số Logs", "Total Logs")}</div>
          <div className="text-xl font-black app-text-main mt-0.5">{logs.length}</div>
          <div className="text-[11px] text-blue-500 mt-1">{label("Toàn bộ luồng sự kiện", "All event streams")}</div>
        </button>

        <button
          type="button"
          onClick={() => {
            setFilterMode("ERROR");
            setCurrentPage(1);
          }}
          className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
            filterMode === "ERROR"
              ? "border-rose-500 ring-2 ring-rose-500/20 app-bg-card"
              : "app-border app-bg-subnav hover:border-slate-300 dark:hover:border-slate-700"
          }`}
        >
          <div className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase flex items-center gap-1">
            <FiAlertCircle className="w-3.5 h-3.5" /> {label("Lỗi (Errors)", "Errors")}
          </div>
          <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-0.5">
            {errorCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">{label("Lỗi cần xử lý ngay", "Critical errors")}</div>
        </button>

        <button
          type="button"
          onClick={() => {
            setFilterMode("WARN");
            setCurrentPage(1);
          }}
          className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
            filterMode === "WARN"
              ? "border-amber-500 ring-2 ring-amber-500/20 app-bg-card"
              : "app-border app-bg-subnav hover:border-slate-300 dark:hover:border-slate-700"
          }`}
        >
          <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase flex items-center gap-1">
            <FiAlertTriangle className="w-3.5 h-3.5" /> {label("Cảnh báo (Warnings)", "Warnings")}
          </div>
          <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
            {warnCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">{label("Độ trễ, timeout, rate-limit", "Latency, timeouts, limits")}</div>
        </button>

        <button
          type="button"
          onClick={() => {
            setFilterMode("HEALTHY");
            setCurrentPage(1);
          }}
          className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
            filterMode === "HEALTHY"
              ? "border-emerald-500 ring-2 ring-emerald-500/20 app-bg-card"
              : "app-border app-bg-subnav hover:border-slate-300 dark:hover:border-slate-700"
          }`}
        >
          <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase flex items-center gap-1">
            <FiCheckCircle className="w-3.5 h-3.5" /> {label("Khỏe mạnh (Healthy)", "Healthy")}
          </div>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
            {healthyCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">{label("Vận hành bình thường", "Normal operation")}</div>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="app-bg-card border app-border rounded-lg p-4 space-y-3 shadow-xs">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={label("Tìm kiếm mã log, lỗi, service, operator, endpoint...", "Search log ID, error, service, operator, endpoint...")}
              className="w-full pl-9 pr-3 min-h-9 text-xs rounded-md border app-border bg-slate-50 dark:bg-[#1E1E20] focus:bg-white dark:focus:bg-[#171719] outline-none focus:border-blue-500 transition-colors app-text-main"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter pills */}
            <div className="inline-flex rounded-md p-0.5 bg-slate-100 dark:bg-card border app-border text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setFilterMode("ALL");
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  filterMode === "ALL"
                    ? "bg-white dark:bg-[#2b2a29] text-blue-600 dark:text-blue-400 shadow-xs"
                    : "app-text-muted hover:app-text-main"
                }`}
              >
                {label("Tất cả", "All")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilterMode("ERRORS_AND_WARNS");
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  filterMode === "ERRORS_AND_WARNS"
                    ? "bg-white dark:bg-[#2b2a29] text-rose-600 dark:text-rose-400 shadow-xs font-bold"
                    : "app-text-muted hover:app-text-main"
                }`}
              >
                {label("Lỗi & Cảnh báo", "Errors & Warnings")} ({errorCount + warnCount})
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilterMode("ERROR");
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  filterMode === "ERROR"
                    ? "bg-white dark:bg-[#2b2a29] text-rose-600 dark:text-rose-400 shadow-xs"
                    : "app-text-muted hover:app-text-main"
                }`}
              >
                {label("Chỉ lỗi", "Errors only")} ({errorCount})
              </button>
            </div>

            {/* Service Filter */}
            <div className="w-40 shrink-0">
              <CustomSelect
                value={selectedService}
                onChange={(val) => {
                  setSelectedService(val);
                  setCurrentPage(1);
                }}
                options={serviceOptions.map((opt) => ({
                  value: opt,
                  label: opt === "ALL" ? label("Tất cả dịch vụ", "All services") : opt,
                }))}
              />
            </div>

            {(searchQuery || selectedService !== "ALL" || filterMode !== "ALL") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedService("ALL");
                  setFilterMode("ALL");
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1.5 text-xs text-blue-600 hover:text-blue-700 font-bold cursor-pointer"
              >
                {label("Đặt lại", "Reset")}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="app-bg-card border app-border rounded-lg shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b app-border app-text-muted font-bold text-[11px] uppercase tracking-wider bg-slate-50/50 dark:bg-slate-800/40">
                <th className="py-3 px-4">{label("Mã Log", "Log ID")}</th>
                <th className="py-3 px-4">{label("Thời gian", "Timestamp")}</th>
                <th className="py-3 px-4">{label("Dịch vụ", "Service")}</th>
                <th className="py-3 px-4">{label("Sự kiện / Lỗi chi tiết", "Event / Error Details")}</th>
                {showEndpoint && <th className="py-3 px-4">{label("Endpoint", "Endpoint")}</th>}
                {showOperator && <th className="py-3 px-4">{label("Người thực hiện", "Operator")}</th>}
                <th className="py-3 px-4">{label("Trạng thái", "Status")}</th>
                <th className="py-3 px-4 text-right">{label("Chi tiết", "Actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {isLoading && logs.length === 0 ? (
                <tr>
                  <td colSpan={columnCount} className="py-12 text-center app-text-muted">
                    <FiRefreshCw className="w-6 h-6 mx-auto mb-2 motion-safe:animate-spin text-blue-500" />
                    <p className="font-semibold text-xs">{label("Đang nạp nhật ký kiểm toán từ hệ thống...", "Loading audit logs from system...")}</p>
                  </td>
                </tr>
              ) : paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={columnCount} className="py-12 text-center app-text-muted">
                    <FiFileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    {logs.length === 0 ? (
                      <p className="font-semibold">
                        {fetchError
                          ? label("Chưa tải được nhật ký", "Logs could not be loaded")
                          : sourceStatus === "unavailable"
                            ? label("Nguồn log không khả dụng", "Log source unavailable")
                            : label("Chưa có log", "No logs yet")}
                      </p>
                    ) : (
                      <>
                        <p className="font-semibold">{label("Không tìm thấy nhật ký phù hợp", "No matching audit logs found")}</p>
                        <p className="text-[11px] mt-1">
                          {label("Thử thay đổi bộ lọc tìm kiếm hoặc từ khóa để hiển thị kết quả.", "Try adjusting your search filters or keywords.")}
                        </p>
                      </>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                      {log.id}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                      {log.time}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-bold app-text-main">{log.service}</span>
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <div className="truncate font-semibold app-text-main" title={log.event}>
                        {log.event}
                      </div>
                    </td>
                    {showEndpoint && (
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500 truncate max-w-[150px]">
                        {log.endpoint || "-"}
                      </td>
                    )}
                    {showOperator && (
                      <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                        {log.operator || "-"}
                      </td>
                    )}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {getStatusBadge(log.status)}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLog(log);
                        }}
                        className="px-2.5 py-1 text-[11px] font-bold rounded-md bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors"
                      >
                        {label("Xem", "View")}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredLogs.length > 0 && (
          <div className="p-4 border-t app-border flex items-center justify-between">
            <AdminPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredLogs.length}
              pageSize={pageSize}
              itemLabel={label("nhật ký", "logs")}
              onPageChange={(p) => setCurrentPage(p)}
              onPageSizeChange={(s) => {
                setPageSize(s);
                setCurrentPage(1);
              }}
            />
          </div>
        )}
      </div>

      {/* Log Details Modal / Drawer */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto app-bg-card border app-border rounded-lg shadow-2xl p-6 text-[var(--text-main)] space-y-4">
            <div className="flex items-center justify-between border-b app-border pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400">
                  {selectedLog.id}
                </span>
                {getStatusBadge(selectedLog.status)}
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="p-1 rounded-md border app-border hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-800/40 border app-border">
                <span className="text-slate-500 block mb-1 font-semibold">{label("Dịch vụ (Service)", "Service")}</span>
                <span className="font-bold text-sm app-text-main">{selectedLog.service}</span>
              </div>
              <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-800/40 border app-border">
                <span className="text-slate-500 block mb-1 font-semibold">{label("Thời gian ghi nhận", "Recorded Time")}</span>
                <span className="font-mono font-bold text-sm app-text-main">{selectedLog.time}</span>
              </div>
              <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-800/40 border app-border">
                <span className="text-slate-500 block mb-1 font-semibold">{label("Người thực hiện (Operator)", "Operator")}</span>
                <span className="font-mono font-bold app-text-main">{selectedLog.operator || "-"}</span>
              </div>
              <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-800/40 border app-border">
                <span className="text-slate-500 block mb-1 font-semibold">{label("Địa chỉ IP", "IP Address")}</span>
                <span className="font-mono font-bold app-text-main">{selectedLog.ipAddress || "-"}</span>
              </div>
            </div>

            {selectedLog.endpoint && (
              <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-800/40 border app-border text-xs">
                <span className="text-slate-500 block mb-1 font-semibold">{label("Endpoint / API Path", "Endpoint / API Path")}</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                  {selectedLog.endpoint}
                </span>
              </div>
            )}

            <div className="space-y-1.5 text-xs">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">
                {label("Nội dung sự kiện & Stack trace", "Event Details & Stack Trace")}
              </span>
              <div className="p-3.5 rounded-lg bg-slate-950 text-slate-100 font-mono text-[11px] leading-relaxed overflow-x-auto whitespace-pre-wrap border border-slate-800">
                {typeof selectedLog.details === "object"
                  ? JSON.stringify(selectedLog.details, null, 2)
                  : String(selectedLog.details || selectedLog.event || "")}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t app-border">
              <button
                type="button"
                onClick={() =>
                  handleCopy(
                    JSON.stringify(selectedLog, null, 2),
                    selectedLog.id
                  )
                }
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-md border app-border hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <FiCopy className="w-3.5 h-3.5" />
                <span>{copiedId === selectedLog.id ? label("Đã sao chép", "Copied") : label("Sao chép JSON log", "Copy JSON Log")}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 text-xs font-bold rounded-md bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
              >
                {label("Đóng", "Close")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminAuditLogs;
