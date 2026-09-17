import { useTranslation } from "react-i18next";
import {
  FiCheck,
  FiRefreshCw,
  FiRotateCcw,
  FiRotateCw,
  FiArrowLeft,
  FiArrowRight,
  FiShield,
  FiCreditCard,
  FiCamera,
} from "react-icons/fi";
import { Link } from "react-router-dom";
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
  returnUrl,
}: ReviewStepProps) {
  const { t } = useTranslation();

  const sides = [
    {
      index: 0,
      label: t("Mặt trước CCCD"),
      goToStep: () => onGoToStep(1),
      icon: <FiCreditCard className="w-4 h-4 text-blue-500" />,
      spinnerColor: "text-blue-400",
      changeLabel: files[0] ? t("Thay đổi ảnh mặt trước") : t("Tải ảnh mặt trước ngay"),
      noImageText: t("Chưa tải ảnh mặt trước"),
      canRotate: true,
    },
    {
      index: 1,
      label: t("Mặt sau CCCD"),
      goToStep: () => onGoToStep(2),
      icon: <FiCreditCard className="w-4 h-4 text-blue-500" />,
      spinnerColor: "text-blue-400",
      changeLabel: files[1] ? t("Thay đổi ảnh mặt sau") : t("Tải ảnh mặt sau ngay"),
      noImageText: t("Chưa tải ảnh mặt sau"),
      canRotate: true,
    },
    {
      index: 2,
      label: t("Chân dung Camera"),
      goToStep: () => onGoToStep(3),
      icon: <FiCamera className="w-4 h-4 text-blue-500" />,
      spinnerColor: "text-blue-400",
      changeLabel: files[2] ? t("Chụp lại ảnh khuôn mặt") : t("Chụp ảnh khuôn mặt ngay"),
      noImageText: t("Chưa chụp ảnh khuôn mặt"),
      canRotate: false,
    },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {sides.map((side) => {
          const preview = previews[side.index];
          const meta = metadatas[side.index];
          const hasFile = Boolean(files[side.index]);

          return (
            <div key={side.index} className="p-4 rounded-2xl border app-border app-bg-page space-y-3 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold app-text-main flex items-center gap-1.5">
                    {side.icon}
                    <span>{side.label}</span>
                  </span>
                  {hasFile ? (
                    <div className="flex items-center gap-1.5">
                      {side.canRotate && meta?.isPortrait && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                          {t("Cần xoay")}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                        <FiCheck className="w-3 h-3 stroke-[3]" />
                        <span>{side.canRotate ? t("Sẵn sàng") : t("Đã chụp")}</span>
                      </span>
                    </div>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-[10px] font-bold">
                      {t("Chưa có ảnh")}
                    </span>
                  )}
                </div>

                <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-slate-950 border app-border flex items-center justify-center">
                  {preview ? (
                    <img src={preview} alt={`Ảnh ${side.label}`} className="w-full h-full object-contain" />
                  ) : (
                    <p className="text-xs app-text-muted text-center px-2">{side.noImageText}</p>
                  )}
                  {rotatingIndex === side.index && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white">
                      <FiRefreshCw className={`w-6 h-6 animate-spin ${side.spinnerColor}`} />
                    </div>
                  )}
                </div>

                {hasFile && side.canRotate && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onRotate(side.index, -90)}
                      disabled={rotatingIndex !== null}
                      className="flex-1 py-1.5 px-2 rounded-lg border app-border bg-slate-100 dark:bg-zinc-800 text-[11px] font-semibold text-slate-700 dark:text-zinc-300 flex items-center justify-center gap-1 cursor-pointer hover:bg-slate-200 dark:hover:bg-zinc-700"
                    >
                      <FiRotateCcw className="w-3 h-3" />
                      <span>{t("Xoay trái")}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onRotate(side.index, 90)}
                      disabled={rotatingIndex !== null}
                      className="flex-1 py-1.5 px-2 rounded-lg border app-border bg-slate-100 dark:bg-zinc-800 text-[11px] font-semibold text-slate-700 dark:text-zinc-300 flex items-center justify-center gap-1 cursor-pointer hover:bg-slate-200 dark:hover:bg-zinc-700"
                    >
                      <FiRotateCw className="w-3 h-3" />
                      <span>{t("Xoay phải")}</span>
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={side.goToStep}
                className="w-full py-2 rounded-xl border app-border text-xs font-bold hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors text-center cursor-pointer app-text-main mt-2"
              >
                {side.changeLabel}
              </button>
            </div>
          );
        })}
      </div>

      {/* Information Notice */}
      <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 text-xs app-text-muted space-y-1.5">
        <div className="flex items-center gap-2 font-bold text-blue-700 dark:text-blue-300">
          <FiShield className="w-4 h-4 text-blue-500" />
          <span>{t("Quy trình đối soát VNPT eKYC AI")}</span>
        </div>
        <p className="leading-relaxed">
          {t("Hệ thống VNPT AI sẽ đồng thời bóc tách dữ liệu CCCD gắn chip, kiểm tra người thật (Face Liveness) và so khớp khuôn mặt giữa chân dung camera với thẻ CCCD để kích hoạt quyền Nhà tổ chức.")}
        </p>
      </div>

      {/* Legal Consent Checkbox */}
      <label className="flex min-h-11 items-start gap-3 text-xs sm:text-sm p-4 rounded-2xl bg-slate-50 dark:bg-zinc-900/60 border app-border cursor-pointer hover:bg-slate-100/60 transition-colors">
        <input
          type="checkbox"
          className="mt-0.5 size-4.5 rounded text-blue-600 focus:ring-blue-500 shrink-0 cursor-pointer"
          checked={consent}
          disabled={busy}
          onChange={(e) => onConsentChange(e.target.checked)}
        />
        <span className="app-text-muted leading-relaxed">
          {t("Tôi đồng ý gửi ảnh Căn cước công dân và ảnh khuôn mặt để HaloTicket bóc tách, xác thực người thật và đối soát qua VNPT eKYC (phiên bản đồng ý 2026.1).")}
        </span>
      </label>

      {/* Navigation & Submit Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        <button
          type="button"
          onClick={onPrev}
          className="px-5 py-3 rounded-xl border app-border text-xs sm:text-sm font-semibold hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors inline-flex items-center gap-2 cursor-pointer app-text-main order-2 sm:order-1"
        >
          <FiArrowLeft className="w-4 h-4" />
          <span>{t("Quay lại chụp khuôn mặt")}</span>
        </button>

        <button
          type="submit"
          className="w-full sm:w-auto min-h-12 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-8 py-3.5 font-bold text-white text-xs sm:text-sm shadow-lg shadow-blue-500/25 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-98 order-1 sm:order-2"
          disabled={!consent || !files[0] || !files[1] || !files[2] || busy}
        >
          {busy ? (
            <>
              <FiRefreshCw className="w-4 h-4 animate-spin" />
              <span>{t("Đang bóc tách & đối soát VNPT…")}</span>
            </>
          ) : (
            <>
              <span>{t("Gửi xác minh")}</span>
              <FiArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      {/* Back to profile link */}
      <div className="text-center">
        <Link to={returnUrl} className="text-xs app-text-muted hover:app-text-main">
          ← {t("Về hồ sơ")}
        </Link>
      </div>
    </div>
  );
}
