import { useTranslation } from "react-i18next";
import {
  FiCheck,
  FiRefreshCw,
  FiRotateCcw,
  FiRotateCw,
  FiArrowLeft,
  FiCreditCard,
  FiCamera,
} from "react-icons/fi";
import { type ImageMetadata } from "@/utils/imageUtils";

interface ReviewStepProps {
  previews: (string | null)[];
  metadatas: (ImageMetadata | null)[];
  files: (File | null)[];
  rotatingIndex: number | null;
  consent: boolean;
  busy: boolean;
  onConsentChange: (v: boolean) => void;
  onRotate: (index: number, degrees: number) => void;
  onGoToStep: (step: 1 | 2 | 3) => void;
  onPrev: () => void;
  returnUrl: string;
}

export function ReviewSubmitStep({
  previews,
  metadatas,
  files,
  rotatingIndex,
  consent,
  busy,
  onConsentChange,
  onRotate,
  onGoToStep,
  onPrev,
}: ReviewStepProps) {
  const { t } = useTranslation();

  const sides = [
    {
      index: 0,
      label: t("CCCD mặt trước"),
      goToStep: () => onGoToStep(1),
      icon: <FiCreditCard className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
      changeLabel: t("Thay đổi"),
      emptyActionLabel: t("Tải lên"),
      noImageText: t("Chưa có ảnh mặt trước"),
      canRotate: true,
    },
    {
      index: 1,
      label: t("CCCD mặt sau"),
      goToStep: () => onGoToStep(2),
      icon: <FiCreditCard className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
      changeLabel: t("Thay đổi"),
      emptyActionLabel: t("Tải lên"),
      noImageText: t("Chưa có ảnh mặt sau"),
      canRotate: true,
    },
    {
      index: 2,
      label: t("Khuôn mặt"),
      goToStep: () => onGoToStep(3),
      icon: <FiCamera className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
      changeLabel: t("Chụp lại"),
      emptyActionLabel: t("Chụp ảnh"),
      noImageText: t("Chưa chụp ảnh"),
      canRotate: true,
    },
  ] as const;

  return (
    <div className="space-y-5">
      {/* Step Header */}
      <div className="space-y-1">
        <h3 className="text-base sm:text-lg font-bold app-text-main">
          {t("Kiểm tra thông tin")}
        </h3>
        <p className="text-xs sm:text-sm app-text-muted">
          {t("Xem lại hình ảnh giấy tờ và khuôn mặt trước khi gửi xác minh.")}
        </p>
      </div>

      {/* 3 Review Cards with perfectly uniform grid and height */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {sides.map((side) => {
          const preview = previews[side.index];
          const meta = metadatas[side.index];
          const hasFile = Boolean(files[side.index]);

          return (
            <div
              key={side.index}
              className="p-3.5 sm:p-4 rounded-xl border app-border app-bg-card flex flex-col justify-between h-full space-y-3 shadow-2xs"
            >
              <div className="space-y-3">
                {/* Card Header: Icon, Title & Status */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold app-text-main flex items-center gap-1.5 min-w-0 truncate">
                    {side.icon}
                    <span className="truncate">{side.label}</span>
                  </span>
                  {hasFile ? (
                    <div className="flex items-center gap-1 shrink-0">
                      {side.canRotate && meta?.isPortrait && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500 text-white text-[10px] font-bold">
                          {t("Ảnh dọc")}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                        <FiCheck className="w-3 h-3 stroke-[3]" />
                        <span>{t("Đã tải")}</span>
                      </span>
                    </div>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[11px] font-semibold border border-rose-200 dark:border-rose-800 shrink-0">
                      {t("Chưa có")}
                    </span>
                  )}
                </div>

                {/* Preview Image Box (Same Aspect Ratio across all cards) */}
                <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-slate-900/90 dark:bg-zinc-950 border app-border flex items-center justify-center">
                  {preview ? (
                    <img
                      src={preview}
                      alt={t("Ảnh {{label}}", { label: side.label })}
                      className="w-full h-full object-contain select-none"
                    />
                  ) : (
                    <p className="text-xs app-text-muted text-center px-2">{side.noImageText}</p>
                  )}
                  {rotatingIndex === side.index && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-white gap-1.5 z-10">
                      <FiRefreshCw className="w-5 h-5 animate-spin text-blue-400" />
                      <span className="text-[11px] font-medium">{t("Đang xoay...")}</span>
                    </div>
                  )}
                </div>

                {/* Uniform Rotate Controls Row (Equal height on all 3 cards) */}
                {hasFile && side.canRotate ? (
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => onRotate(side.index, -90)}
                      disabled={rotatingIndex !== null}
                      className="h-8 px-2 rounded-lg border app-border bg-slate-50 dark:bg-zinc-800/80 hover:bg-slate-100 dark:hover:bg-zinc-700 text-[11px] font-medium app-text-main flex items-center justify-center gap-1 cursor-pointer transition-colors disabled:opacity-50 active:scale-98"
                    >
                      <FiRotateCcw className="w-3 h-3" />
                      <span>{t("Xoay trái")}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onRotate(side.index, 90)}
                      disabled={rotatingIndex !== null}
                      className="h-8 px-2 rounded-lg border app-border bg-slate-50 dark:bg-zinc-800/80 hover:bg-slate-100 dark:hover:bg-zinc-700 text-[11px] font-medium app-text-main flex items-center justify-center gap-1 cursor-pointer transition-colors disabled:opacity-50 active:scale-98"
                    >
                      <FiRotateCw className="w-3 h-3" />
                      <span>{t("Xoay phải")}</span>
                    </button>
                  </div>
                ) : (
                  <div className="h-8 flex items-center justify-center text-[11px] app-text-muted italic border border-dashed app-border rounded-lg">
                    <span>{t("Chưa có ảnh")}</span>
                  </div>
                )}
              </div>

              {/* Bottom Action Button (Always aligned at the bottom) */}
              <button
                type="button"
                onClick={side.goToStep}
                className="w-full h-8.5 rounded-lg border app-border text-xs font-semibold hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors text-center cursor-pointer app-text-main flex items-center justify-center mt-auto"
              >
                {hasFile ? side.changeLabel : side.emptyActionLabel}
              </button>
            </div>
          );
        })}
      </div>

      {/* Consent Checkbox */}
      <label className="flex items-start gap-3 text-xs sm:text-sm p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-900/40 border app-border cursor-pointer hover:bg-slate-100/60 transition-colors">
        <input
          type="checkbox"
          className="mt-0.5 size-4 rounded text-blue-600 focus:ring-blue-500 shrink-0 cursor-pointer accent-blue-600"
          checked={consent}
          disabled={busy}
          onChange={(e) => onConsentChange(e.target.checked)}
        />
        <span className="app-text-muted leading-relaxed">
          {t("Tôi đồng ý sử dụng thông tin và hình ảnh trên để xác minh danh tính.")}
        </span>
      </label>

      {/* Submit Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t app-border">
        <button
          type="button"
          onClick={onPrev}
          className="px-4 py-2 rounded-lg border app-border text-xs sm:text-sm font-semibold hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors inline-flex items-center gap-1.5 cursor-pointer app-text-main order-2 sm:order-1"
        >
          <FiArrowLeft className="w-4 h-4" />
          <span>{t("Quay lại")}</span>
        </button>

        <button
          type="submit"
          className="w-full sm:w-auto min-h-11 rounded-lg bg-blue-600 hover:bg-blue-700 px-6 py-2.5 font-bold text-white text-xs sm:text-sm shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-98 order-1 sm:order-2"
          disabled={!consent || !files[0] || !files[1] || !files[2] || busy}
        >
          {busy ? (
            <>
              <FiRefreshCw className="w-4 h-4 animate-spin" />
              <span>{t("Đang gửi...")}</span>
            </>
          ) : (
            <span>{t("Gửi xác minh")}</span>
          )}
        </button>
      </div>
    </div>
  );
}

export default ReviewSubmitStep;
