import React, { useState } from 'react';
import {
  FiZoomIn,
  FiZoomOut,
  FiRotateCcw,
  FiTool,
  FiLock,
  FiMove,
  FiTrash2,
  FiUserCheck,
} from 'react-icons/fi';
import type { Seat, CustomElement, SeatMapCanvasProps } from '@/types/seating';

// 2d seating map canvas renderer component
export const SeatMapCanvas: React.FC<SeatMapCanvasProps> = ({
  seats = [],
  tiers = [],
  customElements = [],
  elements = [],
  zones,
  selectedSeatIds = [],
  activeTool,
  isAttendeeMode = false,
  attendeeCart = [],
  onSeatClick,
  onUpdateElementPosition,
  onDeleteElement,
  onSelectRowSeats,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [draggedElementId, setDraggedElementId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // zoom control handlers
  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 15, 200));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 15, 50));
  const handleResetZoom = () => setZoomLevel(100);

  // drag custom element handler
  const handleMouseDown = (e: React.MouseEvent, elem: CustomElement) => {
    if (activeTool !== 'DRAG_ELEMENT' || isAttendeeMode) return;
    setDraggedElementId(elem.id);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!draggedElementId || activeTool !== 'DRAG_ELEMENT' || isAttendeeMode) return;
    const containerRect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(10, Math.min(e.clientX - containerRect.left - dragOffset.x, containerRect.width - 100));
    const y = Math.max(10, Math.min(e.clientY - containerRect.top - dragOffset.y, containerRect.height - 50));
    onUpdateElementPosition?.(draggedElementId, Math.round(x / 10) * 10, Math.round(y / 10) * 10);
  };

  const handleMouseUp = () => {
    setDraggedElementId(null);
  };

  const effectiveElements = customElements.length > 0 ? customElements : elements;

  // group seats by row label
  const rowsMap = (seats || []).reduce((acc, seat) => {

    if (!acc[seat.row]) acc[seat.row] = [];
    acc[seat.row].push(seat);
    return acc;
  }, {} as Record<string, Seat[]>);

  const rowKeys = Object.keys(rowsMap).sort();

  const zoneList = Array.isArray(zones)
    ? zones
    : zones && typeof zones === 'object'
    ? Object.values(zones)
    : [];

  return (
    <div className="relative p-6 rounded-2xl app-bg-card border app-border space-y-4 min-h-[620px] flex flex-col justify-between overflow-hidden shadow-xs">
      {/* Top Floating Viewport Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b app-border z-20">
        <div className="flex items-center gap-2">
          <span className="text-xs font-extrabold app-text-main uppercase tracking-wider">
            {isAttendeeMode ? 'Sơ đồ chọn vé Khán Giả' : 'Sơ đồ khán phòng (2D Canvas Studio)'}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[11px] font-bold font-mono">
            {seats.length} ghế
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-2 rounded-xl app-bg-main border app-border app-text-muted hover:app-text-main transition-colors cursor-pointer"
            title="Thu nhỏ sơ đồ"
          >
            <FiZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono font-bold app-text-main px-2">
            {zoomLevel}%
          </span>
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-2 rounded-xl app-bg-main border app-border app-text-muted hover:app-text-main transition-colors cursor-pointer"
            title="Phóng to sơ đồ"
          >
            <FiZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleResetZoom}
            className="p-2 rounded-xl app-bg-main border app-border app-text-muted hover:app-text-main transition-colors cursor-pointer ml-1"
            title="Đặt lại 100%"
          >
            <FiRotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Drag-and-Drop Interactive Workspace */}
      <div
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className="relative min-h-[480px] w-full overflow-auto app-bg-main rounded-xl border app-border p-6 flex flex-col items-center justify-start transition-all"
        style={{
          backgroundImage:
            'radial-gradient(circle, rgba(148, 163, 184, 0.15) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      >
        <div
          className="transition-transform origin-top duration-150 space-y-8 w-full max-w-4xl"
          style={{ transform: `scale(${zoomLevel / 100})` }}
        >
          {/* Custom Layout Elements (Stage, Exits, Booths) */}
          <div className="space-y-4">
            {effectiveElements.map((elem) => {
              let elemStyle = 'bg-slate-900 text-white border-slate-700';
              if (elem.type === 'STAGE') {
                elemStyle =
                  'bg-gradient-to-r from-blue-950 via-indigo-900 to-blue-950 border-blue-500/50 text-blue-200 shadow-lg';
              } else if (elem.type === 'T_STAGE') {
                elemStyle =
                  'bg-gradient-to-b from-indigo-900 via-purple-900 to-indigo-950 border-purple-500/50 text-indigo-200 shadow-xl';
              } else if (elem.type === 'EXIT') {
                elemStyle =
                  'bg-emerald-600 text-white border-emerald-400 font-extrabold shadow-sm';
              } else if (elem.type === 'GATE') {
                elemStyle =
                  'bg-purple-900/90 text-purple-200 border-purple-500/40';
              } else if (elem.type === 'CONTROL_BOOTH') {
                elemStyle =
                  'bg-slate-800 text-amber-300 border-amber-500/30';
              } else if (elem.type === 'WC_FOOD') {
                elemStyle =
                  'bg-teal-900/80 text-teal-200 border-teal-500/30';
              }

              return (
                <div
                  key={elem.id}
                  onMouseDown={(e) => handleMouseDown(e, elem)}
                  className={`p-3 rounded-xl border text-center text-xs font-bold transition-all relative group flex items-center justify-between shadow-xs ${elemStyle} ${activeTool === 'DRAG_ELEMENT' && !isAttendeeMode ? 'cursor-grab active:cursor-grabbing ring-2 ring-blue-500/40' : ''
                    }`}
                  style={{
                    minHeight: `${elem.height || 48}px`,
                  }}
                >
                  <div className="flex items-center gap-2 mx-auto">
                    {activeTool === 'DRAG_ELEMENT' && !isAttendeeMode && (
                      <FiMove className="w-4 h-4 text-blue-400 animate-pulse" />
                    )}
                    <span className="uppercase tracking-widest text-xs font-extrabold">
                      {elem.name}
                    </span>
                  </div>

                  {activeTool === 'DRAG_ELEMENT' && !isAttendeeMode && (
                    <button
                      type="button"
                      onClick={() => onDeleteElement?.(elem.id)}
                      className="absolute right-2 top-2.5 p-1 rounded bg-rose-600 text-white hover:bg-rose-700 transition-colors cursor-pointer"
                      title="Xóa phần tử này"
                    >
                      <FiTrash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Seating Zones & Grid */}
          <div className="space-y-4 py-4">
            {zoneList.length > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-2">
                {zoneList.map((zone) => (
                  <span
                    key={zone.id}
                    className="px-3 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-extrabold"
                  >
                    {zone.name}
                  </span>
                ))}
              </div>
            )}

            {/* Row Matrix */}
            <div className="overflow-x-auto flex justify-center py-2">
              <div className="inline-grid gap-3">
                {rowKeys.map((rowName) => {
                  const rowSeats = (rowsMap[rowName] || []).sort((a, b) => (a.col || 0) - (b.col || 0));
                  return (
                    <div key={rowName} className="flex items-center gap-3">
                      {!isAttendeeMode && (
                        <button
                          type="button"
                          onClick={() => onSelectRowSeats?.(rowName)}
                          className="w-8 h-8 rounded-lg app-bg-card border app-border text-xs font-mono font-extrabold app-text-muted hover:app-text-main hover:border-blue-500 transition-colors cursor-pointer"
                          title={`Nhấp để chọn toàn bộ Hàng ${rowName}`}
                        >
                          {rowName}
                        </button>
                      )}

                      <div className="flex items-center gap-2">
                        {rowSeats.map((seat) => {
                          const tier = (tiers || []).find((t) => t.id === seat.tierId);
                          const isSelected = (selectedSeatIds || []).includes(seat.id);
                          const isCartItem = (attendeeCart || []).some((s) => s.id === seat.id);

                          let seatStyle = tier?.color || 'bg-slate-700 text-white';
                          let isMaintenance = seat.status === 'maintenance' || (seat.status as string) === 'MAINTENANCE';
                          let isBlocked = seat.status === 'blocked' || (seat.status as string) === 'BLOCKED';
                          let isSold = seat.status === 'sold' || (seat.status as string) === 'SOLD';
                          let isReserved = seat.status === 'reserved' || (seat.status as string) === 'RESERVED';
                          let isAccessible = seat.status === 'accessible' || (seat.status as string) === 'ACCESSIBLE';

                          return (
                            <button
                              key={seat.id}
                              type="button"
                              onClick={() => onSeatClick?.(seat)}
                              disabled={isSold || (isAttendeeMode && (isMaintenance || isBlocked || isReserved))}
                              style={{
                                transform: seat.rotation ? `rotate(${seat.rotation}deg)` : undefined,
                              }}
                              className={`w-9 h-9 rounded-lg font-mono text-xs font-bold flex items-center justify-center transition-all duration-150 relative group ${isCartItem
                                ? 'bg-emerald-500 text-white ring-2 ring-emerald-400 scale-110 shadow-lg'
                                : isMaintenance
                                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/60 ring-1 ring-rose-500/40 cursor-not-allowed'
                                  : isSold
                                    ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed border border-slate-700 opacity-60'
                                    : isBlocked
                                      ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                                      : isReserved
                                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50 cursor-not-allowed'
                                        : isAccessible
                                          ? 'bg-purple-600/30 text-purple-300 border border-purple-500 hover:scale-110 shadow-xs'
                                          : `${seatStyle} hover:scale-110 shadow-xs`
                                } ${isSelected
                                  ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110 z-10 shadow-lg'
                                  : ''
                                }`}
                            >
                              {isCartItem ? (
                                <FiUserCheck className="w-4 h-4 text-white" />
                              ) : isMaintenance ? (
                                <FiTool className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                              ) : isBlocked ? (
                                <FiLock className="w-3.5 h-3.5 text-slate-400" />
                              ) : isReserved ? (
                                <span className="text-[10px] font-extrabold">BTC</span>
                              ) : isSold ? (
                                'X'
                              ) : (
                                seat.col
                              )}

                              {/* Hover Tooltip */}
                              <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center z-30 pointer-events-none">
                                <div className="px-3 py-1.5 bg-slate-900 text-white text-[11px] rounded-xl shadow-xl border border-slate-700 whitespace-nowrap space-y-0.5">
                                  <div className="font-extrabold flex items-center gap-1.5">
                                    <span>Ghế {seat.row}-{seat.col}</span>
                                    {isMaintenance && (
                                      <span className="px-1.5 py-0.2 rounded bg-rose-600 text-white text-[9px]">
                                        BẢO TRÌ/HƯ HỎNG
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-slate-300">
                                    {tier?.name || 'Hạng ghế'} -{' '}
                                    <span className="font-mono text-emerald-400 font-bold">
                                      {tier?.price != null ? `${tier.price.toLocaleString('vi-VN')} đ` : '0 đ'}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-medium">
                                    Trạng thái: [{seat.status}]
                                  </div>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {!isAttendeeMode && (
                        <button
                          type="button"
                          onClick={() => onSelectRowSeats?.(rowName)}
                          className="w-8 h-8 rounded-lg app-bg-card border app-border text-xs font-mono font-extrabold app-text-muted hover:app-text-main hover:border-blue-500 transition-colors cursor-pointer"
                          title={`Nhấp để chọn toàn bộ Hàng ${rowName}`}
                        >
                          {rowName}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Status Legend */}
      <div className="flex flex-wrap items-center justify-center gap-6 pt-4 border-t app-border text-xs app-text-muted font-semibold">
        {(tiers || []).map((tier) => (
          <div key={tier.id} className="flex items-center gap-2">
            <span className={`w-3.5 h-3.5 rounded-full ${tier.color}`} />
            <span>{tier.name}</span>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded bg-slate-700/50 border border-slate-600" />
          <span>Đã bán</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded bg-amber-500/20 border border-amber-500 text-amber-400 flex items-center justify-center text-[9px] font-bold">BTC</span>
          <span>Giữ chỗ BTC</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded bg-rose-500/20 border border-rose-500 text-rose-400 flex items-center justify-center text-[9px]">
            <FiTool className="w-2.5 h-2.5" />
          </span>
          <span>Bảo trì / Ghế hư</span>
        </div>
      </div>
    </div>
  );
};

