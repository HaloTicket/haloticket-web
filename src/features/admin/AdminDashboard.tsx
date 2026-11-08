import { useTranslation } from "react-i18next";
import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PATHS } from "@/routes/paths";
import {
  FiCheckSquare,
  FiActivity,
  FiArrowUpRight,
  FiChevronRight,
  FiEye,
  FiRefreshCw,
  FiStar,
  FiLayers,
  FiCheckCircle,
  FiClock,
  FiUser
} from "react-icons/fi";
import { eventApi } from "@/services/eventApi";
import { venueApi } from "@/services/venueApi";
import { aiApi } from "@/services/aiApi";
import { getCachedUserProfile } from "@/services/userApi";
import { getLocale } from "@/i18n";
import { getAiErrorMessage } from "@/utils/aiErrors";
import { DashboardKpiGrid, AgreementCard } from "@/features/admin/components/DashboardKpiGrid";
import { AttentionFeed } from "@/features/admin/components/AttentionFeed";
import { PinnedReports } from "@/features/admin/components/PinnedReports";
import type { DashboardKpis, DashboardSummaryResponse } from "@/types/ai";

interface PendingEventItem {
  id: string;
  title: string;
  organizer: string;
  category: string;
  submittedAt: string;
  status: string;
  poster: string;
}

interface ActivityLogItem {
  id: string;
  user: string;
  action: string;
  time: string;
  timestamp: number;
  type: "success" | "warning" | "info";
}

const str = (v: unknown): string => (typeof v === "string" ? v : "");

const readActivityLogs = (): ActivityLogItem[] => {
  try {
    const saved = localStorage.getItem("admin_activity_logs");
    if (saved) {
      const parsed: unknown = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return (parsed as ActivityLogItem[]).slice(0, 5);
      }
    }
  } catch {
    // fallback
  }
  return [];
};

export const AdminDashboard: React.FC = () => {
  const { t: translate, i18n } = useTranslation();
  const label = (vi: string, en: string) => translate(vi, { defaultValue: i18n.language.startsWith("en") ? en : vi });
  const navigate = useNavigate();
  const profile = getCachedUserProfile();
  const adminName = profile?.fullName || profile?.email?.split("@")[0] || "Ban Quản Trị";

  // KPI cards come from the server; the summary paragraph exists only after the admin asks for it
  const [kpis, setKpis] = useState<DashboardKpis | null>(null);
  const [kpiState, setKpiState] = useState<"loading" | "ready" | "error">("loading");
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
  const [summaryState, setSummaryState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // real data states
  const [pendingEvents, setPendingEvents] = useState<PendingEventItem[]>([]);
  const [venuesCount, setVenuesCount] = useState<number>(0);
  const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>(readActivityLogs);

  // load Real Dashboard Stats
  const loadDashboardData = useCallback(async () => {
    try {
      // pending events
      const rawEvents = await eventApi.getApprovalEvents("PENDING");
      if (Array.isArray(rawEvents)) {
        const mapped: PendingEventItem[] = rawEvents.map((ev) => ({
          id: String(ev.id),
          title: str(ev.title) || "Sự kiện chưa đặt tên",
          organizer: str(ev.organizerName) || str(ev.author) || "Ban Tổ Chức",
          category: str(ev.categoryName) || str((ev.category as { name?: unknown } | null | undefined)?.name) || "Sự kiện",
          submittedAt: str(ev.submittedAt) || str(ev.createdAt) || new Date().toISOString(),
          status: String(ev.eventApprovalStatus || ev.eventStatus || "PENDING"),
          poster: str(ev.bannerUrl) || str(ev.thumbnailUrl) || str(ev.posterImage) || "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=600&q=80"
        }));
        setPendingEvents(mapped);
      }

      // venues count
      try {
        const venues = await venueApi.getVenues();
        if (Array.isArray(venues)) {
          setVenuesCount(venues.length);
        }
      } catch {
        // fallback
      }

      // activity Logs
      setActivityLogs(readActivityLogs());
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void loadDashboardData();
    });
  }, [loadDashboardData]);

  const loadKpis = useCallback(async () => {
    setKpiState("loading");
    try {
      setKpis(await aiApi.getDashboardKpis());
      setKpiState("ready");
    } catch (err) {
      console.error("Failed to load dashboard KPIs:", err);
      setKpiState("error");
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => { void loadKpis(); });
  }, [loadKpis]);

  const createSummary = async (refresh: boolean) => {
    setSummaryState("loading");
    setSummaryError(null);
    try {
      setSummary(await aiApi.getDashboardSummary(i18n.language.startsWith("en") ? "en" : "vi", refresh));
      setSummaryState("ready");
    } catch (err) {
      setSummaryError(getAiErrorMessage(err));
      setSummaryState("error");
    }
  };

  const summaryTime = summary?.created_at && Number.isFinite(new Date(summary.created_at).getTime())
    ? new Date(summary.created_at).toLocaleString(getLocale(), { dateStyle: "short", timeStyle: "short" })
    : "";

  const statCards = [
    {
      id: "venues-seatmaps",
      title: label("Địa điểm & SeatMap", "Venues & SeatMaps"),
      value: `${venuesCount} ${label("Địa điểm", "Venues")}`,
      change: label("Template & Sơ đồ sẵn sàng", "Templates & layouts ready"),
      changeType: "positive",
      icon: <FiLayers className="w-5 h-5 text-blue-500" />,
      bg: "bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-900",
      link: PATHS.ADMIN_VENUES_MANAGEMENT,
      badgeText: label("Quản lý", "Manage")
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Unified Hero Executive Banner */}
      <div className="p-6 md:p-8 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white shadow-xl relative overflow-hidden border border-blue-500/30 space-y-5">
        {/* Decorative background glow */}
        <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-blue-500/15 blur-3xl pointer-events-none" />
        <div className="absolute right-1/4 -bottom-20 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        {/* Top Header Row */}
        <div className="flex items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-bold tracking-wide">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              <FiActivity className="w-3.5 h-3.5" />
              <span>{translate("Hệ thống Quản trị HaloTicket Admin")}</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight leading-tight text-white">
              {translate("Chào mừng trở lại")}, <span className="bg-gradient-to-r from-blue-200 via-indigo-200 to-white bg-clip-text text-transparent">{adminName}</span>!
            </h2>
          </div>

          <button
            type="button"
            onClick={() => void createSummary(summaryState === "ready")}
            disabled={summaryState === "loading"}
            className="inline-flex min-h-9 shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-white/20 px-3 text-xs font-bold text-blue-100 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-60"
          >
            <FiRefreshCw className={`h-4 w-4 ${summaryState === "loading" ? "motion-safe:animate-spin" : ""}`} aria-hidden="true" />
            <span>{summaryState === "ready" ? translate("ai.dash.summary.recreate") : translate("ai.dash.summary.create")}</span>
          </button>
        </div>

        {/* Summary: created only on request, and shown only when its figures match the KPI data */}
        <div className="relative z-10 max-w-4xl space-y-2 text-xs leading-relaxed text-blue-100/90 md:text-sm" aria-live="polite">
          <p className="text-[11px] font-bold uppercase tracking-wider text-blue-300">{translate("ai.dash.summary.title")}</p>
          {summaryState === "idle" ? (
            <p>{translate("ai.dash.summary.hint")}</p>
          ) : summaryState === "loading" ? (
            <p role="status" className="flex items-center gap-2.5 py-1 text-blue-200"><FiRefreshCw className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />{translate("ai.dash.summary.loading")}</p>
          ) : summaryState === "error" ? (
            <div role="alert" className="space-y-1.5">
              <p className="font-semibold text-rose-200">{translate("ai.dash.summary.failed")} {summaryError}</p>
              <button type="button" onClick={() => void createSummary(false)} className="cursor-pointer rounded-md border border-white/30 px-3 py-1 font-bold text-white hover:bg-white/10">{translate("ai.action.retry")}</button>
            </div>
          ) : summary?.summary ? (
            <>
              {summary.summary.split("\n\n").map((paragraph, index) => <p key={index} data-testid="summary-text">{paragraph}</p>)}
              <p className="text-[11px] text-blue-300">{summary.cached ? translate("ai.dash.summary.cached", { time: summaryTime }) : translate("ai.dash.summary.fresh", { time: summaryTime })}</p>
            </>
          ) : (
            <p role="note" className="text-amber-200">{translate("ai.dash.summary.unverified")}</p>
          )}
        </div>

        {/* Unified Action Buttons */}
        <div className="relative z-10 flex flex-wrap items-center gap-3 pt-3 border-t border-white/10">
          <Link
            to={PATHS.ADMIN_EVENTS_APPROVAL}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <FiCheckSquare className="w-4 h-4" />
            <span>{translate("Duyệt Sự kiện ngay")}</span>
          </Link>
          <Link
            to={PATHS.ADMIN_VENUES_MANAGEMENT}
            className="px-4 py-2 bg-white/10 hover:bg-white/15 text-blue-100 hover:text-white text-xs font-bold rounded-xl transition-all border border-white/10 flex items-center gap-2"
          >
            <FiLayers className="w-4 h-4" />
            <span>{translate("Quản lý Địa điểm & SeatMap")}</span>
          </Link>
          <Link
            to={PATHS.ADMIN_SYSTEM_HEALTH}
            className="px-4 py-2 bg-white/10 hover:bg-white/15 text-blue-100 hover:text-white text-xs font-bold rounded-xl transition-all border border-white/10 flex items-center gap-2"
          >
            <FiActivity className="w-4 h-4" />
            <span>{translate("Giám sát Hệ thống")}</span>
          </Link>
        </div>
      </div>

      {/* KPI cards straight from the system */}
      <DashboardKpiGrid kpis={kpis} state={kpiState} onRetry={() => void loadKpis()} />

      {/* Configuration cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {statCards.map((card) => (
          <Link
            key={card.id}
            to={card.link}
            className="app-bg-card border border-slate-200 dark:border-slate-800 rounded-lg p-4 hover:border-blue-500 transition-all shadow-xs space-y-3 flex flex-col justify-between group cursor-pointer"
          >
            <div className="flex items-start justify-between">
              <div className={`p-2.5 rounded-md border ${card.bg} group-hover:scale-105 transition-transform`}>
                {card.icon}
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                {card.badgeText}
              </span>
            </div>

            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{card.title}</span>
              <div className="text-xl font-extrabold app-text-main tracking-tight flex items-baseline gap-2">
                <span>{card.value}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{card.change}</span>
              <FiArrowUpRight className="w-4 h-4 text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </Link>
        ))}
      </div>

      {/* Main Grid: Pending Events Queue & System Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 8 Cols: Real Pending Events Queue */}
        <div className="lg:col-span-8 space-y-6">
          <AttentionFeed />
          <div className="app-bg-card border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold app-text-main flex items-center gap-2">
                  <FiCheckSquare className="w-4 h-4 text-amber-500" />
                  <span>
                    {translate("Sự kiện đang chờ phê duyệt")} ({pendingEvents.length})
                  </span>
                </h3>
                <p className="text-xs app-text-muted mt-0.5">
                  {translate("Các yêu cầu tạo sự kiện mới gửi từ Ban Tổ Chức (Dữ liệu thời gian thực)")}
                </p>
              </div>

              <Link
                to={PATHS.ADMIN_EVENTS_APPROVAL}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                <span>{translate("Xem tất cả")}</span>
                <FiChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Pending List */}
            {pendingEvents.length === 0 ? (
              <div className="p-8 text-center space-y-2 text-xs app-text-muted">
                <FiCheckCircle className="w-8 h-8 text-emerald-500 mx-auto" />
                <p className="font-bold text-sm app-text-main">{translate("Không có sự kiện nào đang chờ duyệt")}</p>
                <p>{translate("Tất cả các sự kiện đã được kiểm duyệt hoặc phê duyệt.")}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingEvents.slice(0, 5).map((event) => (
                  <div
                    key={event.id}
                    className="p-3.5 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <img
                        src={event.poster}
                        alt={translate(event.title)}
                        className="w-14 h-14 rounded-md object-cover shrink-0 border border-slate-200 dark:border-slate-700 shadow-xs"
                      />
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 text-[10px] font-bold border border-amber-200 dark:border-amber-800">
                            {translate("Chờ duyệt")}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold truncate">
                            {translate(event.category)}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold app-text-main truncate">{translate(event.title)}</h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {translate("BTC:")} {translate(event.organizer)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-t-0 border-slate-200 dark:border-slate-800 pt-2 sm:pt-0">
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/events/approval/${event.id}`)}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-md shadow-xs transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                      >
                        <FiEye className="w-3.5 h-3.5" />
                        <span>{translate("Xem & Duyệt")}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 4 Cols: Quick Actions & Recent Admin Activity Log */}
        <div className="lg:col-span-4 space-y-6">
          <AgreementCard />
          {/* Quick Action Shortcuts */}
          <div className="app-bg-card border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-2">
              {translate("Tác vụ nhanh Admin")}
            </h3>

            <div className="space-y-2">
              <Link
                to={PATHS.ADMIN_EVENTS_APPROVAL}
                className="w-full p-2.5 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 hover:border-blue-500 transition-all flex items-center justify-between text-xs font-semibold app-text-main group cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <FiCheckSquare className="w-4 h-4 text-amber-500" />
                  <span>
                    {translate("Kiểm duyệt sự kiện")} ({pendingEvents.length})
                  </span>
                </div>
                <FiChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <Link
                to={PATHS.ADMIN_VENUES_MANAGEMENT}
                className="w-full p-2.5 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 hover:border-blue-500 transition-all flex items-center justify-between text-xs font-semibold app-text-main group cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <FiLayers className="w-4 h-4 text-blue-500" />
                  <span>{translate("Quản lý Địa điểm & SeatMap")}</span>
                </div>
                <FiChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <Link
                to={PATHS.ADMIN_AI_ANALYTICS}
                className="w-full p-2.5 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 hover:border-blue-500 transition-all flex items-center justify-between text-xs font-semibold app-text-main group cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <FiStar className="w-4 h-4 text-purple-500" />
                  <span>{translate("Phân tích & Đề xuất AI")}</span>
                </div>
                <FiChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <Link
                to={PATHS.ADMIN_SYSTEM_HEALTH}
                className="w-full p-2.5 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 hover:border-blue-500 transition-all flex items-center justify-between text-xs font-semibold app-text-main group cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <FiActivity className="w-4 h-4 text-indigo-500" />
                  <span>{translate("Kiểm tra Microservices")}</span>
                </div>
                <FiChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>

          {/* Activity Log Feed */}
          <div className="app-bg-card border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {translate("Nhật ký quản trị gần đây")}
              </h3>
              <FiClock className="w-3.5 h-3.5 text-slate-400" />
            </div>

            <div className="space-y-2">
              {activityLogs.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  <FiClock className="w-5 h-5 mx-auto mb-1.5 opacity-50" />
                  <p>{translate("Chưa có nhật ký hoạt động mới")}</p>
                </div>
              ) : (
                activityLogs.map((log) => (
                  <div
                    key={log.id}
                    className="text-xs space-y-1 p-2.5 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800"
                  >
                    <div className="flex items-center justify-between font-bold app-text-main">
                      <span className="flex items-center gap-1.5">
                        <FiUser className="w-3 h-3 text-blue-500" />
                        <span>{translate(log.user)}</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">{translate(log.time)}</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 leading-snug">{translate(log.action)}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <PinnedReports />
    </div>
  );
};

export default AdminDashboard;
