import React, { useState, useEffect } from "react";

export interface FilterState {
  sortOption: "latest" | "price-asc" | "price-desc";
  selectedQuantity: number;
  selectedShowtime: string;
  selectedTier: string;
  retailFilter: "all" | "retail" | "non-retail";
}

interface ResaleFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  onApplyFilters: (newFilters: FilterState) => void;
  onResetFilters: () => void;
}

export const ResaleFilterModal: React.FC<ResaleFilterModalProps> = ({
  isOpen,
  onClose,
  filters,
  onApplyFilters,
  onResetFilters
}) => {
  const [localFilters, setLocalFilters] = useState<FilterState>(filters);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters, isOpen]);

  if (!isOpen) return null;

  const handleReset = () => {
    onResetFilters();
  };

  const handleApply = () => {
    onApplyFilters(localFilters);
    onClose();
  };

  return (
    <div className="absolute right-0 top-11 z-50 w-[360px] md:w-[450px] app-bg-card border app-border rounded-3xl p-5 md:p-6 shadow-2xl space-y-5 animate-in fade-in slide-in-from-top-2">
      {/* Sorting */}
      <div>
        <h4 className="font-extrabold text-sm app-text-main mb-2">Sắp xếp</h4>
        <div className="space-y-2 text-xs md:text-sm font-medium app-text-main">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="sortOption"
              checked={localFilters.sortOption === "latest"}
              onChange={() => setLocalFilters({ ...localFilters, sortOption: "latest" })}
              className="accent-indigo-600 cursor-pointer"
            />
            <span>Tin đăng mới nhất</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="sortOption"
              checked={localFilters.sortOption === "price-asc"}
              onChange={() => setLocalFilters({ ...localFilters, sortOption: "price-asc" })}
              className="accent-indigo-600 cursor-pointer"
            />
            <span>Giá từ thấp đến cao</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="sortOption"
              checked={localFilters.sortOption === "price-desc"}
              onChange={() => setLocalFilters({ ...localFilters, sortOption: "price-desc" })}
              className="accent-indigo-600 cursor-pointer"
            />
            <span>Giá từ cao đến thấp</span>
          </label>
        </div>
      </div>

      <hr className="border-slate-200/60 dark:border-slate-800/60" />

      {/* Ticket quantity */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-extrabold text-sm app-text-main">Số lượng vé</h4>
          <span className="px-2 py-0.5 rounded text-[11px] font-bold gradient-btn text-white">
            {localFilters.selectedQuantity === 0 ? "Tất cả" : `${localFilters.selectedQuantity} vé`}
          </span>
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
          <button
            type="button"
            onClick={() => setLocalFilters({ ...localFilters, selectedQuantity: 0 })}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${localFilters.selectedQuantity === 0
              ? "bg-brand-primary text-white"
              : "bg-zinc-100 dark:bg-zinc-800 app-text-muted"
              }`}
          >
            Tất cả
          </button>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => setLocalFilters({ ...localFilters, selectedQuantity: num })}
              className={`w-7 h-7 rounded-lg text-xs font-bold shrink-0 transition-colors ${localFilters.selectedQuantity === num
                ? "bg-brand-primary text-white"
                : "bg-zinc-100 dark:bg-zinc-800 app-text-muted hover:app-text-main"
                }`}
            >
              {num}
            </button>
          ))}
        </div>
      </div>

      <hr className="border-slate-200/60 dark:border-slate-800/60" />

      {/* Showtime dropdown */}
      <div>
        <h4 className="font-extrabold text-sm app-text-main mb-2">Suất diễn</h4>
        <select
          value={localFilters.selectedShowtime}
          onChange={(e) => setLocalFilters({ ...localFilters, selectedShowtime: e.target.value })}
          className="w-full p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border app-border text-xs md:text-sm font-semibold app-text-main focus:outline-none focus:border-brand-primary"
        >
          <option value="19:00, 06 tháng 09, 2026">19:00, 06 tháng 09, 2026</option>
        </select>
      </div>

      <hr className="border-slate-200/60 dark:border-slate-800/60" />

      {/* Ticket Type Dropdown */}
      <div>
        <h4 className="font-extrabold text-sm app-text-main mb-1">Loại vé</h4>
        <p className="text-[11px] app-text-muted mb-2">Vui lòng chọn suất diễn để lọc theo loại vé</p>
        <select
          value={localFilters.selectedTier}
          onChange={(e) => setLocalFilters({ ...localFilters, selectedTier: e.target.value })}
          className="w-full p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border app-border text-xs md:text-sm font-semibold app-text-main focus:outline-none focus:border-brand-primary"
        >
          <option value="all">Tất cả hạng vé</option>
          <option value="XOAY TRÒN A2">XOAY TRÒN A2 (SEATED)</option>
          <option value="XOAY ĐỀU B">XOAY ĐỀU B (STANDING)</option>
          <option value="XOAY TRÒN B1">XOAY TRÒN B1 (SEATED)</option>
          <option value="XOAY ĐỀU A">XOAY ĐỀU A (STANDING)</option>
        </select>
      </div>

      <hr className="border-slate-200/60 dark:border-slate-800/60" />

      {/* Retail/Non-Retail Pills */}
      <div>
        <h4 className="font-extrabold text-sm app-text-main mb-2">Hình thức bán</h4>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setLocalFilters({
                ...localFilters,
                retailFilter: localFilters.retailFilter === "retail" ? "all" : "retail"
              })
            }
            className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-colors ${localFilters.retailFilter === "retail"
              ? "bg-brand-primary text-white border-brand-primary"
              : "app-bg-card border-slate-300 dark:border-zinc-700 app-text-main hover:border-brand-primary"
              }`}
          >
            Bán lẻ
          </button>
          <button
            type="button"
            onClick={() =>
              setLocalFilters({
                ...localFilters,
                retailFilter: localFilters.retailFilter === "non-retail" ? "all" : "non-retail"
              })
            }
            className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-colors ${localFilters.retailFilter === "non-retail"
              ? "bg-brand-primary text-white border-brand-primary"
              : "app-bg-card border-slate-300 dark:border-zinc-700 app-text-main hover:border-brand-primary"
              }`}
          >
            Không bán lẻ
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-2 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleReset}
          className="w-1/2 py-2.5 rounded-xl border border-brand-primary app-text-brand font-bold text-xs md:text-sm hover:bg-brand-primary/10 transition-colors cursor-pointer"
        >
          Thiết lập lại
        </button>
        <button
          type="button"
          onClick={handleApply}
          className="w-1/2 py-2.5 rounded-xl gradient-btn text-white font-extrabold text-xs md:text-sm shadow-md hover:scale-105 transition-transform cursor-pointer"
        >
          Áp dụng
        </button>
      </div>
    </div>
  );
};

export default ResaleFilterModal;
