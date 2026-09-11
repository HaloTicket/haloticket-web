import {
  FiCheck,
  FiRefreshCw,
  FiRotateCcw,
  FiRotateCw,
  FiArrowLeft,
  FiArrowRight,
  FiShield,
} from "react-icons/fi";
import { FiCreditCard } from "react-icons/fi";
import { FaMicrochip } from "react-icons/fa";
import { Link } from "react-router-dom";
import { type ImageMetadata } from "@/utils/imageUtils";

interface ReviewStepProps {
  previews: [string | null, string | null, string | null];
  metadatas: [ImageMetadata | null, ImageMetadata | null];
  files: [File | null, File | null, File | null];
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
  const sides = [
    {
      index: 0 as const,
      label: "Mặt trước CCCD",
      goToStep: () => onGoToStep(1),
      icon: <FiCreditCard className="w-4 h-4 text-blue-500" />,
      spinnerColor: "text-blue-400",
      changeLabel: files[0] ? "Thay đổi ảnh mặt trước" : "Tải ảnh mặt trước ngay",
      noImageText: "Chưa tải ảnh mặt trước",
    },
    {
      index: 1 as const,
      label: "Mặt sau CCCD",
      goToStep: () => onGoToStep(2),
      icon: <FaMicrochip className="w-4 h-4 text-purple-500" />,
      spinnerColor: "text-purple-400",
      changeLabel: files[1] ? "Thay đổi ảnh mặt sau" : "Tải ảnh mặt sau ngay",
      noImageText: "Chưa tải ảnh mặt sau",
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
            <div key={side.index} className="p-4 rounded-2xl border app-border app-bg-page space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold app-text-main flex items-center gap-1.5">
                  {side.icon}
                  <span>{side.label}</span>
                </span>
                {hasFile ? (
                  <div className="flex items-center gap-1.5">
                    {meta?.isPortrait && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                        Cần xoay ngang
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                      <FiCheck className="w-3 h-3 stroke-[3]" />
                      <span>Đã sẵn sàng</span>
                    </span>
                  </div>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-[10px] font-bold">
                    Chưa có ảnh
                  </span>
                )}
              </div>

              <div className="relative aspect-[16/10] rounded-xl overflow-hidden bg-slate-950 border app-border flex items-center justify-center">
                {preview ? (
                  <img src={preview} alt={`Ảnh ${side.label}`} className="w-full h-full object-contain" />
                ) : (
                  <p className="text-xs app-text-muted">{side.noImageText}</p>
                )}
                {rotatingIndex === side.index && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white">
                    <FiRefreshCw className={`w-6 h-6 animate-spin ${side.spinnerColor}`} />
                  </div>
                )}
              </div>

              {hasFile && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onRotate(side.index, -90)}
                    disabled={rotatingIndex !== null}
                    className="flex-1 py-1.5 px-2 rounded-lg border app-border bg-slate-100 dark:bg-zinc-800 text-[11px] font-semibold text-slate-700 dark:text-zinc-300 flex items-center justify-center gap-1 cursor-pointer hover:bg-slate-200 dark:hover:bg-zinc-700"
                  >
                    <FiRotateCcw className="w-3 h-3" />
                    <span>Xoay trái</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onRotate(side.index, 90)}
                    disabled={rotatingIndex !== null}
                    className="flex-1 py-1.5 px-2 rounded-lg border app-border bg-slate-100 dark:bg-zinc-800 text-[11px] font-semibold text-slate-700 dark:text-zinc-300 flex items-center justify-center gap-1 cursor-pointer hover:bg-slate-200 dark:hover:bg-zinc-700"
                  >
                    <FiRotateCw className="w-3 h-3" />
                    <span>Xoay phải</span>
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={side.goToStep}
                className="w-full py-2 rounded-xl border app-border text-xs font-bold hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors text-center cursor-pointer app-text-main"
              >
                {side.changeLabel}
              </button>
            </div>
          );
        })}
        <div className="p-4 rounded-2xl border app-border app-bg-page space-y-3">
          <span className="text-xs font-bold app-text-main">Ảnh chân dung</span>
          <div className="aspect-[16/10] rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center">
            {previews[2] ? <img src={previews[2]} alt="Ảnh chân dung" className="w-full h-full object-cover" /> : <p className="text-xs app-text-muted">Chưa tải ảnh chân dung</p>}
          </div>
          <button type="button" onClick={() => onGoToStep(3)} className="w-full py-2 rounded-xl border app-border text-xs font-bold">Thay đổi ảnh chân dung</button>
        </div>
      </div>

      {/* Information Notice */}
      <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 text-xs app-text-muted space-y-1.5">
        <div className="flex items-center gap-2 font-bold text-blue-700 dark:text-blue-300">
          <FiShield className="w-4 h-4 text-blue-500" />
          <span>Quy trình bóc tách &amp; Cấp quyền</span>
        </div>
        <p className="leading-relaxed">
          Hệ thống sẽ đối soát tự động Số CCCD 12 số, Họ và tên và Ngày hết hạn của giấy tờ. Sau khi xác thực thành công, tài khoản của bạn sẽ được kích hoạt quyền Nhà tổ chức để tạo sự kiện và phát hành vé ngay lập tức.
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
          Tôi đồng ý gửi ảnh Căn cước công dân và ảnh khuôn mặt để HaloTicket xử lý xác minh danh tính qua VNPT eKYC (phiên bản đồng ý 2026.1).
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
          <span>Quay lại bước 2</span>
        </button>

        <button
          type="submit"
          className="w-full sm:w-auto min-h-12 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-8 py-3.5 font-bold text-white text-xs sm:text-sm shadow-lg shadow-blue-500/25 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-98 order-1 sm:order-2"
          disabled={!consent || !files[0] || !files[1] || !files[2] || busy}
        >
          {busy ? (
            <>
              <FiRefreshCw className="w-4 h-4 animate-spin" />
              <span>Đang bóc tách &amp; gửi xác minh…</span>
            </>
          ) : (
            <>
              <span>Gửi xác minh</span>
              <FiArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      {/* Back to profile link */}
      <div className="text-center">
        <Link to={returnUrl} className="text-xs app-text-muted hover:app-text-main">
          ← Quay lại hồ sơ
        </Link>
      </div>
    </div>
  );
}
