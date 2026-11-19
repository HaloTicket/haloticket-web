import { useTranslation } from "react-i18next";
import React, { useEffect, useState } from "react";
import type { DatePreset } from "../eventSearchFilters";

/** Giá trị bộ lọc ngày: lựa chọn nhanh, hoặc khoảng ngày `YYYY-MM-DD` khi chọn `custom`. */
export interface DateFilterValue {
  date: DatePreset;
  from: string;
  to: string;
}

/** Props của hộp thoại lọc ngày: trạng thái mở, hàm đóng, hàm áp dụng và giá trị đang áp dụng. */
interface DateFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (value: DateFilterValue) => void;
  value: DateFilterValue;
}

/** Các lựa chọn nhanh: giá trị dùng để lọc và nhãn tiếng Việt làm khóa dịch. */
const PRESETS: { value: DatePreset; label: string }[] = [
  { value: "all", label: "Tất cả các ngày" },
  { value: "today", label: "Hôm nay" },
  { value: "tomorrow", label: "Ngày mai" },
  { value: "weekend", label: "Cuối tuần này" },
  { value: "month", label: "Tháng này" },
];

/**
 * Hộp thoại lọc theo ngày gồm các lựa chọn nhanh (hôm nay, ngày mai, cuối tuần, tháng này) và khoảng ngày tự chọn.
 * Giá trị đang áp dụng được nạp lại mỗi lần mở.
 */
export const DateFilterModal: React.FC<DateFilterModalProps> = ({ isOpen, onClose, onApply, value }) => {
  const { t: translate } = useTranslation();
  const [preset, setPreset] = useState<DatePreset>(value.date);
  const [from, setFrom] = useState<string>(value.from);
  const [to, setTo] = useState<string>(value.to);

  useEffect(() => {
    if (isOpen) {
      setPreset(value.date);
      setFrom(value.from);
      setTo(value.to);
    }
  }, [isOpen, value.date, value.from, value.to]);

  if (!isOpen) return null;

  const rangeInvalid = preset === "custom" && Boolean(from) && Boolean(to) && from > to;

  /** Đưa lựa chọn về "Tất cả các ngày" và xóa khoảng ngày. */
  const handleReset = () => {
    setPreset("all");
    setFrom("");
    setTo("");
  };

  /** Gửi lựa chọn lên cha rồi đóng hộp thoại; khoảng tùy chọn bỏ trống cả hai đầu thì coi như không lọc ngày. */
  const handleApply = () => {
    if (rangeInvalid) return;
    if (preset === "custom" && !from && !to) {
      onApply({ date: "all", from: "", to: "" });
    } else {
      onApply({ date: preset, from: preset === "custom" ? from : "", to: preset === "custom" ? to : "" });
    }
    onClose();
  };

  return (
    <div className="absolute top-full right-0 z-50 mt-2 w-[90vw] sm:w-105 app-bg-card border app-border rounded-3xl p-5 md:p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
      {/* Các nút lọc nhanh dạng viên thuốc */}
      <div className="flex flex-wrap gap-2 pb-4 border-b border-slate-200/60 dark:border-slate-800/60">
        {PRESETS.map((item) => (
          <button
            key={item.value}
            type="button"
            aria-pressed={preset === item.value}
            onClick={() => setPreset(item.value)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold transition-all cursor-pointer ${
              preset === item.value
                ? "border border-brand-primary app-text-brand bg-brand-primary/10 shadow-xs"
                : "border app-border app-text-muted hover:app-text-main"
            }`}
          >
            {translate(item.label)}
          </button>
        ))}
      </div>

      {/* Khoảng ngày tự chọn */}
      <div className="space-y-2">
        <h4 className="font-extrabold text-xs md:text-sm app-text-main">{translate("Chọn khoảng ngày")}</h4>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <label className="space-y-1">
            <span className="font-bold app-text-muted">{translate("Từ ngày")}</span>
            <input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPreset("custom");
              }}
              className="w-full px-3 py-2 rounded-xl app-bg-main border app-border app-text-main font-semibold"
            />
          </label>
          <label className="space-y-1">
            <span className="font-bold app-text-muted">{translate("Đến ngày")}</span>
            <input
              type="date"
              value={to}
              min={from || undefined}
              onChange={(e) => {
                setTo(e.target.value);
                setPreset("custom");
              }}
              className="w-full px-3 py-2 rounded-xl app-bg-main border app-border app-text-main font-semibold"
            />
          </label>
        </div>
        {rangeInvalid && (
          <p role="alert" className="text-[11px] font-semibold text-rose-500">
            {translate("Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.")}
          </p>
        )}
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
          disabled={rangeInvalid}
          className="flex-1 py-2.5 rounded-xl gradient-btn text-white text-xs font-extrabold shadow-md hover:scale-102 active:scale-95 transition-transform cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {translate("Áp dụng")}
        </button>
      </div>
    </div>
  );
};

export default DateFilterModal;
