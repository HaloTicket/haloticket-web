import { useTranslation } from "react-i18next";
import React, { useState, useEffect } from "react";
import { adminConfigApi } from "@/services/adminConfigApi";
import { ANY, CITY_OTHER } from "../eventSearchFilters";

/** Phần bộ lọc nâng cao: thành phố, danh mục và sự kiện miễn phí. Thành phố và danh mục dùng chuỗi rỗng cho "không lọc". */
export interface AdvancedFilterValues {
  city: string;
  category: string;
  free: boolean;
}

/** Props của hộp thoại lọc nâng cao: trạng thái mở, hàm đóng, hàm áp dụng và giá trị đang áp dụng. */
interface AdvancedFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: AdvancedFilterValues) => void;
  value: AdvancedFilterValues;
}

/** Các lựa chọn thành phố: giá trị dùng để lọc (không phụ thuộc ngôn ngữ) và nhãn tiếng Việt làm khóa dịch. */
const LOCATIONS: { value: string; label: string }[] = [
  { value: ANY, label: "Toàn quốc" },
  { value: "Hồ Chí Minh", label: "Hồ Chí Minh" },
  { value: "Hà Nội", label: "Hà Nội" },
  { value: "Đà Lạt", label: "Đà Lạt" },
  { value: CITY_OTHER, label: "Vị trí khác" },
];

/**
 * Hộp thoại lọc nâng cao theo thành phố, sự kiện miễn phí và danh mục (danh mục đang hoạt động lấy từ API).
 * Giá trị đang áp dụng được nạp lại mỗi lần mở, nên công tắc miễn phí luôn khớp với bộ lọc thật.
 */
export const AdvancedFilterModal: React.FC<AdvancedFilterModalProps> = ({ isOpen, onClose, onApply, value }) => {
  const { t: translate } = useTranslation();
  const [city, setCity] = useState<string>(value.city);
  const [free, setFree] = useState<boolean>(value.free);
  const [category, setCategory] = useState<string>(value.category);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    adminConfigApi
      .getCategories()
      .then((res) => {
        const cats = (res as { data?: unknown })?.data || res;
        if (Array.isArray(cats)) {
          setCategories(cats.filter((c) => c.active && c.status !== "INACTIVE").map((c) => c.name));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isOpen) {
      setCity(value.city);
      setCategory(value.category);
      setFree(value.free);
    }
  }, [isOpen, value.city, value.category, value.free]);

  if (!isOpen) return null;

  /** Đưa các bộ lọc về mặc định (toàn quốc, không miễn phí, mọi danh mục). */
  const handleReset = () => {
    setCity(ANY);
    setFree(false);
    setCategory(ANY);
  };

  /** Gửi bộ lọc đã chọn lên cha rồi đóng hộp thoại. */
  const handleApply = () => {
    onApply({ city, free, category });
    onClose();
  };

  return (
    <div className="absolute top-full right-0 z-50 mt-2 w-[85vw] sm:w-[360px] app-bg-card border app-border rounded-3xl p-5 md:p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
      {/* Phần địa điểm */}
      <div className="space-y-3">
        <h4 className="font-extrabold text-xs md:text-sm app-text-main">{translate("Vị trí")}</h4>
        <div className="space-y-2 text-xs font-semibold">
          {LOCATIONS.map((loc) => (
            <label key={loc.label} className="flex items-center gap-3 cursor-pointer py-1 hover:app-text-brand transition-colors">
              <input
                type="radio"
                name="location"
                checked={city === loc.value}
                onChange={() => setCity(loc.value)}
                className="w-4 h-4 accent-brand-primary cursor-pointer"
              />
              <span className="app-text-main">{translate(loc.label)}</span>
            </label>
          ))}
        </div>
      </div>

      <hr className="border-slate-200/60 dark:border-slate-800/60" />

      {/* Phần giá */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-extrabold text-xs md:text-sm app-text-main">{translate("Giá tiền")}</h4>
          <span className="text-xs font-semibold app-text-muted">{translate("Miễn phí")}</span>
        </div>

        {/* Công tắc bật tắt */}
        <button
          type="button"
          role="switch"
          aria-checked={free}
          aria-label={translate("Chỉ hiện sự kiện miễn phí")}
          onClick={() => setFree(!free)}
          className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${free ? "bg-brand-primary" : "bg-slate-300 dark:bg-slate-700"}`}
        >
          <span
            className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform shadow-md ${free ? "translate-x-5" : "translate-x-0"}`}
          />
        </button>
      </div>

      <hr className="border-slate-200/60 dark:border-slate-800/60" />

      {/* Phần danh mục */}
      <div className="space-y-3">
        <h4 className="font-extrabold text-xs md:text-sm app-text-main">{translate("Thể loại")}</h4>

        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              aria-pressed={category === cat}
              onClick={() => setCategory(category === cat ? ANY : cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold transition-all cursor-pointer ${
                category === cat
                  ? "border border-brand-primary app-text-brand bg-brand-primary/10 shadow-xs"
                  : "border app-border app-text-muted hover:app-text-main"
              }`}
            >
              {translate(cat)}
            </button>
          ))}
        </div>
      </div>

      {/* Các nút thao tác ở chân hộp thoại */}
      <div className="flex items-center gap-3 pt-3 border-t border-slate-200/60 dark:border-slate-800/60">
        <button
          type="button"
          onClick={handleReset}
          className="flex-1 py-2.5 rounded-xl border border-brand-primary/40 text-xs font-extrabold app-text-brand hover:bg-brand-primary/10 transition-colors cursor-pointer"
        >
          {translate("Thiết lập lại")}
        </button>
        <button
          type="button"
          onClick={handleApply}
          className="flex-1 py-2.5 rounded-xl gradient-btn text-white text-xs font-extrabold shadow-md hover:scale-102 active:scale-95 transition-transform cursor-pointer"
        >
          {translate("Áp dụng")}
        </button>
      </div>
    </div>
  );
};

export default AdvancedFilterModal;
