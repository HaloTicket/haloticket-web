import React from 'react';
import {
  FiInfo,
  FiDollarSign,
  FiAlertTriangle,
  FiCheckCircle,
  FiLock,
  FiTool,
  FiPieChart,
} from 'react-icons/fi';
import type { Seat, SeatMapStatsProps } from '@/types/seating';

// seat map statistics component
export const SeatMapStats: React.FC<SeatMapStatsProps> = ({ seats, tiers = [], zones, compact }) => {
  const totalSeats = seats.length;
  const availableSeats = seats.filter((s) => s.status === 'available' || (s.status as string) === 'AVAILABLE').length;
  const reservedSeats = seats.filter((s) => s.status === 'reserved' || (s.status as string) === 'RESERVED').length;
  const soldSeats = seats.filter((s) => s.status === 'sold' || (s.status as string) === 'SOLD').length;
  const blockedSeats = seats.filter((s) => s.status === 'blocked' || (s.status as string) === 'BLOCKED').length;
  const maintenanceSeats = seats.filter((s) => s.status === 'maintenance' || (s.status as string) === 'MAINTENANCE').length;

  // find seat price helper
  const findSeatPrice = (seat: Seat) => {
    const tierId = seat.tierId || (zones && seat.zoneId ? zones[seat.zoneId]?.tierId : undefined);
    const tier = (tiers || []).find((t) => t.id === tierId || t.id === seat.tierId || t.id === seat.zoneId);
    if (tier) return tier.price;
    if (zones && seat.zoneId && zones[seat.zoneId]?.price != null) return zones[seat.zoneId].price || 0;
    return 0;
  };

  // calculate total potential revenue
  const totalPotentialRevenue = seats.reduce((acc, seat) => {
    if (seat.status === 'maintenance' || (seat.status as string) === 'MAINTENANCE' || seat.status === 'blocked' || (seat.status as string) === 'BLOCKED') return acc;
    return acc + findSeatPrice(seat);
  }, 0);

  // calculate sold revenue
  const currentSoldRevenue = seats.reduce((acc, seat) => {

    if (seat.status !== 'sold' && (seat.status as string) !== 'SOLD') return acc;
    return acc + findSeatPrice(seat);
  }, 0);

  if (compact) {
    return (
      <div className="flex items-center justify-between gap-4 px-5 py-3 rounded-2xl app-bg-card border app-border text-xs font-bold app-text-main shadow-xs flex-wrap">
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="app-text-muted font-medium">Sức chứa:</span>
            <span className="font-mono app-text-main text-sm font-extrabold">{totalSeats} ghế</span>
          </div>

          <div className="flex items-center gap-2">
            <FiCheckCircle className="w-4 h-4 text-emerald-500" />
            <span className="app-text-muted">Có sẵn:</span>
            <span className="font-mono text-emerald-500 font-extrabold">{availableSeats}</span>
          </div>

          {soldSeats > 0 && (
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span className="app-text-muted">Đã bán:</span>
              <span className="font-mono text-blue-600 dark:text-blue-400 font-extrabold">{soldSeats}</span>
            </div>
          )}

          {reservedSeats > 0 && (
            <div className="flex items-center gap-2">
              <FiLock className="w-3.5 h-3.5 text-amber-500" />
              <span className="app-text-muted">BTC giữ:</span>
              <span className="font-mono text-amber-500 font-extrabold">{reservedSeats}</span>
            </div>
          )}

          {maintenanceSeats > 0 && (
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-500">
              <FiAlertTriangle className="w-3.5 h-3.5" />
              <span>Bảo trì: {maintenanceSeats}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="app-text-muted font-medium">Doanh thu dự kiến:</span>
          <span className="font-mono text-emerald-600 dark:text-emerald-400 text-sm font-black bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/30">
            {totalPotentialRevenue.toLocaleString('vi-VN')} đ
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Revenue Potential Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-600/10 via-indigo-600/10 to-purple-600/10 border border-blue-500/20 space-y-2">
        <div className="flex items-center justify-between text-xs font-extrabold app-text-main">
          <span className="flex items-center gap-1.5 uppercase tracking-wider text-[11px] text-blue-600 dark:text-blue-400">
            <FiDollarSign className="w-4 h-4" />
            Doanh thu tiềm năng sơ đồ
          </span>
          <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-blue-600 text-white font-extrabold">
            100% Sức chứa
          </span>
        </div>
        <div className="text-xl font-extrabold font-mono text-emerald-500">
          {totalPotentialRevenue.toLocaleString('vi-VN')} đ
        </div>
        <div className="flex items-center justify-between text-[11px] app-text-muted font-semibold pt-1 border-t app-border">
          <span>Đã bán: {currentSoldRevenue.toLocaleString('vi-VN')} đ</span>
          <span>Tỷ lệ: {totalPotentialRevenue > 0 ? Math.round((currentSoldRevenue / totalPotentialRevenue) * 100) : 0}%</span>
        </div>
      </div>

      {/* Warning Banner if Maintenance seats exist */}
      {maintenanceSeats > 0 && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold flex items-start gap-2.5 shadow-xs">
          <FiAlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-500" />
          <div>
            <div className="font-extrabold">Phát hiện {maintenanceSeats} ghế bảo trì / hư hỏng</div>
            <p className="text-[11px] opacity-90 font-medium mt-0.5">
              Ghế bảo trì sẽ bị khóa hoàn toàn trên trang đặt vé để bảo đảm trải nghiệm khán giả.
            </p>
          </div>
        </div>
      )}

      {/* Main Capacity Stats */}
      <div className="p-5 rounded-2xl app-bg-card border app-border space-y-4 shadow-xs">
        <h3 className="text-xs font-extrabold app-text-main uppercase tracking-wider flex items-center gap-2">
          <FiInfo className="text-blue-600" />
          <span>Sức chứa & Trạng thái ghế</span>
        </h3>

        <div className="space-y-2.5 text-xs">
          <div className="flex justify-between py-1.5 border-b app-border">
            <span className="app-text-muted font-medium flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
              Tổng số ghế trên sơ đồ:
            </span>
            <span className="font-extrabold font-mono app-text-main text-sm">{totalSeats}</span>
          </div>

          <div className="flex justify-between py-1.5 border-b app-border">
            <span className="app-text-muted font-medium flex items-center gap-2">
              <FiCheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              Đang mở bán (Available):
            </span>
            <span className="font-bold font-mono text-emerald-500">{availableSeats}</span>
          </div>

          <div className="flex justify-between py-1.5 border-b app-border">
            <span className="app-text-muted font-medium flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px] font-bold">✓</span>
              Đã bán (Sold):
            </span>
            <span className="font-bold font-mono text-blue-600 dark:text-blue-400">{soldSeats}</span>
          </div>

          <div className="flex justify-between py-1.5 border-b app-border">
            <span className="app-text-muted font-medium flex items-center gap-2">
              <FiLock className="w-3.5 h-3.5 text-amber-500" />
              Giữ chỗ Ban tổ chức (Reserved):
            </span>
            <span className="font-bold font-mono text-amber-500">{reservedSeats}</span>
          </div>

          <div className="flex justify-between py-1.5 border-b app-border">
            <span className="app-text-muted font-medium flex items-center gap-2">
              <FiTool className="w-3.5 h-3.5 text-rose-500" />
              Hư hỏng / Bảo trì (Maintenance):
            </span>
            <span className="font-bold font-mono text-rose-500">{maintenanceSeats}</span>
          </div>

          <div className="flex justify-between py-1.5">
            <span className="app-text-muted font-medium flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded bg-slate-700 text-slate-300 flex items-center justify-center text-[9px]">x</span>
              Tạm khóa (Blocked):
            </span>
            <span className="font-bold font-mono text-slate-400">{blockedSeats}</span>
          </div>
        </div>
      </div>

      {/* Tier Distribution Breakdown */}
      <div className="p-5 rounded-2xl app-bg-card border app-border space-y-3.5 shadow-xs">
        <h3 className="text-xs font-extrabold app-text-main uppercase tracking-wider flex items-center gap-2">
          <FiPieChart className="text-blue-600" />
          <span>Phân bổ theo Hạng vé</span>
        </h3>

        <div className="space-y-2 text-xs">
          {tiers.map((tier) => {
            const count = seats.filter((s) => s.tierId === tier.id || s.zoneId === tier.id).length;
            const pct = totalSeats > 0 ? Math.round((count / totalSeats) * 100) : 0;
            return (
              <div key={tier.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: tier.color }} />
                    <span className="app-text-main">{tier.name}</span>
                  </span>
                  <span className="app-text-muted font-mono">{count} ghế ({pct}%)</span>
                </div>
                <div className="w-full h-1.5 rounded-full app-bg-main overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, backgroundColor: tier.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
