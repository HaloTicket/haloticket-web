import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { FiCheckCircle, FiInfo, FiChevronDown, FiChevronUp, FiMaximize2, FiSun, FiCrop, FiRotateCw } from "react-icons/fi";

export const VnptInputStandardsGuide: React.FC = () => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-2xl border app-border app-bg-card shadow-xs overflow-hidden transition-all">
      {/* Header Bar */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 sm:px-5 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-200/50 dark:border-blue-900/50">
            <FiInfo className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs sm:text-sm font-bold app-text-main">
                {t("Tiêu chuẩn ảnh đầu vào Căn cước công dân (VNPT eKYC)")}
              </h4>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-200 dark:border-emerald-800">
                {t("Chuẩn quốc gia")}
              </span>
            </div>
            <p className="text-[11px] app-text-muted mt-0.5 hidden sm:block">
              {t("Độ phân giải tối thiểu 600x900px, dung lượng dưới 5MB, đủ 4 góc, đặt theo chiều ngang")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 shrink-0">
          <span className="hidden sm:inline">{expanded ? t("Thu gọn") : t("Xem chi tiết tiêu chuẩn")}</span>
          {expanded ? <FiChevronUp className="w-4 h-4" /> : <FiChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Expanded Content Matching Official VNPT Specification */}
      {expanded && (
        <div className="p-4 sm:p-6 border-t app-border bg-slate-50/50 dark:bg-zinc-900/40 space-y-5 animate-in fade-in duration-200">
          {/* Resolution Specification 3-Column Grid */}
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              {t("1. Yêu cầu độ phân giải ảnh (Rộng x Cao - WxH)")}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Minimum */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 text-center space-y-1">
                <p className="text-base font-extrabold app-text-main">600 × 900 px</p>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400">{t("Rộng x Cao (WxH)")}</p>
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-[10px] font-bold">
                  {t("Độ phân giải tối thiểu")}
                </span>
              </div>

              {/* Good (HD) */}
              <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/30 text-center space-y-1">
                <p className="text-base font-extrabold text-blue-700 dark:text-blue-300">720 × 1080 px</p>
                <p className="text-[11px] text-blue-600/70 dark:text-blue-300/70">{t("Chuẩn HD (Khuyên dùng)")}</p>
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-[10px] font-bold">
                  {t("Độ phân giải tốt")}
                </span>
              </div>

              {/* Best (Full HD) */}
              <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/30 text-center space-y-1">
                <p className="text-base font-extrabold text-emerald-700 dark:text-emerald-300">1080 × 1920 px</p>
                <p className="text-[11px] text-emerald-600/70 dark:text-emerald-300/70">{t("Chuẩn Full HD")}</p>
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                  {t("Độ phân giải tốt nhất")}
                </span>
              </div>
            </div>
          </div>

          {/* Detailed Criteria List */}
          <div className="space-y-2.5 pt-2">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              {t("2. Quy định hình ảnh hợp lệ")}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white dark:bg-zinc-900 border app-border">
                <FiCheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span className="app-text-muted">
                  <strong className="app-text-main">{t("Ảnh gốc trực tiếp:")}</strong> {t("Không sử dụng ảnh scan, ảnh chụp lại màn hình hoặc bản photocopy. Dung lượng dưới 5MB.")}
                </span>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white dark:bg-zinc-900 border app-border">
                <FiRotateCw className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <span className="app-text-muted">
                  <strong className="app-text-main">{t("Chiều ngang chuẩn đọc:")}</strong> {t("Mặt thẻ phải đặt nằm ngang. Nếu chụp dọc, vui lòng dùng công cụ Xoay ảnh trước khi gửi.")}
                </span>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white dark:bg-zinc-900 border app-border">
                <FiCrop className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span className="app-text-muted">
                  <strong className="app-text-main">{t("Đủ 4 góc & viền:")}</strong> {t("Giấy tờ nguyên vẹn, không bị mất góc, không bị bấm lỗ, không mất viền hoặc mép thẻ.")}
                </span>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white dark:bg-zinc-900 border app-border">
                <FiSun className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span className="app-text-muted">
                  <strong className="app-text-main">{t("Không lóa sáng / mờ nhòe:")}</strong> {t("Chụp nơi đủ sáng, tắt đèn flash nếu gây bóng lóa trên bề mặt chip hoặc số định danh.")}
                </span>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white dark:bg-zinc-900 border app-border">
                <FiMaximize2 className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <span className="app-text-muted">
                  <strong className="app-text-main">{t("Tỷ lệ khung hình:")}</strong> {t("Diện tích CCCD chiếm từ 1/3 đến 4/5 tổng diện tích ảnh, chỉ có 1 thẻ CCCD trong ảnh.")}
                </span>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white dark:bg-zinc-900 border app-border">
                <FiCheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span className="app-text-muted">
                  <strong className="app-text-main">{t("Rõ số và mã chip:")}</strong> {t("Thấy rõ 12 số định danh, ngày sinh, họ tên (mặt trước) và vi mạch chip + 3 dòng MRZ (mặt sau).")}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default VnptInputStandardsGuide;
