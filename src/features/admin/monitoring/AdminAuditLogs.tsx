import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiCopy,
  FiDownload,
  FiFileText,
  FiFilter,
  FiInfo,
  FiRefreshCw,
  FiSearch,
  FiServer,
  FiShield,
  FiX,
} from "react-icons/fi";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { CustomSelect } from "@/components/common/CustomSelect";
import { aiApi } from "@/services/aiApi";

export interface AuditLogItem {
  id: string;
  time: string;
  service: string;
  event: string;
  status: "HEALTHY" | "WARN" | "INFO" | "ERROR";
  ipAddress?: string;
  operator?: string;
  details?: Record<string, unknown>;
}

export function AdminAuditLogs() {
  const { t, i18n } = useTranslation();
  const label = (vi: string, en: string) => t(vi, { defaultValue: i18n.language.startsWith("en") ? en : vi });
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedService, setSelectedService] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const data = await aiApi.getSystemLogs();
      if (Array.isArray(data) && data.length > 0) {
        const mapped: AuditLogItem[] = data.map((item: any, idx: number) => ({
          id: item.id || `LOG-${99000 - idx}`,
          time: item.time || new Date().toLocaleString("vi-VN"),
          service: item.service || "Microservice",
          event: item.event || "System operation event",
          status: (item.status as any) || "HEALTHY",
          ipAddress: item.ipAddress || "127.0.0.1",
          operator: item.operator || "system",
        }));
        setLogs(mapped);
      } else {
        setLogs([]);
      }
    } catch {
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const serviceOptions = useMemo(() => {
    const set = new Set(logs.map((l) => l.service));
    return ["ALL", ...Array.from(set)];
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch =
        !searchQuery.trim() ||
        log.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.event.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.operator && log.operator.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesService = selectedService === "ALL" || log.service === selectedService;
      const matchesStatus = selectedStatus === "ALL" || log.status === selectedStatus;

      return matchesSearch && matchesService && matchesStatus;
    });
  }, [logs, searchQuery, selectedService, selectedStatus]);

  const totalPages = Math.ceil(filteredLogs.length / pageSize) || 1;
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportCSV = () => {
    const headers = ["ID", "Time", "Service", "Event", "Status", "IP", "Operator"];
    const rows = filteredLogs.map((l) => [
      l.id,
      `"${l.time}"`,
      `"${l.service}"`,
      `"${l.event.replace(/"/g, '""')}"`,
      l.status,
      l.ipAddress || "",
      l.operator || "",
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
  };

  const getStatusBadge = (status: AuditLogItem["status"]) => {
    switch (status) {
      case "HEALTHY":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <FiCheckCircle className="w-3 h-3" />
            <span>HEALTHY</span>
          </span>
        );
      case "WARN":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <FiAlertTriangle className="w-3 h-3" />
            <span>WARN</span>
          </span>
        );
      case "ERROR":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <FiAlertTriangle className="w-3 h-3" />
            <span>ERROR</span>
          </span>
        );
      case "INFO":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <FiInfo className="w-3 h-3" />
            <span>INFO</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 mt-8 pt-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold app-text-main">{label("Nhật ký kiểm toán hệ thống (Audit Logs)", "System Audit Logs")}</h2>
          <p className="text-sm app-text-muted mt-1">{label("Theo dõi toàn diện lịch sử thao tác vận hành, sự kiện kiểm toán bảo mật và tương tác microservices.", "Comprehensive tracking of operation history, security audit events, and microservice interactions.")}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center min-h-10 gap-2 px-3.5 text-xs font-semibold rounded-md border app-border bg-white dark:bg-[#1E1E20] hover:bg-slate-100 dark:hover:bg-slate-800 app-text-main transition-colors"
          >
            <FiDownload className="w-3.5 h-3.5" />
            <span>{label("Xuất CSV", "Export CSV")}</span>
          </button>
          <button
            type="button"
            onClick={fetchLogs}
            disabled={isLoading}
            className="inline-flex items-center min-h-9 gap-2 px-3.5 text-xs font-semibold rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50"
          >
            <FiRefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>{label("Làm mới", "Refresh")}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="app-bg-card border app-border rounded-lg p-5 space-y-3 shadow-xs">
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
              placeholder={label("Tìm kiếm theo mã log, nội dung, dịch vụ...", "Search by log ID, content, service...")}
              className="w-full pl-9 pr-3 min-h-9 text-xs rounded-md border app-border bg-slate-50 dark:bg-[#1E1E20] focus:bg-white dark:focus:bg-[#171719] outline-none focus:border-blue-500 transition-colors app-text-main"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <FiFilter className="w-3.5 h-3.5" />
              <span>{label("Lọc theo:", "Filter by:")}</span>
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

            {/* Status Filter */}
            <div className="w-36 shrink-0">
              <CustomSelect
                value={selectedStatus}
                onChange={(val) => {
                  setSelectedStatus(val);
                  setCurrentPage(1);
                }}
                options={[
                  { value: "ALL", label: label("Tất cả trạng thái", "All statuses") },
                  { value: "HEALTHY", label: "HEALTHY" },
                  { value: "WARN", label: "WARN" },
                  { value: "INFO", label: "INFO" },
                  { value: "ERROR", label: "ERROR" },
                ]}
              />
            </div>

            {(searchQuery || selectedService !== "ALL" || selectedStatus !== "ALL") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedService("ALL");
                  setSelectedStatus("ALL");
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1.5 text-xs text-blue-600 hover:text-blue-700 font-semibold"
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
                <th className="py-3 px-4">{label("Thời gian", "Time")}</th>
                <th className="py-3 px-4">{label("Dịch vụ", "Service")}</th>
                <th className="py-3 px-4">{label("Nội dung sự kiện", "Event Content")}</th>
                <th className="py-3 px-4">{label("Người thực hiện", "Operator")}</th>
                <th className="py-3 px-4">{label("Trạng thái", "Status")}</th>
                <th className="py-3 px-4 text-right">{label("Thao tác", "Action")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center app-text-muted">
                    <FiFileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-semibold">{label("Không tìm thấy nhật ký phù hợp", "No matching audit logs found")}</p>
                    <p className="text-[11px] mt-1">
                      {label("Thử thay đổi bộ lọc tìm kiếm hoặc từ khóa để hiển thị kết quả.", "Try modifying search filters or keywords to show results.")}
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
                    <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                      {log.id}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {log.time}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 app-text-main border app-border">
                        <FiServer className="w-3 h-3 text-slate-400" />
                        {log.service}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium app-text-main max-w-md truncate">
                      {log.event}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-36">
                      {log.operator || "system"}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">{getStatusBadge(log.status)}</td>
                    <td
                      className="py-3 px-4 text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => handleCopy(log.id, log.id)}
                        className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 app-text-muted hover:app-text-main transition-colors inline-flex items-center gap-1"
                        title={label("Sao chép mã log", "Copy log ID")}
                      >
                        <FiCopy className="w-3.5 h-3.5" />
                        {copiedId === log.id && (
                          <span className="text-[10px] text-emerald-600 font-bold">
                            {label("Đã chép", "Copied")}
                          </span>
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {filteredLogs.length > 0 && (
          <div className="p-4 border-t app-border">
            <AdminPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredLogs.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setCurrentPage(1);
              }}
            />
          </div>
        )}
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="w-full max-w-xl app-bg-card border app-border rounded-2xl p-6 shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b app-border pb-3">
              <div className="flex items-center gap-2">
                <FiShield className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold app-text-main">
                  {label("Chi tiết bản ghi kiểm toán", "Audit Log Record Details")}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 app-text-muted"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border app-border bg-slate-50 dark:bg-slate-800/50">
                  <span className="block text-[11px] app-text-muted font-semibold">
                    {label("Mã định danh log", "Log ID")}
                  </span>
                  <span className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400">
                    {selectedLog.id}
                  </span>
                </div>
                <div className="p-3 rounded-lg border app-border bg-slate-50 dark:bg-slate-800/50">
                  <span className="block text-[11px] app-text-muted font-semibold">
                    {label("Thời gian ghi nhận", "Recorded Timestamp")}
                  </span>
                  <span className="font-mono font-bold app-text-main">{selectedLog.time}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border app-border bg-slate-50 dark:bg-slate-800/50">
                  <span className="block text-[11px] app-text-muted font-semibold">
                    {label("Dịch vụ phụ trách", "Responsible Service")}
                  </span>
                  <span className="font-bold app-text-main">{selectedLog.service}</span>
                </div>
                <div className="p-3 rounded-lg border app-border bg-slate-50 dark:bg-slate-800/50">
                  <span className="block text-[11px] app-text-muted font-semibold">
                    {label("Trạng thái", "Status")}
                  </span>
                  <div className="mt-1">{getStatusBadge(selectedLog.status)}</div>
                </div>
              </div>

              <div className="p-3 rounded-lg border app-border bg-slate-50 dark:bg-slate-800/50 space-y-1">
                <span className="block text-[11px] app-text-muted font-semibold">
                  {label("Nội dung sự kiện", "Event Description")}
                </span>
                <p className="font-medium app-text-main leading-relaxed">{selectedLog.event}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border app-border bg-slate-50 dark:bg-slate-800/50">
                  <span className="block text-[11px] app-text-muted font-semibold">
                    {label("Địa chỉ IP", "IP Address")}
                  </span>
                  <span className="font-mono app-text-main">{selectedLog.ipAddress || "N/A"}</span>
                </div>
                <div className="p-3 rounded-lg border app-border bg-slate-50 dark:bg-slate-800/50">
                  <span className="block text-[11px] app-text-muted font-semibold">
                    {label("Tác nhân thực hiện", "Operator / Performed by")}
                  </span>
                  <span className="font-mono app-text-main">{selectedLog.operator || "system"}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t app-border">
              <button
                type="button"
                onClick={() =>
                  handleCopy(
                    JSON.stringify(selectedLog, null, 2),
                    selectedLog.id
                  )
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border app-border app-bg-card hover:bg-[var(--bg-card-hover)] app-text-main"
              >
                <FiCopy className="w-3.5 h-3.5" />
                <span>
                  {copiedId === selectedLog.id
                    ? label("Đã sao chép JSON", "JSON Copied")
                    : label("Sao chép JSON", "Copy JSON")}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
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
