import React, { useState } from "react";

interface AdvancedFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: { location: string; isFree: boolean; category: string }) => void;
  currentLocation?: string;
  currentCategory?: string;
}

export const AdvancedFilterModal: React.FC<AdvancedFilterModalProps> = ({
  isOpen,
  onClose,
  onApply,
  currentLocation = "Toàn quốc",
  currentCategory = "Tất cả"
}) => {
  const [selectedLocation, setSelectedLocation] = useState<string>(currentLocation);
  const [isFree, setIsFree] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>(currentCategory);

  if (!isOpen) return null;

  const locations = [
    "Toàn quốc",
    "Hồ Chí Minh",
    "Hà Nội",
    "Đà Lạt",
    "Vị trí khác"
  ];

  const categories = [
    "Nhạc sống",
    "Sân khấu & Nghệ thuật",
    "Thể Thao",
    "Hội thảo & Workshop",
    "Tham quan & Trải nghiệm",
    "Khác"
  ];

  const handleReset = () => {
    setSelectedLocation("Toàn quốc");
    setIsFree(false);
    setSelectedCategory("Tất cả");
  };

  const handleApply = () => {
    onApply({
      location: selectedLocation,
      isFree,
      category: selectedCategory
    });
    onClose();
  };

  return (
    <div className="absolute top-full right-0 z-50 mt-2 w-[85vw] sm:w-[360px] app-bg-card border app-border rounded-3xl p-5 md:p-6 shadow-2xl space-y-5 animate-in fade-in slide-in-from-top-2">
      {/* Location Section */}
      <div className="space-y-3">
        <h4 className="font-extrabold text-xs md:text-sm app-text-main">
          Vị trí
        </h4>
        <div className="space-y-2 text-xs font-semibold">
          {locations.map((loc) => (
            <label
              key={loc}
              className="flex items-center gap-3 cursor-pointer py-1 hover:app-text-brand transition-colors"
            >
              <input
                type="radio"
                name="location"
                checked={selectedLocation === loc}
                onChange={() => setSelectedLocation(loc)}
                className="w-4 h-4 accent-brand-primary cursor-pointer"
              />
              <span className="app-text-main">{loc}</span>
            </label>
          ))}
        </div>
      </div>

      <hr className="border-slate-200/60 dark:border-slate-800/60" />

      {/* Price Section */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-extrabold text-xs md:text-sm app-text-main">
            Giá tiền
          </h4>
          <span className="text-xs font-semibold app-text-muted">Miễn phí</span>
        </div>

        {/* Toggle Switch */}
        <button
          type="button"
          onClick={() => setIsFree(!isFree)}
          className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${isFree ? "bg-brand-primary" : "bg-slate-300 dark:bg-slate-700"
            }`}
        >
          <span
            className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform shadow-md ${isFree ? "translate-x-5" : "translate-x-0"
              }`}
          />
        </button>
      </div>

      <hr className="border-slate-200/60 dark:border-slate-800/60" />

      {/* Category Section */}
      <div className="space-y-3">
        <h4 className="font-extrabold text-xs md:text-sm app-text-main">
          Thể loại
        </h4>

        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() =>
                setSelectedCategory(selectedCategory === cat ? "Tất cả" : cat)
              }
              className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold transition-all cursor-pointer ${selectedCategory === cat
                  ? "border border-brand-primary app-text-brand bg-brand-primary/10 shadow-xs"
                  : "border app-border app-text-muted hover:app-text-main"
                }`}
            >
              {cat}
            </button>
          ))}
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

export default AdvancedFilterModal;
