import React, { useState } from 'react';
import {
  FiSave,
  FiRotateCcw,
  FiPlus,
  FiInfo,
  FiCheckCircle,
  FiLock,
  FiLayers,
  FiMaximize2
} from 'react-icons/fi';
import type { SeatTier, Seat } from '@/types';

const DEFAULT_TIERS: SeatTier[] = [
  { id: 'tier-vip', name: 'VIP Diamond', price: 1500000, color: 'bg-amber-500 text-amber-950 border-amber-400' },
  { id: 'tier-gold', name: 'Vé Gold', price: 950000, color: 'bg-purple-500 text-purple-950 border-purple-400' },
  { id: 'tier-std', name: 'Thường (Standard)', price: 450000, color: 'bg-blue-500 text-blue-950 border-blue-400' },
];

const GENERATE_INITIAL_SEATS = (): Seat[] => {
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  const cols = 12;
  const seats: Seat[] = [];

  rows.forEach((row, rowIndex) => {
    for (let c = 1; c <= cols; c++) {
      let tierId = 'tier-std';
      if (rowIndex < 2) tierId = 'tier-vip';
      else if (rowIndex < 4) tierId = 'tier-gold';

      let status: Seat['status'] = 'AVAILABLE';
      if (row === 'A' && (c === 5 || c === 6)) status = 'RESERVED';
      if (row === 'C' && c <= 4) status = 'SOLD';

      seats.push({
        id: `${row}${c}`,
        row,
        col: c,
        tierId,
        status,
      });
    }
  });

  return seats;
};

export const EventSeatingMap: React.FC = () => {
  const [tiers] = useState<SeatTier[]>(DEFAULT_TIERS);
  const [seats, setSeats] = useState<Seat[]>(GENERATE_INITIAL_SEATS());
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [selectedTierId, setSelectedTierId] = useState<string>('tier-vip');
  const [activeAction, setActiveAction] = useState<'SELECT' | 'CHANGE_TIER' | 'BLOCK' | 'RESERVE'>('SELECT');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSeatClick = (seat: Seat) => {
    setSelectedSeat(seat);

    if (activeAction === 'CHANGE_TIER') {
      setSeats((prev) =>
        prev.map((s) => (s.id === seat.id ? { ...s, tierId: selectedTierId } : s))
      );
    } else if (activeAction === 'BLOCK') {
      setSeats((prev) =>
        prev.map((s) =>
          s.id === seat.id
            ? { ...s, status: s.status === 'BLOCKED' ? 'AVAILABLE' : 'BLOCKED' }
            : s
        )
      );
    } else if (activeAction === 'RESERVE') {
      setSeats((prev) =>
        prev.map((s) =>
          s.id === seat.id
            ? { ...s, status: s.status === 'RESERVED' ? 'AVAILABLE' : 'RESERVED' }
            : s
        )
      );
    }
  };

  const handleSave = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleReset = () => {
    if (confirm('Đặt lại sơ đồ ghế về trạng thái ban đầu?')) {
      setSeats(GENERATE_INITIAL_SEATS());
    }
  };

  // Stats calculation
  const totalSeats = seats.length;
  const availableSeats = seats.filter((s) => s.status === 'AVAILABLE').length;
  const soldSeats = seats.filter((s) => s.status === 'SOLD').length;
  const reservedSeats = seats.filter((s) => s.status === 'RESERVED').length;
  const blockedSeats = seats.filter((s) => s.status === 'BLOCKED').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Action Controls Bar */}
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl app-bg-card border app-border app-text-muted hover:app-text-main text-xs font-bold transition-colors cursor-pointer"
        >
          <FiRotateCcw className="w-4 h-4" />
          <span>Đặt lại</span>
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl shadow-xs transition-all cursor-pointer"
        >
          <FiSave className="w-4 h-4" />
          <span>{saveSuccess ? 'Đã lưu sơ đồ!' : 'Lưu thay đổi sơ đồ'}</span>
        </button>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center gap-2 text-xs font-bold">
          <FiCheckCircle className="w-5 h-5 flex-shrink-0" />
          <span>Sơ đồ ghế đã được cập nhật thành công và đồng bộ với cổng đặt vé!</span>
        </div>
      )}

      {/* Main Grid Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Visual Seating Canvas (3 cols) */}
        <div className="lg:col-span-3 p-6 rounded-2xl app-bg-card border app-border space-y-6 flex flex-col justify-between min-h-[500px]">
          {/* Top STAGE Banner */}
          <div className="w-full max-w-xl mx-auto py-3 bg-gradient-to-r from-blue-900/60 via-indigo-900/80 to-blue-900/60 border border-blue-500/30 rounded-2xl text-center text-xs tracking-widest font-bold text-blue-200 uppercase shadow-inner">
            SÂN KHẤU CHÍNH / STAGE
          </div>

          {/* Seat Grid Layout */}
          <div className="overflow-x-auto py-4 flex justify-center">
            <div className="inline-grid gap-2.5">
              {['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((rowLabel) => {
                const rowSeats = seats.filter((s) => s.row === rowLabel);
                return (
                  <div key={rowLabel} className="flex items-center gap-2">
                    <span className="w-6 text-center text-xs font-bold font-mono app-text-muted">
                      {rowLabel}
                    </span>
                    <div className="flex items-center gap-2">
                      {rowSeats.map((seat) => {
                        const tier = tiers.find((t) => t.id === seat.tierId);
                        const seatBg = tier?.color || 'bg-slate-700 text-white';
                        const isBlocked = seat.status === 'BLOCKED';
                        const isSold = seat.status === 'SOLD';
                        const isReserved = seat.status === 'RESERVED';

                        return (
                          <button
                            key={seat.id}
                            onClick={() => handleSeatClick(seat)}
                            disabled={isSold}
                            className={`w-9 h-9 rounded-lg font-mono text-xs font-bold flex items-center justify-center transition-all duration-150 relative group ${
                              isSold
                                ? 'bg-slate-700/40 text-slate-500 cursor-not-allowed border border-slate-700'
                                : isBlocked
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                                : isReserved
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 ring-2 ring-amber-500/30'
                                : `${seatBg} hover:scale-110 shadow-md`
                            } ${
                              selectedSeat?.id === seat.id
                                ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110 z-10'
                                : ''
                            }`}
                          >
                            {isBlocked ? (
                              <FiLock className="w-3.5 h-3.5" />
                            ) : isSold ? (
                              'X'
                            ) : (
                              seat.col
                            )}

                            {/* Tooltip */}
                            <div className="absolute bottom-full mb-2 hidden group-hover:block z-30 px-2 py-1 bg-slate-900 text-white text-[10px] rounded whitespace-nowrap shadow-lg border border-slate-700 pointer-events-none">
                              {seat.id} - {tier?.name} ({tier?.price.toLocaleString()}đ) - [{seat.status}]
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <span className="w-6 text-center text-xs font-bold font-mono app-text-muted">
                      {rowLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Seat Status Legend */}
          <div className="flex flex-wrap items-center justify-center gap-6 pt-4 border-t app-border text-xs app-text-muted font-semibold">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded bg-amber-500" />
              <span>VIP Diamond</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded bg-purple-500" />
              <span>Vé Gold</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded bg-blue-500" />
              <span>Standard</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded bg-slate-700/50 border border-slate-600" />
              <span>Đã bán (Sold)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded bg-amber-500/20 border border-amber-500 text-amber-400 flex items-center justify-center text-[10px]">R</span>
              <span>Giữ chỗ BTC</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded bg-rose-500/20 border border-rose-500 text-rose-400 flex items-center justify-center text-[10px]">x</span>
              <span>Tạm khóa</span>
            </div>
          </div>
        </div>

        {/* Sidebar Controls (1 col) */}
        <div className="space-y-6">
          {/* Quick Tools */}
          <div className="p-5 rounded-2xl app-bg-card border app-border space-y-4 shadow-xs">
            <h3 className="text-xs font-extrabold app-text-main uppercase tracking-wider flex items-center gap-2">
              <FiLayers className="text-blue-600" />
              <span>Công cụ thao tác</span>
            </h3>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setActiveAction('SELECT')}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-between transition-all cursor-pointer ${
                  activeAction === 'SELECT'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'app-bg-main app-text-muted hover:app-text-main border app-border'
                }`}
              >
                <span>Chế độ xem chi tiết</span>
                <FiMaximize2 className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setActiveAction('CHANGE_TIER')}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-between transition-all cursor-pointer ${
                  activeAction === 'CHANGE_TIER'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'app-bg-main app-text-muted hover:app-text-main border app-border'
                }`}
              >
                <span>Gán hạng vé khi nhấp</span>
                <FiPlus className="w-4 h-4" />
              </button>

              {activeAction === 'CHANGE_TIER' && (
                <div className="p-3 rounded-xl app-bg-main border app-border space-y-2 mt-2">
                  <span className="text-[11px] font-bold app-text-muted uppercase">Chọn hạng vé gán:</span>
                  <select
                    value={selectedTierId}
                    onChange={(e) => setSelectedTierId(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg app-bg-card border app-border text-xs app-text-main font-bold focus:outline-none"
                  >
                    {tiers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.price.toLocaleString()}đ)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="button"
                onClick={() => setActiveAction('RESERVE')}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-between transition-all cursor-pointer ${
                  activeAction === 'RESERVE'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'app-bg-main app-text-muted hover:app-text-main border app-border'
                }`}
              >
                <span>Bật/Tắt giữ chỗ BTC</span>
                <FiLock className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setActiveAction('BLOCK')}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-between transition-all cursor-pointer ${
                  activeAction === 'BLOCK'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'app-bg-main app-text-muted hover:app-text-main border app-border'
                }`}
              >
                <span>Khóa/Mở ghế hỏng</span>
                <FiLock className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Stats Box */}
          <div className="p-5 rounded-2xl app-bg-card border app-border space-y-3 shadow-xs">
            <h3 className="text-xs font-extrabold app-text-main uppercase tracking-wider flex items-center gap-2">
              <FiInfo className="text-blue-600" />
              <span>Thống kê sơ đồ</span>
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b app-border">
                <span className="app-text-muted font-medium">Tổng số ghế:</span>
                <span className="font-bold app-text-main">{totalSeats}</span>
              </div>
              <div className="flex justify-between py-1 border-b app-border">
                <span className="app-text-muted font-medium">Còn trống:</span>
                <span className="font-bold text-emerald-500">{availableSeats}</span>
              </div>
              <div className="flex justify-between py-1 border-b app-border">
                <span className="app-text-muted font-medium">Đã bán thành công:</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">{soldSeats}</span>
              </div>
              <div className="flex justify-between py-1 border-b app-border">
                <span className="app-text-muted font-medium">Giữ chỗ BTC:</span>
                <span className="font-bold text-amber-500">{reservedSeats}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="app-text-muted font-medium">Ghế tạm khóa:</span>
                <span className="font-bold text-rose-500">{blockedSeats}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventSeatingMap;
