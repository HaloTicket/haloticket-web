import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FiSliders,
  FiTag,
  FiTrash2,
  FiRotateCw,
  FiTool,
  FiLock,
  FiDisc,
  FiSquare,
  FiCircle,
  FiChevronLeft,
  FiChevronRight,
  FiCheck,
} from 'react-icons/fi';
import type { PropertyPanelProps } from '@/types/seating';

const PALETTE_COLORS = [
  '#ec4899', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6',
  '#ef4444', '#06b6d4', '#6366f1', '#f97316', '#475569',
];

// property inspector panel component
export const PropertyPanel: React.FC<PropertyPanelProps> = ({
  isCollapsed: externalIsCollapsed,
  onToggleCollapse,
  selectedSeatIds,
  selectedStageId,
  selectedStructureId,
  selectedZoneId,
  seats,
  stages,
  structures,
  zones,
  tiers: _tiers,
  availableTiers: _availableTiers,
  onUpdateSeatProps,
  onUpdateStageProps,
  onUpdateStructureProps,
  onUpdateZoneProps,
  onDeleteSelected,
}) => {
  const { t } = useTranslation();

  // collapse state declaration
  const [internalIsCollapsed, setInternalIsCollapsed] = useState<boolean>(false);
  const isCollapsed = externalIsCollapsed ?? internalIsCollapsed;
  const handleToggle = onToggleCollapse || (() => setInternalIsCollapsed((prev) => !prev));


  const selectedSeats = seats.filter((s) => selectedSeatIds.includes(s.id));
  const selectedStage = stages.find((stg) => stg.id === selectedStageId);
  const selectedStructure = structures.find((st) => st.id === selectedStructureId);
  const selectedZone = selectedZoneId ? zones[selectedZoneId] : null;

  // counts for overview
  const availableCount = seats.filter((s) => (s.status || 'available') === 'available').length;
  const btcCount = seats.filter((s) => s.status === 'reserved').length;
  const accessibleCount = seats.filter((s) => s.status === 'accessible').length;
  const maintenanceCount = seats.filter((s) => s.status === 'maintenance' || s.status === 'blocked').length;

  if (isCollapsed) {
    return (
      <aside className="app-bg-card border app-border rounded-2xl shadow-xs app-text-main p-1.5 flex flex-col items-center gap-2 w-12 transition-all duration-200">
        {/* Toggle Expand Button */}
        <div className="relative group w-full flex justify-center py-1">
          <button
            type="button"
            onClick={handleToggle}
            className="w-8 h-8 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 text-blue-500 border border-blue-500/30 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
          >
            <FiChevronLeft className="w-4 h-4" />
          </button>
          <span className="absolute right-full mr-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1 text-[11px] font-extrabold text-slate-100 bg-slate-900 border border-slate-700/80 rounded-lg shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
            {t("Mở rộng bảng Thuộc tính")}
          </span>
        </div>

        <div className="w-8 h-px app-bg-border" />

        {/* Vertical Icon Indicator */}
        <div className="relative group w-full flex justify-center">
          <div className="w-8 h-8 rounded-xl app-bg-main border app-border text-blue-500 flex items-center justify-center">
            <FiSliders className="w-4 h-4" />
          </div>
          <span className="absolute right-full mr-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1 text-[11px] font-extrabold text-slate-100 bg-slate-900 border border-slate-700/80 rounded-lg shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
            {t("Thuộc tính phần tử")}
          </span>
        </div>
      </aside>
    );
  }

  return (
    <aside className="app-bg-card border app-border rounded-2xl shadow-xs app-text-main p-5 space-y-4 w-full transition-all duration-200">
      {/* Panel Header */}
      <div className="flex items-center justify-between w-full border-b app-border pb-3">
        <div className="flex items-center gap-2 truncate">
          <FiSliders className="text-blue-600 w-4 h-4 flex-shrink-0" />
          <h2 className="font-extrabold text-xs app-text-main uppercase tracking-wider truncate">
            {t("THUỘC TÍNH PHẦN TỬ")}
          </h2>
        </div>

        <div className="flex items-center gap-1.5">
          {(selectedSeatIds.length > 0 || selectedStageId || selectedStructureId) && (
            <button
              type="button"
              onClick={onDeleteSelected}
              className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
              title={t("Nhấn Delete trên bàn phím để xóa")}
            >
              <FiTrash2 className="w-3.5 h-3.5" />
              <span className="text-[10px] font-mono">Del</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleToggle}
            className="p-1.5 rounded-lg app-text-muted hover:app-text-main hover:bg-slate-500/10 transition-colors cursor-pointer"
            title={t("Thu gọn bảng thuộc tính")}
          >
            <FiChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-4 text-xs animate-in fade-in duration-150">
        {/* 1. SEATS INSPECTOR */}
        {selectedSeats.length > 0 && (
          <div className="p-4 rounded-xl app-bg-main border border-blue-500/30 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="font-extrabold app-text-main uppercase text-[11px] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                {t("Ghế đang chọn")} ({selectedSeats.length})
              </span>
              <span className="font-mono text-[10px] text-blue-500 font-bold">
                {selectedSeats.length === 1 ? selectedSeats[0].id : t('Nhiều ghế')}
              </span>
            </div>

            {selectedSeats.length === 1 && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold app-text-muted mb-1">{t("Tên Hàng")}</label>
                  <input
                    type="text"
                    value={selectedSeats[0].row}
                    onChange={(e) => onUpdateSeatProps({ row: e.target.value.toUpperCase() })}
                    className="w-full px-2.5 py-1.5 rounded-lg app-bg-card border app-border font-mono font-bold text-center uppercase"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold app-text-muted mb-1">{t("Số Ghế")}</label>
                  <input
                    type="number"
                    value={selectedSeats[0].number}
                    onChange={(e) => onUpdateSeatProps({ number: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 rounded-lg app-bg-card border app-border font-mono font-bold text-center"
                  />
                </div>
              </div>
            )}

            {/* SEAT STATUS SELECTOR (Ghế BTC, Xe lăn, Bảo trì, Có sẵn) */}
            <div className="space-y-1.5 pt-2 border-t app-border">
              <label className="block text-[11px] font-bold app-text-muted uppercase">{t("Trạng Thái Ghế")}</label>
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => onUpdateSeatProps({ status: 'available' })}
                  className={`p-2 rounded-lg font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${(selectedSeats[0]?.status || 'available') === 'available'
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                    : 'app-bg-card border-app-border app-text-muted hover:app-text-main'
                    }`}
                >
                  <FiCheck className="w-3.5 h-3.5" />
                  <span>{t("Có sẵn")}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onUpdateSeatProps({ status: 'reserved' })}
                  className={`p-2 rounded-lg font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${selectedSeats[0]?.status === 'reserved'
                    ? 'bg-amber-600 text-white border-amber-500 shadow-xs'
                    : 'app-bg-card border-app-border app-text-muted hover:app-text-main'
                    }`}
                >
                  <FiLock className="w-3.5 h-3.5" />
                  <span>{t("Ghế BTC")}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onUpdateSeatProps({ status: 'accessible' })}
                  className={`p-2 rounded-lg font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${selectedSeats[0]?.status === 'accessible'
                    ? 'bg-cyan-600 text-white border-cyan-500 shadow-xs'
                    : 'app-bg-card border-app-border app-text-muted hover:app-text-main'
                    }`}
                >
                  <FiDisc className="w-3.5 h-3.5" />
                  <span>{t("Xe lăn")}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onUpdateSeatProps({ status: 'maintenance' })}
                  className={`p-2 rounded-lg font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${selectedSeats[0]?.status === 'maintenance' || selectedSeats[0]?.status === 'blocked'
                    ? 'bg-rose-600 text-white border-rose-500 shadow-xs'
                    : 'app-bg-card border-app-border app-text-muted hover:app-text-main'
                    }`}
                >
                  <FiTool className="w-3.5 h-3.5" />
                  <span>{t("Bảo trì")}</span>
                </button>
              </div>
            </div>

            {/* SEAT SHAPE SELECTION */}
            <div className="space-y-1.5 pt-2 border-t app-border">
              <label className="block text-[11px] font-bold app-text-muted uppercase">{t("Hình Dáng Ghế")}</label>
              <div className="grid grid-cols-3 gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => onUpdateSeatProps({ shape: 'circle' })}
                  className={`p-2 rounded-lg font-bold border transition-all flex items-center justify-center gap-1 cursor-pointer ${(selectedSeats[0]?.shape || 'rounded') === 'circle'
                    ? 'bg-blue-600 text-white border-blue-500 shadow-xs'
                    : 'app-bg-card border-app-border app-text-muted hover:app-text-main'
                    }`}
                >
                  <FiCircle className="w-3.5 h-3.5" />
                  <span>{t("Tròn")}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onUpdateSeatProps({ shape: 'square' })}
                  className={`p-2 rounded-lg font-bold border transition-all flex items-center justify-center gap-1 cursor-pointer ${(selectedSeats[0]?.shape || 'rounded') === 'square'
                    ? 'bg-blue-600 text-white border-blue-500 shadow-xs'
                    : 'app-bg-card border-app-border app-text-muted hover:app-text-main'
                    }`}
                >
                  <FiSquare className="w-3.5 h-3.5" />
                  <span>{t("Vuông")}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onUpdateSeatProps({ shape: 'rounded' })}
                  className={`p-2 rounded-lg font-bold border transition-all flex items-center justify-center gap-1 cursor-pointer ${(selectedSeats[0]?.shape || 'rounded') === 'rounded'
                    ? 'bg-blue-600 text-white border-blue-500 shadow-xs'
                    : 'app-bg-card border-app-border app-text-muted hover:app-text-main'
                    }`}
                >
                  <FiDisc className="w-3.5 h-3.5" />
                  <span>{t("Bo góc")}</span>
                </button>
              </div>
            </div>

            {/* SEAT ROTATION SLIDER */}
            <div className="space-y-1.5 pt-2 border-t app-border">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-extrabold app-text-main uppercase flex items-center gap-1.5">
                  <FiRotateCw className="text-blue-500" />
                  {t("Góc xoay ghế")}
                </label>
                <span className="font-mono font-bold text-blue-500 text-xs">{selectedSeats[0]?.rotation || 0}°</span>
              </div>
              <input
                type="range"
                min={0}
                max={359}
                value={selectedSeats[0]?.rotation || 0}
                onChange={(e) => onUpdateSeatProps({ rotation: Number(e.target.value) })}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="grid grid-cols-4 gap-1 pt-1">
                {[0, 90, 180, 270].map((deg) => (
                  <button
                    key={deg}
                    type="button"
                    onClick={() => onUpdateSeatProps({ rotation: deg })}
                    className={`py-1 rounded-lg text-[10px] font-mono font-bold border transition-colors cursor-pointer ${(selectedSeats[0]?.rotation || 0) === deg
                      ? 'bg-blue-600 text-white border-blue-500'
                      : 'app-bg-card border-app-border app-text-muted hover:app-text-main'
                      }`}
                  >
                    {deg}°
                  </button>
                ))}
              </div>
            </div>

            {/* COORDINATES X & Y */}
            {selectedSeats.length === 1 && (
              <div className="grid grid-cols-2 gap-2 pt-2 border-t app-border">
                <div>
                  <label className="block text-[11px] font-bold app-text-muted mb-1">{t("Tọa độ X (px)")}</label>
                  <input
                    type="number"
                    value={Math.round(selectedSeats[0].x)}
                    onChange={(e) => onUpdateSeatProps({ x: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 rounded-lg app-bg-card border app-border font-mono font-bold text-center"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold app-text-muted mb-1">{t("Tọa độ Y (px)")}</label>
                  <input
                    type="number"
                    value={Math.round(selectedSeats[0].y)}
                    onChange={(e) => onUpdateSeatProps({ y: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 rounded-lg app-bg-card border app-border font-mono font-bold text-center"
                  />
                </div>
              </div>
            )}

            {/* CUSTOM SEAT COLOR */}
            <div className="space-y-1.5 pt-2 border-t app-border">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-bold app-text-muted uppercase">{t("Màu Tùy Chỉnh Ghế")}</label>
                {selectedSeats[0]?.color && (
                  <button
                    type="button"
                    onClick={() => onUpdateSeatProps({ color: undefined })}
                    className="text-[10px] text-blue-500 hover:underline cursor-pointer"
                  >
                    {t("Mặc định màu Zone")}
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PALETTE_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => onUpdateSeatProps({ color: c })}
                    className="w-6 h-6 rounded-full border-2 transition-transform cursor-pointer hover:scale-110"
                    style={{ backgroundColor: c, borderColor: selectedSeats[0]?.color === c ? '#ffffff' : 'transparent' }}
                  />
                ))}
              </div>
            </div>

            {/* CHANGE ZONE CONTAINER */}
            <div className="space-y-1 pt-2 border-t app-border">
              <label className="block text-[11px] font-bold app-text-muted uppercase">{t("Đổi Khu Vực (Zone)")}</label>
              <select
                value={selectedSeats[0]?.zoneId || ''}
                onChange={(e) => onUpdateSeatProps({ zoneId: e.target.value })}
                className="w-full px-3 py-2 rounded-lg app-bg-card border app-border font-bold text-xs"
              >
                {Object.values(zones).map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* 2. ZONE BLOCK INSPECTOR */}
        {selectedZone && !selectedSeats.length && (
          <div className="p-4 rounded-xl app-bg-main border border-cyan-500/30 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="font-extrabold app-text-main uppercase text-[11px] flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: selectedZone.color }} />
                {t("Khối Khu Vực")}: {selectedZone.name}
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold app-text-muted mb-1">{t("Tên Khu Vực")}</label>
                <input
                  type="text"
                  value={selectedZone.name}
                  onChange={(e) => onUpdateZoneProps(selectedZone.id, { name: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg app-bg-card border app-border font-bold text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold app-text-muted mb-1">{t("Text/Tiêu Đề Hiển Thị Giữa Khối")}</label>
                <input
                  type="text"
                  value={selectedZone.centerText || ''}
                  onChange={(e) => onUpdateZoneProps(selectedZone.id, { centerText: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg app-bg-card border app-border font-bold text-xs"
                  placeholder={t("Mặc định lấy tên Zone (Ví dụ: KHU VIP A)")}
                />
              </div>

              {/* Independent Zone Color Selector */}
              <div className="pt-2 border-t app-border space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold app-text-muted uppercase">{t("Màu Khối Zone (Độc Lập)")}</label>
                  <input
                    type="color"
                    value={selectedZone.color || '#3b82f6'}
                    onChange={(e) =>
                      onUpdateZoneProps(selectedZone.id, {
                        color: e.target.value,
                        fillColor: e.target.value,
                        strokeColor: e.target.value,
                      })
                    }
                    className="w-6 h-6 rounded-md border-0 cursor-pointer p-0 bg-transparent"
                    title={t("Tùy chỉnh màu tự do")}
                  />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {PALETTE_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() =>
                        onUpdateZoneProps(selectedZone.id, {
                          color: c,
                          fillColor: c,
                          strokeColor: c,
                        })
                      }
                      className="w-5 h-5 rounded-full border-2 transition-transform cursor-pointer hover:scale-110"
                      style={{
                        backgroundColor: c,
                        borderColor: selectedZone.color === c ? '#ffffff' : 'transparent',
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Capacity for Standalone Zone */}
              <div className="pt-2 border-t app-border">
                <label className="block text-[11px] font-bold app-text-muted mb-1">{t("Sức Chứa Khối Zone (Khán giả/Vé)")}</label>
                <input
                  type="number"
                  min={1}
                  value={selectedZone.capacity || 100}
                  onChange={(e) => onUpdateZoneProps(selectedZone.id, { capacity: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 rounded-lg app-bg-card border app-border font-bold text-xs"
                  placeholder={t("Ví dụ: 500 người")}
                />
              </div>

              {/* Zone Shape Selection */}
              <div className="pt-2 border-t app-border space-y-1.5">
                <label className="block text-[11px] font-bold app-text-muted uppercase">{t("Hình Thù Khối Zone")}</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'rectangle', label: t('Chữ Nhật') },
                    { id: 'rounded', label: t('Bo Góc') },
                    { id: 'ellipse', label: t('H.Tròn/Oval') },
                    { id: 'trapezoid', label: t('Hình Thang') },
                    { id: 'fan', label: t('Hình Quạt') },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => onUpdateZoneProps(selectedZone.id, { shape: s.id as any })}
                      className={`py-1.5 px-2 rounded-lg font-bold text-[11px] border transition-colors cursor-pointer text-center ${(selectedZone.shape || 'rounded') === s.id
                        ? 'bg-cyan-600 text-white border-cyan-500 shadow-xs'
                        : 'app-bg-card border-app-border app-text-muted hover:app-text-main'
                        }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Curvature Slider */}
              <div className="space-y-1.5 pt-2 border-t app-border">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-extrabold app-text-main uppercase flex items-center gap-1.5">
                    {t("Độ cong / Bo góc Zone")}
                  </label>
                  <span className="font-mono font-bold text-cyan-500 text-xs">{selectedZone.curvature ?? 16}px</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={selectedZone.curvature ?? 16}
                  onChange={(e) => onUpdateZoneProps(selectedZone.id, { curvature: Number(e.target.value) })}
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
              </div>

              {/* Dimensions */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t app-border">
                <div>
                  <label className="block text-[11px] font-bold app-text-muted mb-1">{t("Chiều rộng (px)")}</label>
                  <input
                    type="number"
                    value={selectedZone.width || 400}
                    onChange={(e) => onUpdateZoneProps(selectedZone.id, { width: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 rounded-lg app-bg-card border app-border font-mono font-bold text-center"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold app-text-muted mb-1">{t("Chiều cao (px)")}</label>
                  <input
                    type="number"
                    value={selectedZone.height || 200}
                    onChange={(e) => onUpdateZoneProps(selectedZone.id, { height: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 rounded-lg app-bg-card border app-border font-mono font-bold text-center"
                  />
                </div>
              </div>

              {/* Rotation Slider & Presets */}
              <div className="space-y-1.5 pt-2 border-t app-border">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-extrabold app-text-main uppercase flex items-center gap-1.5">
                    <FiRotateCw className="text-cyan-500" />
                    {t("Góc xoay Zone & Ghế")}
                  </label>
                  <span className="font-mono font-bold text-cyan-500 text-xs">{selectedZone.rotation || 0}°</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={359}
                  value={selectedZone.rotation || 0}
                  onChange={(e) => onUpdateZoneProps(selectedZone.id, { rotation: Number(e.target.value) })}
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
                <div className="grid grid-cols-4 gap-1 pt-1">
                  {[0, 90, 180, 270].map((deg) => (
                    <button
                      key={deg}
                      type="button"
                      onClick={() => onUpdateZoneProps(selectedZone.id, { rotation: deg })}
                      className={`py-1 rounded-lg text-[10px] font-mono font-bold border transition-colors cursor-pointer ${(selectedZone.rotation || 0) === deg
                        ? 'bg-cyan-600 text-white border-cyan-500'
                        : 'app-bg-card border-app-border app-text-muted hover:app-text-main'
                        }`}
                    >
                      {deg}°
                    </button>
                  ))}
                </div>
              </div>

              {/* Border style */}
              <div className="pt-2 border-t app-border">
                <label className="block text-[11px] font-bold app-text-muted mb-1 uppercase">{t("Đường Viền Zone")}</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onUpdateZoneProps(selectedZone.id, { borderStyle: 'dashed' })}
                    className={`py-1.5 rounded-lg font-bold text-xs border cursor-pointer ${(selectedZone.borderStyle || 'dashed') === 'dashed'
                      ? 'bg-cyan-600 text-white border-cyan-500'
                      : 'app-bg-card border-app-border app-text-muted'
                      }`}
                  >
                    {t("Nét Đứt (Dashed)")}
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateZoneProps(selectedZone.id, { borderStyle: 'solid' })}
                    className={`py-1.5 rounded-lg font-bold text-xs border cursor-pointer ${selectedZone.borderStyle === 'solid'
                      ? 'bg-cyan-600 text-white border-cyan-500'
                      : 'app-bg-card border-app-border app-text-muted'
                      }`}
                  >
                    {t("Nét Liền (Solid)")}
                  </button>
                </div>
              </div>

              {/* Fill Opacity Slider */}
              <div className="space-y-1.5 pt-2 border-t app-border">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-extrabold app-text-main uppercase flex items-center gap-1.5">
                    {t("Độ Nổi Màu Nền Zone (Fill Opacity)")}
                  </label>
                  <span className="font-mono font-bold text-cyan-500 text-xs">
                    {Math.round((selectedZone.fillOpacity ?? 0.25) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0.05}
                  max={0.9}
                  step={0.05}
                  value={selectedZone.fillOpacity ?? 0.25}
                  onChange={(e) => onUpdateZoneProps(selectedZone.id, { fillOpacity: Number(e.target.value) })}
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
              </div>

              {/* Color Palette Selection */}
              <div className="space-y-1.5 pt-2 border-t app-border">
                <label className="block text-[11px] font-bold app-text-muted uppercase">{t("Màu Sắc Khu Vực (Chủ Đạo)")}</label>
                <div className="flex flex-wrap gap-1.5">
                  {PALETTE_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => onUpdateZoneProps(selectedZone.id, { color: c, fillColor: c })}
                      className="w-6 h-6 rounded-full border-2 transition-transform cursor-pointer hover:scale-110"
                      style={{ backgroundColor: c, borderColor: selectedZone.color === c ? '#ffffff' : 'transparent' }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. STAGE INSPECTOR */}
        {selectedStage && !selectedSeats.length && (
          <div className="p-4 rounded-xl app-bg-main border border-indigo-500/30 space-y-3 shadow-xs">
            <span className="font-extrabold app-text-main uppercase text-[11px] flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
              {t("Sân Khấu")}: {selectedStage.label}
            </span>

            <div>
              <label className="block text-[11px] font-bold app-text-muted mb-1">{t("Tên Sân Khấu")}</label>
              <input
                type="text"
                value={selectedStage.label}
                onChange={(e) => onUpdateStageProps(selectedStage.id, { label: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg app-bg-card border app-border font-bold text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t app-border">
              <div>
                <label className="block text-[11px] font-bold app-text-muted mb-1">{t("Chiều rộng (px)")}</label>
                <input
                  type="number"
                  value={selectedStage.width}
                  onChange={(e) => onUpdateStageProps(selectedStage.id, { width: Number(e.target.value) })}
                  className="w-full px-2.5 py-1.5 rounded-lg app-bg-card border app-border font-mono font-bold text-center"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold app-text-muted mb-1">{t("Chiều cao (px)")}</label>
                <input
                  type="number"
                  value={selectedStage.height}
                  onChange={(e) => onUpdateStageProps(selectedStage.id, { height: Number(e.target.value) })}
                  className="w-full px-2.5 py-1.5 rounded-lg app-bg-card border app-border font-mono font-bold text-center"
                />
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t app-border">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold app-text-muted uppercase">{t("Góc Xoay Sân Khấu")}</label>
                <span className="font-mono font-bold text-indigo-500">{selectedStage.rotation || 0}°</span>
              </div>
              <input
                type="range"
                min={0}
                max={359}
                value={selectedStage.rotation || 0}
                onChange={(e) => onUpdateStageProps(selectedStage.id, { rotation: Number(e.target.value) })}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
          </div>
        )}

        {/* 4. STRUCTURE INSPECTOR */}
        {selectedStructure && !selectedSeats.length && (
          <div className="p-4 rounded-xl app-bg-main border border-rose-500/30 space-y-3 shadow-xs">
            <span className="font-extrabold app-text-main uppercase text-[11px] flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              {t("Kết Cấu / Lối Đi")}: {selectedStructure.label}
            </span>

            <div>
              <label className="block text-[11px] font-bold app-text-muted mb-1">{t("Tên Lối Đi")}</label>
              <input
                type="text"
                value={selectedStructure.label}
                onChange={(e) => onUpdateStructureProps(selectedStructure.id, { label: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg app-bg-card border app-border font-bold text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t app-border">
              <div>
                <label className="block text-[11px] font-bold app-text-muted mb-1">{t("Chiều rộng (px)")}</label>
                <input
                  type="number"
                  value={selectedStructure.width}
                  onChange={(e) => onUpdateStructureProps(selectedStructure.id, { width: Number(e.target.value) })}
                  className="w-full px-2.5 py-1.5 rounded-lg app-bg-card border app-border font-mono font-bold text-center"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold app-text-muted mb-1">{t("Chiều cao (px)")}</label>
                <input
                  type="number"
                  value={selectedStructure.height}
                  onChange={(e) => onUpdateStructureProps(selectedStructure.id, { height: Number(e.target.value) })}
                  className="w-full px-2.5 py-1.5 rounded-lg app-bg-card border app-border font-mono font-bold text-center"
                />
              </div>
            </div>
          </div>
        )}

        {/* DEFAULT OVERVIEW STATS (When nothing is selected) */}
        {!selectedSeats.length && !selectedStage && !selectedStructure && !selectedZone && (
          <div className="space-y-1.5">
            <h3 className="font-extrabold text-[11px] app-text-muted uppercase tracking-wider">
              {t("THỐNG KÊ TRẠNG THÁI GHẾ")} ({seats.length})
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-xl app-bg-main border app-border flex items-center justify-between">
                <span className="text-[11px] font-bold app-text-main flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> {t("Có sẵn")}
                </span>
                <span className="font-mono font-bold text-emerald-500">{availableCount}</span>
              </div>
              <div className="p-2.5 rounded-xl app-bg-main border app-border flex items-center justify-between">
                <span className="text-[11px] font-bold app-text-main flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" /> {t("Ghế BTC")}
                </span>
                <span className="font-mono font-bold text-amber-500">{btcCount}</span>
              </div>
              <div className="p-2.5 rounded-xl app-bg-main border app-border flex items-center justify-between">
                <span className="text-[11px] font-bold app-text-main flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-500" /> {t("Xe lăn")}
                </span>
                <span className="font-mono font-bold text-cyan-500">{accessibleCount}</span>
              </div>
              <div className="p-2.5 rounded-xl app-bg-main border app-border flex items-center justify-between">
                <span className="text-[11px] font-bold app-text-main flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500" /> {t("Bảo trì")}
                </span>
                <span className="font-mono font-bold text-rose-500">{maintenanceCount}</span>
              </div>
            </div>
          </div>
        )}

        {/* ALWAYS VISIBLE LIST OF ZONES */}
        <div className="space-y-2.5 pt-3 border-t app-border">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-[11px] app-text-main uppercase tracking-wider flex items-center gap-1.5">
              <FiTag className="text-cyan-500" />
              <span>{t("DANH SÁCH KHU VỰC")} ({Object.keys(zones).length})</span>
            </h3>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {Object.values(zones).map((z) => {
              const seatCountInZone = seats.filter((s) => s.zoneId === z.id).length;
              const isSelectedZone = selectedZoneId === z.id;
              return (
                <div
                  key={z.id}
                  onClick={() => onUpdateZoneProps(z.id, {})}
                  className={`p-3 rounded-xl app-bg-main border transition-all cursor-pointer space-y-2 group shadow-2xs ${isSelectedZone ? 'border-cyan-500 ring-1 ring-cyan-500/50' : 'app-border hover:border-blue-500/40'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-3 h-3 rounded-md flex-shrink-0" style={{ backgroundColor: z.color }} />
                      <span className="font-bold text-xs app-text-main truncate group-hover:text-cyan-500 transition-colors">
                        {z.name}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-cyan-500">{z.rotation || 0}°</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="px-2 py-0.5 rounded-md app-bg-card border app-border text-[10px] font-bold text-slate-400">
                      {t("Khối Zone")}
                    </span>
                    <span className="app-text-muted font-bold">
                      {seatCountInZone} {t("ghế")}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
};
