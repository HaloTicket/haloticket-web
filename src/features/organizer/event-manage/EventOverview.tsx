import React, { useState } from "react";
import {
  FiTrendingUp,
  FiUsers,
  FiShoppingBag,
  FiEye,
  FiArrowUpRight,
} from "react-icons/fi";

export const EventOverview: React.FC = () => {
  const [timeRange, setTimeRange] = useState<"24h" | "30d">("30d");

  // sample data metrics for current event overview
  const totalRevenueTarget = 46050000;
  const currentRevenue = 12500000;
  const revenuePercent = Math.round((currentRevenue / totalRevenueTarget) * 100);

  const totalTicketsTarget = 2978;
  const currentTicketsSold = 820;
  const ticketsPercent = Math.round((currentTicketsSold / totalTicketsTarget) * 100);

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
            24 giờ
          </button>
          <button
            type="button"
            onClick={() => setTimeRange("30d")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${timeRange === "30d" ? "bg-blue-600 text-white shadow-xs" : "app-text-muted hover:app-text-main"
              }`}
          >
            30 ngày
          </button>
        </div>
      </div>

      {/* Top Ring Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Card 1: Revenue Ring Metric */}
        <div className="app-bg-card border app-border rounded-2xl p-5 shadow-xs flex items-center justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs font-extrabold app-text-muted uppercase tracking-wider">Doanh thu</p>
            <h3 className="text-2xl font-black text-blue-600 dark:text-blue-400">
              {currentRevenue.toLocaleString("vi-VN")} đ
            </h3>
            <p className="text-xs font-medium app-text-muted">
              Mục tiêu: <strong className="app-text-main">{totalRevenueTarget.toLocaleString("vi-VN")} đ</strong>
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
            <p className="text-xs font-extrabold app-text-muted uppercase tracking-wider">Số vé đã bán</p>
            <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {currentTicketsSold.toLocaleString("vi-VN")} vé
            </h3>
            <p className="text-xs font-medium app-text-muted">
              Tổng phát hành: <strong className="app-text-main">{totalTicketsTarget.toLocaleString("vi-VN")} vé</strong>
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
            <span>Lượt truy cập</span>
            <FiEye className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-xl font-black app-text-main">1,420</p>
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
            <FiArrowUpRight className="w-3 h-3" /> +12.5% so với kỳ trước
          </p>
        </div>

        <div className="app-bg-card border app-border rounded-xl p-4 space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-xs app-text-muted font-bold">
            <span>Người dùng</span>
            <FiUsers className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-xl font-black app-text-main">980</p>
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
            <FiArrowUpRight className="w-3 h-3" /> +8.3% người xem mới
          </p>
        </div>

        <div className="app-bg-card border app-border rounded-xl p-4 space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-xs app-text-muted font-bold">
            <span>Người mua</span>
            <FiShoppingBag className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-xl font-black app-text-main">412</p>
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
            <FiArrowUpRight className="w-3 h-3" /> +15% thanh toán hoàn tất
          </p>
        </div>

        <div className="app-bg-card border app-border rounded-xl p-4 space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-xs app-text-muted font-bold">
            <span>Tỉ lệ chuyển đổi</span>
            <FiTrendingUp className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-xl font-black app-text-main">42.04 %</p>
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
            <FiArrowUpRight className="w-3 h-3" /> Tăng trưởng ổn định
          </p>
        </div>
      </div>

      {/* Main Dual-Axis Interactive Trend Chart Card */}
      <div className="app-bg-card border app-border rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b app-border pb-3">
          <h3 className="text-xs font-extrabold app-text-main uppercase tracking-wider flex items-center gap-2">
            <FiTrendingUp className="w-4 h-4 text-blue-600" />
            <span>Tăng trưởng Doanh thu &amp; Vé bán theo thời gian</span>
          </h3>

          <div className="flex items-center gap-4 text-xs font-bold">
            <span className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
              <span className="w-3 h-3 rounded-full bg-purple-600 inline-block" />
              Doanh thu
            </span>
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
              Số vé bán
            </span>
          </div>
        </div>

        {/* Visual Dual Chart Bars */}
        <div className="h-64 pt-4 flex items-end justify-between gap-3 px-4 border-b app-border relative">
          {[
            { label: "Tuần 1", rev: 35, tickets: 40 },
            { label: "Tuần 2", rev: 60, tickets: 65 },
            { label: "Tuần 3", rev: 85, tickets: 90 },
            { label: "Tuần 4", rev: 45, tickets: 55 },
          ].map((bar, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
              <div className="w-full flex items-end justify-center gap-2 h-full max-w-[80px]">
                <div
                  style={{ height: `${bar.rev}%` }}
                  className="w-1/2 bg-purple-600 hover:bg-purple-500 rounded-t-lg transition-all duration-300 relative"
                  title={`Doanh thu: ${bar.rev}%`}
                />
                <div
                  style={{ height: `${bar.tickets}%` }}
                  className="w-1/2 bg-emerald-500 hover:bg-emerald-400 rounded-t-lg transition-all duration-300 relative"
                  title={`Vé bán: ${bar.tickets}%`}
                />
              </div>
              <span className="text-[11px] font-bold app-text-muted">{bar.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EventOverview;
