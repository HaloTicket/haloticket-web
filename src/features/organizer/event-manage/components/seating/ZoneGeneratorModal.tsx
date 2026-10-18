import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import {
  FiX,
  FiGrid,
  FiPlus,
  FiUsers,
  FiCompass,
  FiDisc,
  FiMaximize2,
  FiCheck,
} from 'react-icons/fi';
import type { AddZoneConfig, ZoneGeneratorModalProps } from '@/types/seating';

const COLOR_PALETTE = [
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#ef4444', '#6366f1', '#14b8a6', '#f97316',
];

export const ZoneGeneratorModal: React.FC<ZoneGeneratorModalProps> = ({
  isOpen,
  onClose,
  onGenerateZone,
}) => {
  const { t } = useTranslation();
  const [zoneName, setZoneName] = useState(() => t('Khán đài A'));
  const [zoneColor, setZoneColor] = useState('#06b6d4');
  const [borderStyle, setBorderStyle] = useState<'dashed' | 'solid'>('dashed');
  const [layoutType, setLayoutType] = useState<'STANDING' | 'ROW' | 'MATRIX' | 'ARC' | 'GALA'>('MATRIX');

  // Straight row state
  const [rowLetter, setRowLetter] = useState('A');
  const [rowCountRowMode, setRowCountRowMode] = useState(12);

  // Matrix grid state
  const [matrixStartRow, setMatrixStartRow] = useState('A');
  const [matrixRows, setMatrixRows] = useState(4);
  const [matrixCols, setMatrixCols] = useState(10);

  // Arc fan state
  const [arcRowLetter, setArcRowLetter] = useState('A');
  const [arcCount, setArcCount] = useState(16);
  const [arcRadius, setArcRadius] = useState(260);

  // Gala table state
  const [galaTableCount, setGalaTableCount] = useState(2);
  const [galaSeatsPerTable, setGalaSeatsPerTable] = useState(8);

  // Standing capacity state
  const [capacity, setCapacity] = useState(200);

  if (!isOpen) return null;

  // Auto-calculate required Zone width & height to ensure seats fit completely INSIDE without overflowing
  const calculateZoneDimensions = () => {
    let width = 500;
    let height = 200;
    let seatTotal = 0;
    let desc = '';

    if (layoutType === 'STANDING') {
      width = 540;
      height = 220;
      seatTotal = 0;
      desc = `${t('Khu vực đứng tự do')} (${t('Sức chứa')} ${capacity} ${t('khán giả')})`;
    } else if (layoutType === 'ROW') {
      const seatsWidth = rowCountRowMode * 38;
      width = Math.max(380, seatsWidth + 100);
      height = 180;
      seatTotal = rowCountRowMode;
      desc = `${t('Hàng ghế thẳng')} (${rowCountRowMode} ${t('ghế hàng')} ${rowLetter})`;
    } else if (layoutType === 'MATRIX') {
      const matrixW = matrixCols * 38;
      const matrixH = matrixRows * 38;
      width = Math.max(380, matrixW + 100);
      height = Math.max(180, matrixH + 110);
      seatTotal = matrixRows * matrixCols;
      desc = `${t('Khối Ma trận Grid')} (${matrixRows} ${t('hàng')} x ${matrixCols} ${t('ghế')} = ${seatTotal} ${t('ghế')})`;
    } else if (layoutType === 'ARC') {
      width = Math.max(480, arcRadius * 2 + 100);
      height = Math.max(260, arcRadius + 140);
      seatTotal = arcCount;
      desc = `${t('Hàng ghế cong vòm hình quạt')} (${arcCount} ${t('ghế')}, ${t('Bán kính')} ${arcRadius}px)`;
    } else if (layoutType === 'GALA') {
      width = Math.max(420, galaTableCount * 200 + 80);
      height = 280;
      seatTotal = galaTableCount * galaSeatsPerTable;
      desc = `${galaTableCount} ${t('Bàn tròn Gala')} (${galaSeatsPerTable} ${t('ghế/bàn')} = ${seatTotal} ${t('ghế')})`;
    }

    return { width, height, seatTotal, desc };
  };

  const { width: computedWidth, height: computedHeight, seatTotal, desc: layoutDesc } = calculateZoneDimensions();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!zoneName.trim()) return;

    const config: AddZoneConfig = {
      name: zoneName.trim(),
      color: zoneColor,
      width: computedWidth,
      height: computedHeight,
      borderStyle,
      layoutType,
      capacity: layoutType === 'STANDING' ? capacity : seatTotal,
      // Pass generator specific fields
      rowPrefix: layoutType === 'ROW' ? rowLetter : layoutType === 'MATRIX' ? matrixStartRow : layoutType === 'ARC' ? arcRowLetter : 'A',
      rowCount: layoutType === 'ROW' ? 1 : layoutType === 'MATRIX' ? matrixRows : 1,
      seatsPerRow: layoutType === 'ROW' ? rowCountRowMode : layoutType === 'MATRIX' ? matrixCols : 0,
      arcCount: layoutType === 'ARC' ? arcCount : 0,
      arcRadius: layoutType === 'ARC' ? arcRadius : 260,
      tableCount: layoutType === 'GALA' ? galaTableCount : 0,
      seatsPerTable: layoutType === 'GALA' ? galaSeatsPerTable : 8,
    };

    onGenerateZone(config);
    onClose();
  };

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-2xl app-bg-card border app-border shadow-2xl rounded-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header - Identical to TierManagerModal */}
        <div className="flex items-center justify-between px-6 py-4 border-b app-border bg-slate-500/5">
          <div className="flex items-center gap-3">
            <div className="w-9.5 h-9.5 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-600 flex items-center justify-center font-bold">
              <FiGrid className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black app-text-main">
                {t('Tạo Khối Khu Vực Ghế (Zone Designer)')}
              </h3>
              <p className="text-xs app-text-muted">
                {t('Chọn kiểu bố cục ghế và tự động cân chỉnh kích thước Zone vừa vị trí ghế')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center app-text-muted hover:app-text-main hover:bg-slate-500/10 transition-colors cursor-pointer"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Form Content Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-xs font-semibold flex-1">
          {/* General Zone Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold app-text-muted mb-1">
                {t("Tên Khu Vực (Zone)")} <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={zoneName}
                onChange={(e) => setZoneName(e.target.value)}
                placeholder={t("VD: Khán đài A1, Khu VIP Tầng 1...")}
                required
                className="w-full px-4 py-2.5 rounded-xl app-bg-main border app-border app-text-main font-bold text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold app-text-muted mb-1">{t("Màu Khu Vực & Ghế")}</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={zoneColor}
                  onChange={(e) => setZoneColor(e.target.value)}
                  className="w-9 h-9 rounded-xl border app-border p-0.5 bg-transparent cursor-pointer flex-shrink-0"
                />
                <div className="flex flex-wrap gap-1 flex-1">
                  {COLOR_PALETTE.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setZoneColor(c)}
                      className="w-6 h-6 rounded-lg border transition-transform cursor-pointer hover:scale-110"
                      style={{
                        backgroundColor: c,
                        borderColor: zoneColor === c ? '#ffffff' : 'transparent',
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Layout Type Selection Cards */}
          <div>
            <label className="block text-[11px] font-extrabold app-text-muted mb-2 uppercase tracking-wider">
              {t("Chọn Kiểu Bố Cục Cho Khu Vực")} <span className="text-rose-500">*</span>
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {[
                { id: 'STANDING', title: t('Đứng Tự Do'), desc: t('Không ghế'), icon: FiUsers },
                { id: 'ROW', title: t('Hàng Ghế Thẳng'), desc: t('1 hàng dài'), icon: FiPlus },
                { id: 'MATRIX', title: t('Ma Trận Grid'), desc: t('Nhiều hàng ghế'), icon: FiGrid },
                { id: 'ARC', title: t('Ghế Cong'), desc: t('Vòm quạt'), icon: FiCompass },
                { id: 'GALA', title: t('Bàn Gala'), desc: t('Bàn tròn'), icon: FiDisc },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = layoutType === item.id;

                return (
                  <div
                    key={item.id}
                    onClick={() => setLayoutType(item.id as any)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col items-center text-center gap-1.5 ${
                      isSelected
                        ? 'border-blue-500 ring-2 ring-blue-500/30 bg-blue-50/20 dark:bg-blue-950/20 app-text-main shadow-md'
                        : 'app-border app-bg-main app-text-muted hover:border-blue-500/30 hover:app-text-main'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                      isSelected ? 'bg-blue-600 text-white' : 'app-bg-card app-text-muted'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[11px] font-extrabold">{item.title}</div>
                      <div className="text-[9px] app-text-muted">{item.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dynamic Configuration Inputs per Layout Mode */}
          <div className="p-4 rounded-2xl app-bg-main border app-border space-y-3">
            {layoutType === 'STANDING' && (
              <div>
                <label className="block text-xs font-bold app-text-muted mb-1">
                  {t("Sức chứa tối đa (Khán giả đứng)")}
                </label>
                <input
                  type="number"
                  min={10}
                  max={10000}
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl app-bg-card border app-border app-text-main font-mono font-bold"
                />
              </div>
            )}

            {layoutType === 'ROW' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold app-text-muted mb-1">{t("Ký hiệu hàng ghế (A..Z)")}</label>
                  <input
                    type="text"
                    value={rowLetter}
                    onChange={(e) => setRowLetter(e.target.value.toUpperCase())}
                    maxLength={3}
                    className="w-full px-3 py-2 rounded-xl app-bg-card border app-border app-text-main font-mono font-bold text-center uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold app-text-muted mb-1">{t("Số lượng ghế trong hàng")}</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={rowCountRowMode}
                    onChange={(e) => setRowCountRowMode(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl app-bg-card border app-border app-text-main font-mono font-bold text-center"
                  />
                </div>
              </div>
            )}

            {layoutType === 'MATRIX' && (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold app-text-muted mb-1">{t("Ký hiệu hàng bắt đầu")}</label>
                  <input
                    type="text"
                    value={matrixStartRow}
                    onChange={(e) => setMatrixStartRow(e.target.value.toUpperCase())}
                    maxLength={3}
                    className="w-full px-3 py-2 rounded-xl app-bg-card border app-border app-text-main font-mono font-bold text-center uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold app-text-muted mb-1">{t("Số lượng hàng")}</label>
                  <input
                    type="number"
                    min={1}
                    max={26}
                    value={matrixRows}
                    onChange={(e) => setMatrixRows(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl app-bg-card border app-border app-text-main font-mono font-bold text-center"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold app-text-muted mb-1">{t("Số ghế mỗi hàng")}</label>
                  <input
                    type="number"
                    min={1}
                    max={40}
                    value={matrixCols}
                    onChange={(e) => setMatrixCols(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl app-bg-card border app-border app-text-main font-mono font-bold text-center"
                  />
                </div>
              </div>
            )}

            {layoutType === 'ARC' && (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold app-text-muted mb-1">{t("Tên hàng cong")}</label>
                  <input
                    type="text"
                    value={arcRowLetter}
                    onChange={(e) => setArcRowLetter(e.target.value.toUpperCase())}
                    maxLength={3}
                    className="w-full px-3 py-2 rounded-xl app-bg-card border app-border app-text-main font-mono font-bold text-center uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold app-text-muted mb-1">{t("Số ghế trên vòm")}</label>
                  <input
                    type="number"
                    min={2}
                    max={40}
                    value={arcCount}
                    onChange={(e) => setArcCount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl app-bg-card border app-border app-text-main font-mono font-bold text-center"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold app-text-muted mb-1">{t("Bán kính cong (px)")}</label>
                  <input
                    type="number"
                    min={150}
                    max={600}
                    step={10}
                    value={arcRadius}
                    onChange={(e) => setArcRadius(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl app-bg-card border app-border app-text-main font-mono font-bold text-center"
                  />
                </div>
              </div>
            )}

            {layoutType === 'GALA' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold app-text-muted mb-1">{t("Số lượng bàn tròn")}</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={galaTableCount}
                    onChange={(e) => setGalaTableCount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl app-bg-card border app-border app-text-main font-mono font-bold text-center"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold app-text-muted mb-1">{t("Số ghế quanh mỗi bàn")}</label>
                  <select
                    value={galaSeatsPerTable}
                    onChange={(e) => setGalaSeatsPerTable(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl app-bg-card border app-border app-text-main font-bold"
                  >
                    {[4, 6, 8, 10, 12, 16].map((num) => (
                      <option key={num} value={num}>
                        {num} {t("Ghế / Bàn")}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Kiểu đường viền zone */}
            <div className="pt-2 border-t app-border flex items-center justify-between">
              <span className="text-[11px] font-bold app-text-muted">{t("Kiểu đường viền Khối Zone:")}</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setBorderStyle('dashed')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold border cursor-pointer ${
                    borderStyle === 'dashed' ? 'bg-blue-600 text-white border-blue-500' : 'app-bg-card app-text-muted border-app-border'
                  }`}
                >
                  {t("Nét đứt (Dashed)")}
                </button>
                <button
                  type="button"
                  onClick={() => setBorderStyle('solid')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold border cursor-pointer ${
                    borderStyle === 'solid' ? 'bg-blue-600 text-white border-blue-500' : 'app-bg-card app-text-muted border-app-border'
                  }`}
                >
                  {t("Nét liền (Solid)")}
                </button>
              </div>
            </div>
          </div>

          {/* Auto-Fitting Dimension Summary Banner */}
          <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 text-blue-700 dark:text-blue-300 text-xs font-bold space-y-1">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-blue-700 dark:text-blue-300 font-extrabold">
                <FiMaximize2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>{t("Kích thước Zone tự động cân chỉnh vừa ghế:")}</span>
              </span>
              <span className="font-mono text-sm font-black text-blue-600 dark:text-blue-400">{computedWidth}px x {computedHeight}px</span>
            </div>
            <p className="text-[11px] text-blue-600/90 dark:text-blue-300/90 font-semibold">{layoutDesc} — {t("Tất cả ghế tự động căn giữa và nằm gọn hoàn toàn bên trong ranh giới Zone.")}</p>
          </div>

          {/* Footer Action Buttons - Identical to TierManagerModal */}
          <div className="pt-3 flex justify-end gap-3 border-t app-border">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl app-bg-card border app-border app-text-muted hover:app-text-main text-xs font-bold transition-all cursor-pointer"
            >
              {t("Hủy")}
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-extrabold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-md cursor-pointer"
            >
              <FiCheck className="w-4 h-4" />
              <span>{t('Tạo Khu Vực')} ({seatTotal > 0 ? `${seatTotal} ${t('ghế')}` : t('Không ghế')})</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const portalTarget = typeof document !== 'undefined' ? (document.fullscreenElement || document.body) : null;
  if (!portalTarget) return null;

  return createPortal(modalContent, portalTarget);
};

export default ZoneGeneratorModal;
