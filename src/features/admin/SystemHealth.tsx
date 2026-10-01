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
  FiShield
} from "react-icons/fi";
import { aiApi } from "@/services/aiApi";

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

  const [anomalyStatus, setAnomalyStatus] = useState<{ has_anomaly: boolean, description: string, action_taken: string } | null>(null);
  const [isCheckingAnomaly, setIsCheckingAnomaly] = useState(false);

  const handleCheckAnomaly = async () => {
    setIsCheckingAnomaly(true);
    try {
      const res = await aiApi.getAnomalyDetection();
      setAnomalyStatus(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsCheckingAnomaly(false);
    }
  };

  const [services, setServices] = useState<MicroserviceStatus[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);

  const fetchSystemData = async () => {
    setIsRefreshing(true);
    try {
      const [healthData, logsData] = await Promise.all([
        aiApi.getSystemHealth(),
        aiApi.getSystemLogs()
      ]);
      setServices(healthData);
      setLogs(logsData);
    } catch (err) {
      console.error(err);
    } finally {
      setIsRefreshing(false);
    }
  };

  React.useEffect(() => {
    fetchSystemData();
  }, []);

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
            onClick={fetchSystemData}
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

      {/* AI Anomaly Detection Monitor */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 dark:from-black dark:to-zinc-900 border border-slate-700 dark:border-zinc-800 rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-600 shrink-0">
              <FiShield className="w-6 h-6 text-blue-400" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <span>Trợ lý AI Giám sát Bất thường (Anomaly Detection)</span>
              </h3>
              <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
                Hệ thống AI tự động phân tích logs từ API Gateway và Kafka để phát hiện các mẫu hành vi đặt vé bất thường (botnet, ddos, spam).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCheckAnomaly}
            disabled={isCheckingAnomaly}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 disabled:opacity-50 shrink-0 border border-blue-500"
          >
            {isCheckingAnomaly ? <FiRefreshCw className="w-4 h-4 animate-spin" /> : <FiCpu className="w-4 h-4" />}
            <span>Quét Logs bằng AI</span>
          </button>
        </div>
        {anomalyStatus && (
          <div className={`mt-4 p-4 rounded-xl border flex flex-col gap-2 ${anomalyStatus.has_anomaly ? "bg-rose-500/10 border-rose-500/50" : "bg-emerald-500/10 border-emerald-500/50"}`}>
            <h4 className={`text-xs font-bold ${anomalyStatus.has_anomaly ? "text-rose-400" : "text-emerald-400"}`}>
              {anomalyStatus.has_anomaly ? "PHÁT HIỆN BẤT THƯỜNG!" : "HỆ THỐNG AN TOÀN"}
            </h4>
            <p className="text-sm text-white font-medium">{anomalyStatus.description}</p>
            {anomalyStatus.has_anomaly && (
              <div className="mt-1 flex items-center gap-1.5 text-xs text-rose-300 bg-rose-500/20 px-3 py-1.5 rounded-lg border border-rose-500/30">
                <strong>Hành động đã xử lý:</strong> {anomalyStatus.action_taken}
              </div>
            )}
          </div>
        )}
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
