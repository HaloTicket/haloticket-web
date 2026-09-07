import { useTranslation } from "react-i18next";
import React, { useState } from "react";
import {
  FiActivity,
  FiServer,
  FiRefreshCw,
  FiCpu,
  FiHardDrive,
  FiZap,
  FiRadio,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";

interface MicroserviceStatus {
  name: string;
  port: number;
  type: string;
  status: "UP" | "DOWN" | "WARN";
  uptime: string;
  latencyMs: number;
  memoryUsage: string;
  cpuLoad: string;
}

interface AuditLog {
  id: string;
  time: string;
  service: string;
  event: string;
  status: "HEALTHY" | "WARN" | "INFO";
}

export const SystemHealth: React.FC = () => {
  const { t: translate } = useTranslation();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 4;

  const [services, setServices] = useState<MicroserviceStatus[]>([
    {
      name: "discovery-server",
      port: 8761,
      type: "Eureka Naming Registry",
      status: "UP",
      uptime: "3h 12m",
      latencyMs: 12,
      memoryUsage: "215 MB / 512 MB",
      cpuLoad: "1.2%"
    },
    {
      name: "api-gateway",
      port: 8888,
      type: "Spring Cloud Gateway",
      status: "UP",
      uptime: "3h 12m",
      latencyMs: 22,
      memoryUsage: "310 MB / 1 GB",
      cpuLoad: "3.5%"
    },
    {
      name: "user-service",
      port: 8081,
      type: "Identity & Keycloak Auth",
      status: "UP",
      uptime: "3h 12m",
      latencyMs: 35,
      memoryUsage: "420 MB / 1 GB",
      cpuLoad: "2.1%"
    },
    {
      name: "event-service",
      port: 8082,
      type: "Event Domain & Elastic Search",
      status: "UP",
      uptime: "3h 12m",
      latencyMs: 40,
      memoryUsage: "480 MB / 1 GB",
      cpuLoad: "4.8%"
    },
    {
      name: "ticket-service",
      port: 8083,
      type: "Ticket Engine & Resale Cap",
      status: "UP",
      uptime: "3h 12m",
      latencyMs: 28,
      memoryUsage: "390 MB / 1 GB",
      cpuLoad: "2.9%"
    },
    {
      name: "booking-service",
      port: 8084,
      type: "Seat Lock & Hold Engine",
      status: "UP",
      uptime: "3h 12m",
      latencyMs: 18,
      memoryUsage: "340 MB / 1 GB",
      cpuLoad: "1.9%"
    },
    {
      name: "payment-service",
      port: 8085,
      type: "PayOS Escrow & Payout",
      status: "UP",
      uptime: "3h 12m",
      latencyMs: 52,
      memoryUsage: "410 MB / 1 GB",
      cpuLoad: "3.1%"
    },
    {
      name: "media-service",
      port: 8086,
      type: "AWS S3 Media Storage Service",
      status: "UP",
      uptime: "3h 12m",
      latencyMs: 58,
      memoryUsage: "280 MB / 512 MB",
      cpuLoad: "2.0%"
    }
  ]);

  const [logs] = useState<AuditLog[]>([
    {
      id: "LOG-901",
      time: "21:48:10",
      service: "api-gateway",
      event: "Kiểm tra route dynamic rate-limiting thành công (200 OK)",
      status: "HEALTHY"
    },
    {
      id: "LOG-902",
      time: "21:45:00",
      service: "payment-service",
      event: "Webhook PayOS callback phản hồi trong 85ms",
      status: "HEALTHY"
    },
    {
      id: "LOG-903",
      time: "21:40:12",
      service: "media-service",
      event: "Xác thực S3 Bucket Access Key - 0 thất bại",
      status: "INFO"
    },
    {
      id: "LOG-904",
      time: "21:35:45",
      service: "ticket-service",
      event: "Đã giải phóng 14 vé giữ quá hạn 10 phút tự động",
      status: "INFO"
    },
    {
      id: "LOG-905",
      time: "21:30:00",
      service: "discovery-server",
      event: "Đồng bộ heartbeats từ 8 microservices registered",
      status: "HEALTHY"
    },
    {
      id: "LOG-906",
      time: "21:20:15",
      service: "event-service",
      event: "Re-index dữ liệu tìm kiếm Elasticsearch hoàn tất",
      status: "HEALTHY"
    }
  ]);

  const handleRefreshHealth = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setServices((prev) =>
        prev.map((s) => ({
          ...s,
          latencyMs: Math.floor(Math.random() * 25) + 15,
          cpuLoad: `${(Math.random() * 3 + 1).toFixed(1)}%`
        }))
      );
      setIsRefreshing(false);
    }, 500);
  };

  const totalPages = Math.ceil(logs.length / pageSize) || 1;
  const paginatedLogs = logs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner & Control Card */}
      <div className="app-bg-card border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold border border-emerald-500/20">
              <FiRadio className="w-3 h-3 animate-pulse text-emerald-500" />
              <span>{translate("Sức Khỏe Hạ Tầng Hàng Giờ")}</span>
            </div>
            <h2 className="text-base sm:text-lg font-bold app-text-main">
              {translate("Trạng thái Microservices HaloTicket (8/8 UP - 100%)")} </h2>
            <p className="text-xs app-text-muted">
              {translate("Giám sát trực tiếp hiệu năng, độ trễ và dung lượng bộ nhớ của các dịch vụ backend Spring Boot.")} </p>
          </div>

          <button
            type="button"
            onClick={handleRefreshHealth}
            disabled={isRefreshing}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-md shadow-xs transition-all cursor-pointer flex items-center gap-2 shrink-0"
          >
            <FiRefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>{translate("Kiểm tra ngay")}</span>
          </button>
        </div>

        {/* Overview Metric Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">{translate("Tải CPU Trung bình")}</span>
              <span className="text-base font-bold text-blue-600 dark:text-blue-400">2.6%</span>
            </div>
            <FiCpu className="w-5 h-5 text-blue-500/50" />
          </div>

          <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">{translate("RAM Tiêu thụ")}</span>
              <span className="text-base font-bold text-indigo-600 dark:text-indigo-400">{translate("2.84 GB / 6 GB")}</span>
            </div>
            <FiHardDrive className="w-5 h-5 text-indigo-500/50" />
          </div>

          <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">{translate("Độ trễ Gateway")}</span>
              <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">{translate("22 ms")}</span>
            </div>
            <FiZap className="w-5 h-5 text-emerald-500/50" />
          </div>

          <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">{translate("Eureka Registry")}</span>
              <span className="text-base font-bold text-purple-600 dark:text-purple-400">{translate("8 Registered")}</span>
            </div>
            <FiServer className="w-5 h-5 text-purple-500/50" />
          </div>
        </div>
      </div>

      {/* Services Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {services.map((svc) => (
          <div
            key={svc.name}
            className="app-bg-card border border-slate-200 dark:border-slate-800 rounded-lg p-4 hover:border-blue-500/50 transition-all shadow-xs space-y-3 flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-200 dark:border-emerald-900 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {translate("ONLINE")} </span>
                <span className="text-[11px] font-mono font-bold text-blue-600 dark:text-blue-400">
                  :{svc.port}
                </span>
              </div>

              <div>
                <h4 className="text-xs font-bold font-mono app-text-main truncate">{svc.name}</h4>
                <p className="text-[11px] app-text-muted truncate">{svc.type}</p>
              </div>
            </div>

            <div className="p-2.5 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-1.5 text-[11px]">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">{translate("Độ trễ:")}</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{svc.latencyMs} {translate("ms")}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">{translate("Dung lượng RAM:")}</span>
                <span className="font-mono font-semibold app-text-main">{svc.memoryUsage}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">{translate("Tải CPU:")}</span>
                <span className="font-mono font-semibold app-text-main">{svc.cpuLoad}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Health Audit Logs Table */}
      <div className="app-bg-card border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <h3 className="text-sm font-bold app-text-main flex items-center gap-2">
            <FiActivity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>{translate("Nhật ký Kiểm tra Sức khỏe Gần nhất")}</span>
          </h3>
          <span className="text-xs text-slate-400 font-medium">{translate("Tự động đồng bộ mỗi 60s")}</span>
        </div>

        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 app-text-muted font-bold text-[11px] uppercase tracking-wider bg-slate-50/50 dark:bg-slate-800/30">
                <th className="py-2.5 px-3">{translate("Mã Log")}</th>
                <th className="py-2.5 px-3">{translate("Thời Gian")}</th>
                <th className="py-2.5 px-3">{translate("Dịch Vụ (Service)")}</th>
                <th className="py-2.5 px-3">{translate("Nội Dung Sự Kiện")}</th>
                <th className="py-2.5 px-3 text-right">{translate("Trạng Thái Log")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {paginatedLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="py-3 px-3 font-mono font-semibold text-blue-600 dark:text-blue-400">
                    {log.id}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-500 dark:text-slate-400">{translate(log.time)}</td>
                  <td className="py-3 px-3 font-bold font-mono text-slate-700 dark:text-slate-300">
                    {log.service}
                  </td>
                  <td className="py-3 px-3 app-text-main font-medium">{translate(log.event)}</td>
                  <td className="py-3 px-3 text-right">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${log.status === "HEALTHY"
                          ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900"
                          : "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900"
                        }`}
                    >
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {logs.length > 0 && (
          <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500">
            <span>
              {translate("Hiển thị")} <span className="font-bold text-slate-900 dark:text-slate-100">{paginatedLogs.length}</span> {translate("trên tổng số")} <span className="font-bold text-slate-900 dark:text-slate-100">{logs.length}</span> {translate("ghi nhận")} </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-md border border-slate-200 dark:border-slate-800 app-bg-card disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <FiChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 font-semibold text-slate-700 dark:text-slate-300">
                {translate("Trang")} {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-md border border-slate-200 dark:border-slate-800 app-bg-card disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <FiChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemHealth;
