import React, { useState } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

interface DateFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (selectedPreset: string, dateRange?: { start?: string; end?: string }) => void;
  currentPreset?: string;
}

export const DateFilterModal: React.FC<DateFilterModalProps> = ({
  isOpen,
  onClose,
  onApply,
  currentPreset = "Tất cả các ngày"
}) => {
  const [selectedPreset, setSelectedPreset] = useState<string>(currentPreset);
  const [selectedDay, setSelectedDay] = useState<number | null>(3);

  if (!isOpen) return null;

  const presetOptions = [
    "Tất cả các ngày",
    "Hôm nay",
    "Ngày mai",
    "Cuối tuần này",
    "Tháng này"
  ];

  const septDays = Array.from({ length: 30 }, (_, i) => i + 1);
  const octDays = Array.from({ length: 31 }, (_, i) => i + 1);

  const handleReset = () => {
    setSelectedPreset("Tất cả các ngày");
    setSelectedDay(null);
  };

  const handleApply = () => {
    onApply(selectedPreset);
    onClose();
  };

  return (
    <div className="absolute top-full right-0 z-50 mt-2 w-[90vw] sm:w-[580px] app-bg-card border app-border rounded-3xl p-5 md:p-6 shadow-2xl space-y-5 animate-in fade-in slide-in-from-top-2">
      {/* Preset Pill Filters */}
      <div className="flex flex-wrap gap-2 pb-4 border-b border-slate-200/60 dark:border-slate-800/60">
        {presetOptions.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => setSelectedPreset(preset)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold transition-all cursor-pointer ${
              selectedPreset === preset
                ? "border border-brand-primary app-text-brand bg-brand-primary/10 shadow-xs"
                : "border app-border app-text-muted hover:app-text-main"
            }`}
          >
            {preset}
          </button>
        ))}
      </div>

      {/* Calendar Header & Dual Months */}
      <div className="space-y-4">
        <div className="flex items-center justify-between font-extrabold text-xs md:text-sm app-text-main px-2">
          <button type="button" className="p-1 hover:app-text-brand cursor-pointer">
            <FiChevronLeft className="w-4 h-4" />
          </button>
          <span>Tháng 09, 2026</span>
          <span className="hidden sm:inline">Tháng 10, 2026</span>
          <button type="button" className="p-1 hover:app-text-brand cursor-pointer">
            <FiChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Dual Month Calendar Grids */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
          {/* Month 1: Tháng 09, 2026 */}
          <div>
            <div className="grid grid-cols-7 gap-1 text-center font-bold app-text-muted mb-2">
              <span>T2</span><span>T3</span><span>T4</span><span>T5</span><span>T6</span><span>T7</span><span>CN</span>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center font-semibold">
              <span className="text-transparent">31</span>
              {septDays.map((day) => (
                <button
                  key={`sept-${day}`}
                  type="button"
                  onClick={() => setSelectedDay(day)}
                  className={`h-8 w-8 mx-auto rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                    selectedDay === day
                      ? "gradient-btn text-white font-extrabold shadow-sm"
                      : "hover:bg-zinc-100 dark:hover:bg-zinc-800 app-text-main"
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          {/* Month 2: Tháng 10, 2026 */}
          <div className="hidden sm:block">
            <div className="grid grid-cols-7 gap-1 text-center font-bold app-text-muted mb-2">
              <span>T2</span><span>T3</span><span>T4</span><span>T5</span><span>T6</span><span>T7</span><span>CN</span>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center font-semibold">
              <span className="text-transparent"></span>
              <span className="text-transparent"></span>
              <span className="text-transparent"></span>
              {octDays.map((day) => (
                <button
                  key={`oct-${day}`}
                  type="button"
                  onClick={() => setSelectedDay(day + 30)}
                  className={`h-8 w-8 mx-auto rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                    selectedDay === day + 30
                      ? "gradient-btn text-white font-extrabold shadow-sm"
                      : "hover:bg-zinc-100 dark:hover:bg-zinc-800 app-text-main"
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer Buttons */}
      <div className="flex items-center gap-3 pt-3 border-t border-slate-200/60 dark:border-slate-800/60">
        <button
          type="button"
          onClick={handleReset}
          className="flex-1 py-2.5 rounded-xl border border-brand-primary/40 text-xs font-extrabold app-text-brand hover:bg-brand-primary/10 transition-colors cursor-pointer"
        >
          Thiết lập lại
        </button>
        <button
          type="button"
          onClick={handleApply}
          className="flex-1 py-2.5 rounded-xl gradient-btn text-white text-xs font-extrabold shadow-md hover:scale-102 active:scale-95 transition-transform cursor-pointer"
        >
          Áp dụng
        </button>
      </div>
    </div>
  );
};

export default DateFilterModal;
