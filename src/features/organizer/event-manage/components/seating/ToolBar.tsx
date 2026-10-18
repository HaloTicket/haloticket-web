import React, { useState } from 'react';
import {
  FiGrid,
  FiCopy,
  FiTrash2,
  FiCheckSquare,
  FiLayers,
  FiShield,
} from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import type {
  ToolBarProps,
} from '@/types/seating';
import { ZoneGeneratorModal } from './ZoneGeneratorModal';

// seating editor toolbar component
export const ToolBar: React.FC<ToolBarProps> = ({
  selectedSeatIds,
  onAddStage,
  onAddStructure,
  onAddZoneBlock,
  onDeleteSelected,
  onDuplicateSelected,
  onSelectAll,
}) => {
  const { t } = useTranslation();
  // Zone Generator modal visibility state
  const [isZoneModalOpen, setIsZoneModalOpen] = useState(false);

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
            {t("Thao Tác & Công Cụ")}
          </span>
        </div>

        <div className="w-8 h-px app-bg-border" />

        {/* Group 1: Zone Generator */}
        <div className="flex flex-col gap-1.5 w-full items-center">
          {/* Zone Block Generator Modal Trigger */}
          <div className="relative group w-full flex justify-center">
            <button
              type="button"
              onClick={() => setIsZoneModalOpen(true)}
              className="w-9 h-9 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/50 text-cyan-400 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
            >
              <FiCheckSquare className="w-4 h-4" />
            </button>
            <span className="absolute left-full ml-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1 text-[11px] font-extrabold text-slate-100 bg-slate-900 border border-slate-700/80 rounded-lg shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
              {t("Tạo Khu Vực (Zone)")}
            </span>
          </div>
        </div>

        <div className="w-8 h-px app-bg-border" />

        {/* Group 2: Stage & Structure */}
        <div className="flex flex-col gap-1.5 w-full items-center">
          <div className="relative group w-full flex justify-center">
            <button
              type="button"
              onClick={() => onAddStage(t('SÂN KHẤU CHÍNH'))}
              className="w-9 h-9 rounded-xl app-bg-main hover:app-bg-hover border app-border hover:border-indigo-500/50 text-indigo-500 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
            >
              <FiLayers className="w-4 h-4" />
            </button>
            <span className="absolute left-full ml-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1 text-[11px] font-extrabold text-slate-100 bg-slate-900 border border-slate-700/80 rounded-lg shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
              {t("Sân khấu chính")}
            </span>
          </div>

          <div className="relative group w-full flex justify-center">
            <button
              type="button"
              onClick={() => onAddStructure('exit', t('LỐI THOÁT HIỂM'))}
              className="w-9 h-9 rounded-xl app-bg-main hover:app-bg-hover border app-border hover:border-rose-500/50 text-rose-500 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
            >
              <FiShield className="w-4 h-4" />
            </button>
            <span className="absolute left-full ml-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1 text-[11px] font-extrabold text-slate-100 bg-slate-900 border border-slate-700/80 rounded-lg shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
              {t("Lối thoát hiểm")}
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
              {t("Chọn tất cả ghế")}
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
              {t("Nhân bản phần tử chọn")}
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
              {t("Xóa phần tử chọn")}
            </span>
          </div>
        </div>
      </div>

      {/* Render ZoneGeneratorModal when triggered */}
      <ZoneGeneratorModal
        isOpen={isZoneModalOpen}
        onClose={() => setIsZoneModalOpen(false)}
        onGenerateZone={(config) => {
          if (onAddZoneBlock) {
            onAddZoneBlock(config);
          }
        }}
      />
    </>
  );
};
