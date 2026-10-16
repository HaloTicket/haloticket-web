import { useEffect, useMemo, useState, useRef } from "react";
// import { useTranslation } from "react-i18next";
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

export interface AuditLogItem {
  id: string;
  time: string;
  service: string;
  event: string;
  status: "HEALTHY" | "WARN" | "INFO" | "ERROR";
  ipAddress?: string;
  operator?: string;
  endpoint?: string;
  details?: Record<string, unknown> | string;
}

export function AdminAuditLogs() {
  // const { t, i18n } = useTranslation();
  // const label = (vi: string, en: string) =>
  //   t(vi, { defaultValue: i18n.language.startsWith("en") ? en : vi });

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
  const timerRef = useRef<any>(null);

  // fetch real logs from backend
  const fetchLogs = async (isInitial = false) => {
    if (isInitial) setIsLoading(true);
    try {
      const data = await aiApi.getSystemLogs();
      if (Array.isArray(data)) {
        const mapped: AuditLogItem[] = data.map((item: any, idx: number) => ({
          id: item.id || `LOG-${Date.now().toString().slice(-6)}-${idx}`,
          time: item.time || new Date().toLocaleTimeString("vi-VN"),
          service: item.service || "microservice",
          event: item.event || "System event",
          status: (item.status as any) || "HEALTHY",
          ipAddress: item.ipAddress || "127.0.0.1",
          operator: item.operator || "system",
          endpoint: item.endpoint || "/api/v1/event",
          details: item.details || item.event,
        }));

        setLogs((prev) => {
          // merge unique logs
          const existingIds = new Set(prev.map((l) => l.id));
          const newItems = mapped.filter((m) => !existingIds.has(m.id));
          return [...newItems, ...prev];
        });
      }
    } catch {
      // keep existing logs
    } finally {
      if (isInitial) setIsLoading(false);
    }
  };

  // real-time polling timer (every 5 seconds)
  useEffect(() => {
    fetchLogs(true); // fetch immediately on mount with loading indicator
    if (!isRealtime) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      fetchLogs(false);
    }, 5000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
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
              <span>Nhật ký kiểm toán hệ thống (Audit Logs & Error Tracing)</span>
            </h2>
            {isRealtime ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                LIVE Real-time (5s)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 border app-border">
                Tạm dừng
              </span>
            )}
          </div>
          <p className="text-xs app-text-muted mt-1">
            Theo dõi thời gian thực các sự kiện kiểm toán bảo mật, giao dịch bán vé và các log cảnh báo lỗi từ microservices
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
            <span>{isRealtime ? "Tạm dừng Realtime" : "Bật Realtime (5s)"}</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center min-h-9 gap-1.5 px-3 rounded-md border app-border bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold app-text-main transition-colors cursor-pointer"
          >
            <FiDownload className="w-3.5 h-3.5" />
            <span>Xuất CSV</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsLoading(true);
              fetchLogs().finally(() => setIsLoading(false));
              toast.success("Đã đồng bộ logs mới nhất!");
            }}
            disabled={isLoading}
            className="inline-flex items-center min-h-9 gap-1.5 px-3.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
          >
            <FiRefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Làm mới</span>
          </button>
        </div>
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
          <div className="text-[11px] font-bold app-text-muted uppercase">Tổng số Logs</div>
          <div className="text-xl font-black app-text-main mt-0.5">{logs.length}</div>
          <div className="text-[11px] text-blue-500 mt-1">Toàn bộ luồng sự kiện</div>
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
            <FiAlertCircle className="w-3.5 h-3.5" /> Lỗi (Errors)
          </div>
          <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-0.5">
            {errorCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Lỗi cần xử lý ngay</div>
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
            <FiAlertTriangle className="w-3.5 h-3.5" /> Cảnh báo (Warnings)
          </div>
          <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
            {warnCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Độ trễ, timeout, rate-limit</div>
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
            <FiCheckCircle className="w-3.5 h-3.5" /> Khỏe mạnh (Healthy)
          </div>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
            {healthyCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Vận hành bình thường</div>
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
              placeholder="Tìm kiếm mã log, lỗi, service, operator, endpoint..."
              className="w-full pl-9 pr-3 min-h-9 text-xs rounded-md border app-border bg-slate-50 dark:bg-[#1E1E20] focus:bg-white dark:focus:bg-[#171719] outline-none focus:border-blue-500 transition-colors app-text-main"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter pills */}
            <div className="inline-flex rounded-md p-0.5 bg-slate-100 dark:bg-slate-800 border app-border text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setFilterMode("ALL");
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  filterMode === "ALL"
                    ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                    : "app-text-muted hover:app-text-main"
                }`}
              >
                Tất cả
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilterMode("ERRORS_AND_WARNS");
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  filterMode === "ERRORS_AND_WARNS"
                    ? "bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs font-bold"
                    : "app-text-muted hover:app-text-main"
                }`}
              >
                Lỗi & Cảnh báo ({errorCount + warnCount})
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilterMode("ERROR");
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  filterMode === "ERROR"
                    ? "bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs"
                    : "app-text-muted hover:app-text-main"
                }`}
              >
                Chỉ lỗi ({errorCount})
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
                  label: opt === "ALL" ? "Tất cả dịch vụ" : opt,
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
                Đặt lại
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
                <th className="py-3 px-4">Mã Log</th>
                <th className="py-3 px-4">Thời gian</th>
                <th className="py-3 px-4">Dịch vụ</th>
                <th className="py-3 px-4">Sự kiện / Lỗi chi tiết</th>
                <th className="py-3 px-4">Endpoint</th>
                <th className="py-3 px-4">Người thực hiện</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4 text-right">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {isLoading && logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center app-text-muted">
                    <FiRefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin text-blue-500" />
                    <p className="font-semibold text-xs">Đang nạp nhật ký kiểm toán từ hệ thống...</p>
                  </td>
                </tr>
              ) : paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center app-text-muted">
                    <FiFileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-semibold">Không tìm thấy nhật ký phù hợp</p>
                    <p className="text-[11px] mt-1">
                      Thử thay đổi bộ lọc tìm kiếm hoặc từ khóa để hiển thị kết quả.
                    </p>
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
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 truncate max-w-[150px]">
                      {log.endpoint || "N/A"}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                      {log.operator || "system"}
                    </td>
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
                        Xem
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
              itemLabel="nhật ký"
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
                <span className="text-slate-500 block mb-1 font-semibold">Dịch vụ (Service)</span>
                <span className="font-bold text-sm app-text-main">{selectedLog.service}</span>
              </div>
              <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-800/40 border app-border">
                <span className="text-slate-500 block mb-1 font-semibold">Thời gian ghi nhận</span>
                <span className="font-mono font-bold text-sm app-text-main">{selectedLog.time}</span>
              </div>
              <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-800/40 border app-border">
                <span className="text-slate-500 block mb-1 font-semibold">Người thực hiện (Operator)</span>
                <span className="font-mono font-bold app-text-main">{selectedLog.operator || "system"}</span>
              </div>
              <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-800/40 border app-border">
                <span className="text-slate-500 block mb-1 font-semibold">Địa chỉ IP</span>
                <span className="font-mono font-bold app-text-main">{selectedLog.ipAddress || "127.0.0.1"}</span>
              </div>
            </div>

            {selectedLog.endpoint && (
              <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-800/40 border app-border text-xs">
                <span className="text-slate-500 block mb-1 font-semibold">Endpoint / API Path</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                  {selectedLog.endpoint}
                </span>
              </div>
            )}

            <div className="space-y-1.5 text-xs">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">
                Nội dung sự kiện & Stack trace
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
                <span>{copiedId === selectedLog.id ? "Đã sao chép" : "Sao chép JSON log"}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 text-xs font-bold rounded-md bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminAuditLogs;
