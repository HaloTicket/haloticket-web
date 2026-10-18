import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FiTrendingUp,
  FiUsers,
  FiShoppingBag,
  FiEye,
  FiArrowUpRight,
} from "react-icons/fi";
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

import { eventApi } from "@/services/eventApi";
import { useParams } from "react-router-dom";

export const EventOverview: React.FC = () => {
  const { t } = useTranslation();
  const { eventId } = useParams<{ eventId: string }>();
  const [timeRange, setTimeRange] = useState<"24h" | "30d">("30d");
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    if (!eventId) return;
    let isMounted = true;
    setIsLoading(true);
    
    eventApi.getEventAnalytics(eventId, timeRange).then((data) => {
      if (isMounted && data) {
        setAnalytics(data);
        setIsLoading(false);
      }
    }).catch(() => {
      if (isMounted) setIsLoading(false);
    });

    return () => { isMounted = false; };
  }, [eventId, timeRange]);

  const totalRevenueTarget = analytics?.totalRevenueTarget || 1;
  const currentRevenue = analytics?.currentRevenue || 0;
  let revenuePercent = Math.round((currentRevenue / totalRevenueTarget) * 100);
  if (revenuePercent > 100) revenuePercent = 100;
  if (totalRevenueTarget === 0) revenuePercent = 0;

  const totalTicketsTarget = analytics?.totalTicketsTarget || 1;
  const currentTicketsSold = analytics?.currentTicketsSold || 0;
  let ticketsPercent = Math.round((currentTicketsSold / totalTicketsTarget) * 100);
  if (ticketsPercent > 100) ticketsPercent = 100;
  if (totalTicketsTarget === 0) ticketsPercent = 0;

  if (isLoading) {
    return <div className="p-8 text-center app-text-muted text-sm font-bold">{t("Đang tải dữ liệu...")}</div>;
  }

  return (
    <div className="space-y-2 animate-in fade-in duration-200">
      {/* Top Filter Controls */}
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-1.5 app-bg-card p-1 rounded-xl border app-border shadow-xs">
          <button
            type="button"
            onClick={() => setTimeRange("24h")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${timeRange === "24h" ? "bg-blue-600 text-white shadow-xs" : "app-text-muted hover:app-text-main"
              }`}
          >
            {t("24 giờ")}
          </button>
          <button
            type="button"
            onClick={() => setTimeRange("30d")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${timeRange === "30d" ? "bg-blue-600 text-white shadow-xs" : "app-text-muted hover:app-text-main"
              }`}
          >
            {t("30 ngày")}
          </button>
        </div>
      </div>

      {/* Top Ring Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Card 1: Revenue Ring Metric */}
        <div className="app-bg-card border app-border rounded-2xl p-5 shadow-xs flex items-center justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs font-extrabold app-text-muted uppercase tracking-wider">{t("Doanh thu")}</p>
            <h3 className="text-2xl font-black text-blue-600 dark:text-blue-400">
              {currentRevenue.toLocaleString("vi-VN")} đ
            </h3>
            <p className="text-xs font-medium app-text-muted">
              {t("Mục tiêu")}: <strong className="app-text-main">{totalRevenueTarget.toLocaleString("vi-VN")} đ</strong>
            </p>
          </div>

          {/* Ring Chart Circle */}
          <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-200 dark:text-slate-800"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-amber-500 transition-all duration-1000 ease-out"
                strokeDasharray={`${revenuePercent}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute text-xs font-black text-amber-500">{revenuePercent}%</span>
          </div>
        </div>

        {/* Card 2: Tickets Sold Ring Metric */}
        <div className="app-bg-card border app-border rounded-2xl p-5 shadow-xs flex items-center justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs font-extrabold app-text-muted uppercase tracking-wider">{t("Số vé đã bán")}</p>
            <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {currentTicketsSold.toLocaleString("vi-VN")} {t("vé")}
            </h3>
            <p className="text-xs font-medium app-text-muted">
              {t("Tổng phát hành")}: <strong className="app-text-main">{totalTicketsTarget.toLocaleString("vi-VN")} {t("vé")}</strong>
            </p>
          </div>

          {/* Ring Chart Circle */}
          <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-200 dark:text-slate-800"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-emerald-500 transition-all duration-1000 ease-out"
                strokeDasharray={`${ticketsPercent}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute text-xs font-black text-emerald-500">{ticketsPercent}%</span>
          </div>
        </div>
      </div>

      {/* 4 Metric Quick Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="app-bg-card border app-border rounded-xl p-4 space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-xs app-text-muted font-bold">
            <span>{t("Lượt truy cập")}</span>
            <FiEye className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-xl font-black app-text-main">{analytics?.pageViews?.toLocaleString("vi-VN") || 0}</p>
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
            <FiArrowUpRight className="w-3 h-3" /> {t("Theo dõi lượt xem")}
          </p>
        </div>

        <div className="app-bg-card border app-border rounded-xl p-4 space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-xs app-text-muted font-bold">
            <span>{t("Người dùng")}</span>
            <FiUsers className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-xl font-black app-text-main">{analytics?.uniqueUsers?.toLocaleString("vi-VN") || 0}</p>
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
            <FiArrowUpRight className="w-3 h-3" /> {t("Người xem duy nhất")}
          </p>
        </div>

        <div className="app-bg-card border app-border rounded-xl p-4 space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-xs app-text-muted font-bold">
            <span>{t("Người mua")}</span>
            <FiShoppingBag className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-xl font-black app-text-main">{analytics?.buyers?.toLocaleString("vi-VN") || 0}</p>
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
            <FiArrowUpRight className="w-3 h-3" /> {t("Tài khoản đã thanh toán")}
          </p>
        </div>

        <div className="app-bg-card border app-border rounded-xl p-4 space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-xs app-text-muted font-bold">
            <span>{t("Tỉ lệ chuyển đổi")}</span>
            <FiTrendingUp className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-xl font-black app-text-main">{analytics?.conversionRate || 0} %</p>
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
            <FiArrowUpRight className="w-3 h-3" /> {t("Người mua / Người dùng")}
          </p>
        </div>
      </div>

      {/* Main Dual-Axis Interactive Trend Chart Card */}
      <div className="app-bg-card border app-border rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b app-border pb-3">
          <h3 className="text-xs font-extrabold app-text-main uppercase tracking-wider flex items-center gap-2">
            <FiTrendingUp className="w-4 h-4 text-blue-600" />
            <span>{t("Tăng trưởng Doanh thu & Vé bán theo thời gian")}</span>
          </h3>

          <div className="flex items-center gap-4 text-xs font-bold">
            <span className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
              <span className="w-3 h-3 rounded-full bg-purple-600 inline-block" />
              {t("Doanh thu")}
            </span>
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
              {t("Số vé bán")}
            </span>
          </div>
        </div>

        {/* Visual Dual Chart Bars via Recharts */}
        <div className="h-[300px] w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={analytics?.growthMetrics?.length > 0 ? analytics.growthMetrics : [
                { label: t("Tuần 1"), revPercent: 35, ticketsPercent: 40 },
                { label: t("Tuần 2"), revPercent: 60, ticketsPercent: 65 },
                { label: t("Tuần 3"), revPercent: 85, ticketsPercent: 90 },
                { label: t("Tuần 4"), revPercent: 45, ticketsPercent: 55 },
              ]}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.3} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                itemStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
              />
              <Bar dataKey="revPercent" name={t("Doanh thu (%)")} fill="#9333ea" radius={[4, 4, 0, 0]} maxBarSize={40} />
              <Bar dataKey="ticketsPercent" name={t("Số vé bán (%)")} fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
              <Line type="monotone" dataKey="revPercent" name={t("Đường tăng trưởng")} stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default EventOverview;
