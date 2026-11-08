import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FiCheckCircle,
  FiCpu,
  FiRadio,
  FiRefreshCw,
  FiServer,
  FiZap,
  FiBell,
} from "react-icons/fi";
import { LuSearch } from "react-icons/lu";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { CustomSelect } from "@/components/common/CustomSelect";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { AdminAuditLogs } from "./monitoring/AdminAuditLogs";
import { UptimeMonitorSection } from "./monitoring/UptimeMonitorSection";
import { SslCertificateCard } from "./monitoring/SslCertificateCard";
import { AlertConfigModal } from "./monitoring/AlertConfigModal";
import { aiApi } from "@/services/aiApi";
import { toast } from "sonner";
import { AdminDataState } from "@/components/admin/AdminDataState";
import { resolveAiError, aiErrorMessage } from "@/utils/aiErrors";
import type { SystemServiceStatus } from "@/types/ai";

export type MicroserviceStatus = SystemServiceStatus;

const NO_DATA_VI = "Không có dữ liệu";

export function SystemHealth() {
  const { t, i18n } = useTranslation();
  const label = (vi: string, en: string) => t(vi, { defaultValue: i18n.language.startsWith("en") ? en : vi });
  const [isRefreshing, setIsRefreshing] = useState(false);
  // null = not loaded yet or failed: never substitute made-up services.
  const [services, setServices] = useState<MicroserviceStatus[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [showAlertModal, setShowAlertModal] = useState(false);
  const noData = label(NO_DATA_VI, "No data");

  /** Returns true only when the backend answered with a usable list. */
  const fetchSystemData = async (): Promise<boolean> => {
    setIsRefreshing(true);
    try {
      const data = await aiApi.getSystemHealth();
      setServices(data);
      setLoadError(null);
      setLastUpdated(new Date().toLocaleTimeString(i18n.language === "vi" ? "vi-VN" : "en-US"));
      return true;
    } catch (err) {
      setServices(null);
      const info = resolveAiError(err);
      setLoadError(
        info.kind === "rate_limited"
          ? aiErrorMessage(info)
          : label("Không tải được trạng thái hệ thống từ máy chủ.", "Could not load system status from the server.")
      );
      return false;
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    queueMicrotask(() => void fetchSystemData());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const list = services ?? [];
  const upCount = list.filter((s) => s.status === "UP").length;
  const latencies = list.map((s) => s.latencyMs).filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  const avgLatency = latencies.length ? Math.round(latencies.reduce((acc, v) => acc + v, 0) / latencies.length) : null;
  const cpuValues = list
    .map((s) => (s.cpuLoad ? parseFloat(s.cpuLoad.replace("%", "")) : NaN))
    .filter((v) => Number.isFinite(v));
  const avgCpu = cpuValues.length ? (cpuValues.reduce((acc, v) => acc + v, 0) / cpuValues.length).toFixed(1) : null;
  const upRate = list.length > 0 ? ((upCount / list.length) * 100).toFixed(0) + "%" : null;
  const allUp = list.length > 0 && upCount === list.length;

  const filteredServices = list.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <AdminPageHeader
        title={label("Giám sát dịch vụ hệ thống (System Monitoring)", "System Service Monitoring")}
        description={label(
          "Theo dõi thời gian thực tình trạng hoạt động, tài nguyên CPU, bộ nhớ RAM, độ trễ và nhật ký kiểm toán lỗi.",
          "Real-time monitoring of service status, CPU usage, RAM memory, latency, and audit error tracing."
        )}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {lastUpdated && (
              <span role="status" className="text-xs text-slate-500 font-medium mr-1">
                {label("Cập nhật: ", "Updated: ")} {lastUpdated}
              </span>
            )}
            <button
              type="button"
              onClick={() => setShowAlertModal(true)}
              className="inline-flex items-center min-h-9.5 gap-2 px-3 text-xs font-semibold rounded-md border app-border app-bg-card hover:bg-slate-50 dark:hover:bg-slate-800 app-text-main transition-colors cursor-pointer shadow-xs disabled:opacity-60"
            >
              <FiBell className="w-3.5 h-3.5 text-blue-500" />
              <span>{label("Cảnh báo Email / Telegram / Zalo", "Email / Telegram / Zalo Alerts")}</span>
            </button>
            <button
              type="button"
              onClick={async () => {
                const ok = await fetchSystemData();
                if (ok) toast.success(label("Đã đồng bộ trạng thái hệ thống mới nhất!", "System status synced."));
                else toast.error(label("Không đồng bộ được trạng thái hệ thống. Vui lòng thử lại.", "Could not sync system status. Please try again."));
              }}
              disabled={isRefreshing}
              className="inline-flex items-center min-h-9 gap-2 px-3.5 text-xs font-bold rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 cursor-pointer"
            >
              <FiRefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "motion-safe:animate-spin" : ""}`} aria-hidden="true" />
              <span>{label("Kiểm tra ngay", "Check Now")}</span>
            </button>
          </div>
        }
      />

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard
          title={label("Dịch vụ hoạt động", "Active Services")}
          value={list.length > 0 ? `${upCount} / ${list.length}` : "—"}
          subtext={
            list.length === 0 ? noData
              : allUp ? label("Tất cả dịch vụ đang hoạt động", "All services are up")
                : label(`${list.length - upCount} dịch vụ không hoạt động`, `${list.length - upCount} service(s) not up`)
          }
          icon={<FiCheckCircle className="w-4 h-4 text-emerald-500" />}
          iconBgColor="bg-emerald-500/10"
          valueColor={allUp ? "text-emerald-600 dark:text-emerald-400" : undefined}
        />
        <AdminStatCard
          title={label("Độ trễ trung bình", "Average Latency")}
          value={avgLatency === null ? noData : `${avgLatency} ms`}
          subtext={label("Phản hồi gateway & database", "Gateway & database response")}
          icon={<FiZap className="w-4 h-4 text-blue-500" />}
          iconBgColor="bg-blue-500/10"
          valueColor="text-blue-600 dark:text-blue-400"
        />
        <AdminStatCard
          title={label("Tải CPU trung bình", "Average CPU Load")}
          value={avgCpu === null ? noData : `${avgCpu}%`}
          subtext={label("Chỉ tính các dịch vụ có đo được", "Only services that report it")}
          icon={<FiCpu className="w-4 h-4 text-purple-500" />}
          iconBgColor="bg-purple-500/10"
        />
        <AdminStatCard
          title={label("Tỷ lệ dịch vụ sẵn sàng", "Services up")}
          value={upRate ?? noData}
          subtext={label("Tại thời điểm kiểm tra gần nhất", "At the most recent check")}
          icon={<FiRadio className="w-4 h-4 text-indigo-500" />}
          iconBgColor="bg-indigo-500/10"
        />
      </div>

      {/* SSL Certificate Monitoring Card */}
      <SslCertificateCard />

      {/* Uptime Monitors & SLA Chart */}
      {list.length > 0 && <UptimeMonitorSection services={list} />}

      {/* Microservices Grid */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold app-text-main flex items-center gap-2">
              <FiServer className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>{label("Danh sách Microservices HaloTicket", "HaloTicket Microservices List")}</span>
            </h3>
            <span className="text-xs app-text-muted mt-0.5 inline-block">
              {label("Đồng bộ định kỳ thời gian thực qua Eureka Naming Registry", "Real-time sync via Eureka Naming Registry")}
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder={label("Tìm service...", "Search service...")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 min-h-9 text-xs rounded-md border app-border bg-slate-50 dark:bg-[#1E1E20] focus:bg-white dark:focus:bg-[#171719] outline-none focus:border-blue-500 transition-colors app-text-main"
              />
            </div>
            <div className="w-32 shrink-0">
              <CustomSelect
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: "ALL", label: label("Tất cả", "All") },
                  { value: "UP", label: "UP" },
                  { value: "DOWN", label: "DOWN" },
                  { value: "UNKNOWN", label: "UNKNOWN" },
                ]}
              />
            </div>
          </div>
        </div>

        {isRefreshing && !services && <AdminDataState state="loading" />}
        {!isRefreshing && loadError && <AdminDataState state="error" message={loadError} onRetry={() => void fetchSystemData()} />}
        {!isRefreshing && !loadError && services && services.length === 0 && (
          <AdminDataState state="empty" message={label("Máy chủ chưa báo cáo dịch vụ nào.", "The server reported no services.")} />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredServices.map((svc) => (
            <div
              key={svc.name}
              className="app-bg-card border app-border rounded-lg p-4 shadow-xs hover:border-blue-500/40 transition-all flex flex-col justify-between space-y-3"
            >
              <div className="space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-xs font-bold app-text-main leading-tight">{svc.name}</h4>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                      svc.status === "UP"
                        ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                        : svc.status === "UNKNOWN"
                          ? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                          : "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        svc.status === "UP" ? "bg-emerald-500" : svc.status === "UNKNOWN" ? "bg-slate-400" : "bg-rose-500"
                      }`}
                    />
                    {svc.status}
                  </span>
                </div>
                <p className="text-[10px] font-mono app-text-muted">
                  Port: {svc.port ?? noData} · {svc.type}
                </p>
              </div>

              <div className="pt-2 border-t app-border grid grid-cols-3 gap-2 text-center text-[10px]">
                <div className="p-1.5 rounded bg-slate-50 dark:bg-slate-800/50 border app-border">
                  <span className="block app-text-muted">{label("Độ trễ", "Latency")}</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {svc.latencyMs === null || svc.latencyMs === undefined ? noData : `${svc.latencyMs}ms`}
                  </span>
                </div>
                <div className="p-1.5 rounded bg-slate-50 dark:bg-slate-800/50 border app-border">
                  <span className="block app-text-muted">RAM</span>
                  <span className="font-mono font-bold app-text-main">{svc.memoryUsage ?? noData}</span>
                </div>
                <div className="p-1.5 rounded bg-slate-50 dark:bg-slate-800/50 border app-border">
                  <span className="block app-text-muted">CPU</span>
                  <span className="font-mono font-bold app-text-main">{svc.cpuLoad ?? noData}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Real-time Audit Logs with Error & Warning Filtering */}
      <AdminAuditLogs />

      {/* Alert Configuration Modal */}
      <AlertConfigModal
        isOpen={showAlertModal}
        onClose={() => setShowAlertModal(false)}
      />
    </div>
  );
}

export default SystemHealth;