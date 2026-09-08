import React, { useState } from 'react';
import {
  FiGrid,
  FiPlus,
  FiCopy,
  FiTrash2,
  FiCheckSquare,
  FiCompass,
  FiDisc,
  FiLayers,
  FiShield,
  FiX,
} from 'react-icons/fi';
import type {
  ZoneBlock,
  ToolBarProps,
} from '@/types/seating';

// seating editor toolbar component
export const ToolBar: React.FC<ToolBarProps> = ({
  zones,
  tiers,
  selectedSeatIds,
  onAddRow,
  onAddMatrix,
  onAddArc,
  onAddTable,
  onAddStage,
  onAddStructure,
  onAddZoneBlock,
  onDeleteSelected,
  onDuplicateSelected,
  onSelectAll,
}) => {
  // zone list and default zone id
  const zoneList = Object.values(zones || {});
  const defaultZoneId = zoneList[0]?.id || 'standard';

  // calculate zone price helper
  const getZonePrice = (z: ZoneBlock) => z.price ?? tiers?.find((t) => t.id === z.tierId)?.price ?? 0;

  // current active modal state
  const [activeModal, setActiveModal] = useState<'ROW' | 'MATRIX' | 'ARC' | 'ZONE' | null>(null);

  // straight row generator form state
  const [rowLetter, setRowLetter] = useState('A');
  const [rowCount, setRowCount] = useState(12);
  const [rowZone, setRowZone] = useState(defaultZoneId);

  // seat matrix generator form state
  const [matrixRows, setMatrixRows] = useState(4);
  const [matrixCols, setMatrixCols] = useState(10);
  const [matrixStartRow, setMatrixStartRow] = useState('A');
  const [matrixZone, setMatrixZone] = useState(defaultZoneId);

  // arc row generator form state
  const [arcRowLetter, setArcRowLetter] = useState('A');
  const [arcCount, setArcCount] = useState(16);
  const [arcRadius, setArcRadius] = useState(280);
  const [arcZone, setArcZone] = useState(defaultZoneId);

  // zone block generator form state
  const [zoneName, setZoneName] = useState(`Khu Vực Ghế ${Object.keys(zones).length + 1}`);
  const [zonePrice, setZonePrice] = useState(1500000);
  const [zoneColor, setZoneColor] = useState('#06b6d4');
  const [zoneWidth, setZoneWidth] = useState(820);
  const [zoneHeight, setZoneHeight] = useState(180);
  const [zoneBorderStyle, setZoneBorderStyle] = useState<'dashed' | 'solid'>('dashed');
  const [zoneRows, setZoneRows] = useState(0);
  const [zoneCols, setZoneCols] = useState(0);

  return (
    <>
      {/* Sleek, Compact Vertical Toolbar */}
      <div className="w-12 p-1.5 rounded-2xl app-bg-card border app-border shadow-xs flex flex-col items-center gap-2 text-xs font-bold app-text-main">
        {/* Header Icon */}
        <div className="relative group w-full flex justify-center py-1">
          <div className="w-8 h-8 rounded-xl app-bg-main border app-border text-blue-500 flex items-center justify-center shadow-2xs">
            <FiGrid className="w-4 h-4" />
          </div>
          <span className="absolute left-full ml-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1 text-[11px] font-extrabold text-slate-100 bg-slate-900 border border-slate-700/80 rounded-lg shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
            Thao Tác & Công Cụ
          </span>
        </div>

        <div className="w-8 h-px app-bg-border" />

        {/* Group 1: Seat & Zone Generators */}
        <div className="flex flex-col gap-1.5 w-full items-center">
          {/* Row Generator */}
          <div className="relative group w-full flex justify-center">
            <button
              type="button"
              onClick={() => setActiveModal('ROW')}
              className="w-9 h-9 rounded-xl app-bg-main hover:app-bg-hover border app-border hover:border-blue-500/50 text-blue-500 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
            >
              <FiPlus className="w-4 h-4" />
            </button>
            <span className="absolute left-full ml-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1 text-[11px] font-extrabold text-slate-100 bg-slate-900 border border-slate-700/80 rounded-lg shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
              Hàng ghế thẳng
            </span>
          </div>

          {/* Matrix Generator */}
          <div className="relative group w-full flex justify-center">
            <button
              type="button"
              onClick={() => setActiveModal('MATRIX')}
              className="w-9 h-9 rounded-xl app-bg-main hover:app-bg-hover border app-border hover:border-purple-500/50 text-purple-500 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
            >
              <FiGrid className="w-4 h-4" />
            </button>
            <span className="absolute left-full ml-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1 text-[11px] font-extrabold text-slate-100 bg-slate-900 border border-slate-700/80 rounded-lg shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
              Ma trận Grid
            </span>
          </div>

          {/* Arc Generator */}
          <div className="relative group w-full flex justify-center">
            <button
              type="button"
              onClick={() => setActiveModal('ARC')}
              className="w-9 h-9 rounded-xl app-bg-main hover:app-bg-hover border app-border hover:border-amber-500/50 text-amber-500 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
            >
              <FiCompass className="w-4 h-4" />
            </button>
            <span className="absolute left-full ml-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1 text-[11px] font-extrabold text-slate-100 bg-slate-900 border border-slate-700/80 rounded-lg shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
              Ghế cong hình quạt
            </span>
          </div>

          {/* Gala Table Generator */}
          <div className="relative group w-full flex justify-center">
            <button
              type="button"
              onClick={() => onAddTable()}
              className="w-9 h-9 rounded-xl app-bg-main hover:app-bg-hover border app-border hover:border-emerald-500/50 text-emerald-500 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
            >
              <FiDisc className="w-4 h-4" />
            </button>
            <span className="absolute left-full ml-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1 text-[11px] font-extrabold text-slate-100 bg-slate-900 border border-slate-700/80 rounded-lg shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
              Bàn tròn Gala (8 ghế)
            </span>
          </div>

          {/* Zone Generator */}
          <div className="relative group w-full flex justify-center">
            <button
              type="button"
              onClick={() => setActiveModal('ZONE')}
              className="w-9 h-9 rounded-xl app-bg-main hover:app-bg-hover border app-border hover:border-cyan-500/50 text-cyan-500 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
            >
              <FiCheckSquare className="w-4 h-4" />
            </button>
            <span className="absolute left-full ml-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1 text-[11px] font-extrabold text-slate-100 bg-slate-900 border border-slate-700/80 rounded-lg shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
              Khối Zone (Khu vực)
            </span>
          </div>
        </div>

        <div className="w-8 h-px app-bg-border" />

        {/* Group 2: Stage & Structure */}
        <div className="flex flex-col gap-1.5 w-full items-center">
          <div className="relative group w-full flex justify-center">
            <button
              type="button"
              onClick={() => onAddStage('SÂN KHẤU CHÍNH')}
              className="w-9 h-9 rounded-xl app-bg-main hover:app-bg-hover border app-border hover:border-indigo-500/50 text-indigo-500 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
            >
              <FiLayers className="w-4 h-4" />
            </button>
            <span className="absolute left-full ml-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1 text-[11px] font-extrabold text-slate-100 bg-slate-900 border border-slate-700/80 rounded-lg shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
              Sân khấu chính
            </span>
          </div>

          <div className="relative group w-full flex justify-center">
            <button
              type="button"
              onClick={() => onAddStructure('exit', 'LỐI THOÁT HIỂM')}
              className="w-9 h-9 rounded-xl app-bg-main hover:app-bg-hover border app-border hover:border-rose-500/50 text-rose-500 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
            >
              <FiShield className="w-4 h-4" />
            </button>
            <span className="absolute left-full ml-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1 text-[11px] font-extrabold text-slate-100 bg-slate-900 border border-slate-700/80 rounded-lg shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
              Lối thoát hiểm
            </span>
          </div>
        </div>

        <div className="w-8 h-px app-bg-border" />

        {/* Group 3: Quick Actions */}
        <div className="flex flex-col gap-1.5 w-full items-center">
          <div className="relative group w-full flex justify-center">
            <button
              type="button"
              onClick={onSelectAll}
              className="w-9 h-9 rounded-xl app-bg-main hover:app-bg-hover border app-border app-text-muted hover:app-text-main flex items-center justify-center transition-all cursor-pointer shadow-2xs"
            >
              <FiCheckSquare className="w-4 h-4" />
            </button>
            <span className="absolute left-full ml-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1 text-[11px] font-extrabold text-slate-100 bg-slate-900 border border-slate-700/80 rounded-lg shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
              Chọn tất cả ghế
            </span>
          </div>

          <div className="relative group w-full flex justify-center">
            <button
              type="button"
              onClick={onDuplicateSelected}
              disabled={selectedSeatIds.length === 0}
              className="w-9 h-9 rounded-xl app-bg-main hover:app-bg-hover border app-border app-text-muted hover:app-text-main flex items-center justify-center transition-all cursor-pointer shadow-2xs disabled:opacity-30"
            >
              <FiCopy className="w-4 h-4" />
            </button>
            <span className="absolute left-full ml-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1 text-[11px] font-extrabold text-slate-100 bg-slate-900 border border-slate-700/80 rounded-lg shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
              Nhân bản phần tử chọn
            </span>
          </div>

          <div className="relative group w-full flex justify-center">
            <button
              type="button"
              onClick={onDeleteSelected}
              className="w-9 h-9 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
            >
              <FiTrash2 className="w-4 h-4" />
            </button>
            <span className="absolute left-full ml-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1 text-[11px] font-extrabold text-slate-100 bg-slate-900 border border-slate-700/80 rounded-lg shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
              Xóa phần tử chọn
            </span>
          </div>
        </div>
      </div>

      {/* Floating Modals for Generators */}
      {activeModal === 'ROW' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl app-bg-card border app-border shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b app-border pb-3">
              <h3 className="text-xs font-extrabold app-text-main uppercase tracking-wider flex items-center gap-2">
                <FiPlus className="text-blue-500" />
                <span>Tạo Hàng Ghế Thẳng</span>
              </h3>
              <button onClick={() => setActiveModal(null)} className="app-text-muted hover:app-text-main cursor-pointer">
                <FiX className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold app-text-muted mb-1">Tên Hàng (A..Z)</label>
                  <input
                    type="text"
                    value={rowLetter}
                    onChange={(e) => setRowLetter(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 rounded-xl app-bg-main border app-border font-mono font-bold text-center uppercase"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold app-text-muted mb-1">Số lượng ghế</label>
                  <input
                    type="number"
                    min={1}
                    max={40}
                    value={rowCount}
                    onChange={(e) => setRowCount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl app-bg-main border app-border font-mono font-bold text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold app-text-muted mb-1">Hạng vé (Zone)</label>
                <select
                  value={rowZone}
                  onChange={(e) => setRowZone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl app-bg-main border app-border font-bold"
                >
                  {zoneList.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name} ({getZonePrice(z).toLocaleString('vi-VN')}đ)
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => {
                  onAddRow(rowLetter, rowCount, rowZone);
                  setActiveModal(null);
                }}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-xs cursor-pointer"
              >
                Tạo Hàng Ghế Thẳng
              </button>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'MATRIX' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl app-bg-card border app-border shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b app-border pb-3">
              <h3 className="text-xs font-extrabold app-text-main uppercase tracking-wider flex items-center gap-2">
                <FiGrid className="text-purple-500" />
                <span>Tạo Khối Ma Trận Grid</span>
              </h3>
              <button onClick={() => setActiveModal(null)} className="app-text-muted hover:app-text-main cursor-pointer">
                <FiX className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-bold app-text-muted mb-1">Số hàng</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={matrixRows}
                    onChange={(e) => setMatrixRows(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded-xl app-bg-main border app-border font-mono font-bold text-center"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold app-text-muted mb-1">Ghế/Hàng</label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={matrixCols}
                    onChange={(e) => setMatrixCols(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded-xl app-bg-main border app-border font-mono font-bold text-center"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold app-text-muted mb-1">Hàng đầu</label>
                  <input
                    type="text"
                    value={matrixStartRow}
                    onChange={(e) => setMatrixStartRow(e.target.value.toUpperCase())}
                    className="w-full px-2 py-1.5 rounded-xl app-bg-main border app-border font-mono font-bold text-center uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold app-text-muted mb-1">Hạng vé (Zone)</label>
                <select
                  value={matrixZone}
                  onChange={(e) => setMatrixZone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl app-bg-main border app-border font-bold"
                >
                  {zoneList.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name} ({getZonePrice(z).toLocaleString('vi-VN')}đ)
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => {
                  onAddMatrix(matrixRows, matrixCols, matrixStartRow, matrixZone);
                  setActiveModal(null);
                }}
                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs shadow-xs cursor-pointer"
              >
                Tạo Khối Ma Trận ({matrixRows * matrixCols} ghế)
              </button>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'ARC' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl app-bg-card border app-border shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b app-border pb-3">
              <h3 className="text-xs font-extrabold app-text-main uppercase tracking-wider flex items-center gap-2">
                <FiCompass className="text-amber-500" />
                <span>Tạo Hàng Cong Hình Quạt</span>
              </h3>
              <button onClick={() => setActiveModal(null)} className="app-text-muted hover:app-text-main cursor-pointer">
                <FiX className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-bold app-text-muted mb-1">Tên hàng</label>
                  <input
                    type="text"
                    value={arcRowLetter}
                    onChange={(e) => setArcRowLetter(e.target.value.toUpperCase())}
                    className="w-full px-2 py-1.5 rounded-xl app-bg-main border app-border font-mono font-bold text-center uppercase"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold app-text-muted mb-1">Số ghế</label>
                  <input
                    type="number"
                    min={2}
                    max={40}
                    value={arcCount}
                    onChange={(e) => setArcCount(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded-xl app-bg-main border app-border font-mono font-bold text-center"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold app-text-muted mb-1">Bán kính</label>
                  <input
                    type="number"
                    min={100}
                    max={600}
                    value={arcRadius}
                    onChange={(e) => setArcRadius(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded-xl app-bg-main border app-border font-mono font-bold text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold app-text-muted mb-1">Hạng vé (Zone)</label>
                <select
                  value={arcZone}
                  onChange={(e) => setArcZone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl app-bg-main border app-border font-bold"
                >
                  {zoneList.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name} ({getZonePrice(z).toLocaleString('vi-VN')}đ)
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => {
                  onAddArc(arcRowLetter, arcCount, arcRadius, arcZone);
                  setActiveModal(null);
                }}
                className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-xs cursor-pointer"
              >
                Tạo Hàng Cong Vòm Sân Khấu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Zone Area Container Modal Generator */}
      {activeModal === 'ZONE' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl app-bg-card border app-border shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b app-border pb-3">
              <h3 className="text-xs font-extrabold app-text-main uppercase tracking-wider flex items-center gap-2">
                <FiCheckSquare className="text-teal-500" />
                <span>Tạo Khu Vực Ghế (Zone Box)</span>
              </h3>
              <button onClick={() => setActiveModal(null)} className="app-text-muted hover:app-text-main cursor-pointer">
                <FiX className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold app-text-muted mb-1">Tên Khu Vực Ghế</label>
                <input
                  type="text"
                  value={zoneName}
                  onChange={(e) => setZoneName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl app-bg-main border app-border font-bold text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold app-text-muted mb-1">Giá Vé Mặc Định (đ)</label>
                  <input
                    type="number"
                    min={0}
                    step={50000}
                    value={zonePrice}
                    onChange={(e) => setZonePrice(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded-xl app-bg-main border app-border font-mono font-bold text-center"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold app-text-muted mb-1">Màu Khu Vực</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={zoneColor}
                      onChange={(e) => setZoneColor(e.target.value)}
                      className="w-8 h-8 rounded-lg border app-border p-0.5 bg-transparent cursor-pointer"
                    />
                    <span className="font-mono text-xs font-bold app-text-main">{zoneColor}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold app-text-muted mb-1">Chiều Rộng (px)</label>
                  <input
                    type="number"
                    min={200}
                    max={1200}
                    step={20}
                    value={zoneWidth}
                    onChange={(e) => setZoneWidth(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded-xl app-bg-main border app-border font-mono font-bold text-center"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold app-text-muted mb-1">Chiều Cao (px)</label>
                  <input
                    type="number"
                    min={80}
                    max={800}
                    step={10}
                    value={zoneHeight}
                    onChange={(e) => setZoneHeight(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded-xl app-bg-main border app-border font-mono font-bold text-center"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold app-text-muted mb-1">Số hàng ghế sinh sẵn</label>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={zoneRows}
                    onChange={(e) => setZoneRows(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded-xl app-bg-main border app-border font-mono font-bold text-center"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold app-text-muted mb-1">Số ghế mỗi hàng</label>
                  <input
                    type="number"
                    min={0}
                    max={30}
                    value={zoneCols}
                    onChange={(e) => setZoneCols(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded-xl app-bg-main border app-border font-mono font-bold text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold app-text-muted mb-1">Kiểu Đường Viền</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setZoneBorderStyle('dashed')}
                    className={`py-1.5 rounded-lg font-bold text-xs border cursor-pointer ${zoneBorderStyle === 'dashed' ? 'bg-teal-600 text-white border-teal-500' : 'app-bg-main border-app-border app-text-muted'
                      }`}
                  >
                    Nét Đứt (Dashed)
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoneBorderStyle('solid')}
                    className={`py-1.5 rounded-lg font-bold text-xs border cursor-pointer ${zoneBorderStyle === 'solid' ? 'bg-teal-600 text-white border-teal-500' : 'app-bg-main border-app-border app-text-muted'
                      }`}
                  >
                    Nét Liền (Solid)
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (onAddZoneBlock) {
                    onAddZoneBlock(zoneName, zonePrice, zoneColor, zoneWidth, zoneHeight, zoneBorderStyle, zoneRows, zoneCols);
                  }
                  setActiveModal(null);
                }}
                className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs shadow-xs cursor-pointer"
              >
                Tạo Khu Vực Ghế ({zoneRows > 0 && zoneCols > 0 ? `${zoneRows * zoneCols} ghế` : 'Không ghế'})
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
