import { useRef, useState, type ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import {
  FiCheck,
  FiAlertCircle,
  FiRefreshCw,
  FiRotateCcw,
  FiRotateCw,
  FiRepeat,
  FiUploadCloud,
  FiArrowLeft,
  FiArrowRight,
  FiCrop,
} from "react-icons/fi";
import { type ImageMetadata } from "@/utils/imageUtils";
import { VnptInputStandardsGuide } from "./VnptInputStandardsGuide";
import { CropModal } from "./CropModal";

interface ImageUploadStepProps {
  /** 0 = mặt trước, 1 = mặt sau */
  index: 0 | 1;
  label: string;
  description: string;
  preview: string | null;
  metadata: ImageMetadata | null;
  rotatingIndex: number | null;
  busy: boolean;
  onFileChange: (index: number, e: ChangeEvent<HTMLInputElement>) => void;
  /** Called when crop produces a new cropped file */
  onCropConfirm: (index: number, file: File, previewUrl: string) => void;
  onRotate: (index: number, degrees: number) => void;
  onPrev?: () => void;
  onNext: () => void;
  prevLabel?: string;
  nextLabel: string;
  /** Current raw file (to pass mime type to crop modal) */
  currentFile?: File | null;
}

export function ImageUploadStep({
  index,
  label,
  description,
  preview,
  metadata,
  rotatingIndex,
  busy,
  onFileChange,
  onCropConfirm,
  onRotate,
  onPrev,
  onNext,
  prevLabel,
  nextLabel,
  currentFile,
}: ImageUploadStepProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = `ekyc-upload-input-${index}`;

  const [showCrop, setShowCrop] = useState(false);
  // Temp src for crop: either current preview or a newly selected-but-not-yet-confirmed file
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  const openFilePicker = () => {
    // Always clear input value so same file can be re-selected
    if (inputRef.current) {
      inputRef.current.value = "";
      inputRef.current.click();
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Validate
    if (!["image/jpeg", "image/png"].includes(file.type) || file.size > 10 * 1024 * 1024) {
      onFileChange(index, e); // let parent show error
      return;
    }
    // Tạm tắt crop modal - dùng ảnh gốc trực tiếp để preserve EXIF metadata
    // const tempUrl = URL.createObjectURL(file);
    // setCropSrc(tempUrl);
    // setShowCrop(true);
    
    // Dùng ảnh gốc trực tiếp
    const url = URL.createObjectURL(file);
    onCropConfirm(index, file, url);
  };

  const handleCropConfirm = (croppedFile: File, croppedUrl: string) => {
    setShowCrop(false);
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    onCropConfirm(index, croppedFile, croppedUrl);
  };

  const handleCropClose = () => {
    setShowCrop(false);
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  };

  const openCropExisting = () => {
    if (preview) {
      setCropSrc(preview);
      setShowCrop(true);
    }
  };

  return (
    <>
      {showCrop && cropSrc && (
        <CropModal
          src={cropSrc}
          aspectRatio={16 / 10}
          onConfirm={handleCropConfirm}
          onClose={handleCropClose}
          originalFileName={currentFile?.name ?? `cccd-${index}.jpg`}
          originalMimeType={currentFile?.type ?? "image/jpeg"}
        />
      )}

      <div className="space-y-6">
        {preview ? (
          <div className="space-y-4 rounded-3xl border app-border app-bg-card p-5 sm:p-7 shadow-xs">
            {/* Preview Box */}
            <div className="relative max-w-lg mx-auto aspect-[16/10] rounded-2xl overflow-hidden shadow-lg border border-slate-200 dark:border-zinc-700 bg-slate-950 flex items-center justify-center">
              <img
                src={preview}
                alt={`Ảnh ${label}`}
                className="w-full h-full object-contain select-none"
              />

              {/* Top-left label badge */}
              <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-md">
                <FiCheck className="w-3.5 h-3.5 stroke-[3]" />
                <span>{label}</span>
              </div>

              {/* Top-right orientation badge */}
              <div className="absolute top-3 right-3">
                {metadata?.isPortrait ? (
                  <span className="px-2.5 py-1 rounded-full bg-amber-500 text-white text-[11px] font-bold flex items-center gap-1 shadow-md animate-pulse">
                    <FiAlertCircle className="w-3.5 h-3.5" />
                    <span>{t("Ảnh dọc - Cần xoay ngang")}</span>
                  </span>
                ) : metadata?.width ? (
                  <span className="px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-emerald-400 border border-emerald-500/30 text-[11px] font-bold flex items-center gap-1 shadow-md">
                    <FiCheck className="w-3.5 h-3.5" />
                    <span>{metadata.width} × {metadata.height} px ({t("Chuẩn ngang")})</span>
                  </span>
                ) : null}
              </div>

              {/* Rotating overlay */}
              {rotatingIndex === index && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-white gap-2 z-20">
                  <FiRefreshCw className="w-8 h-8 animate-spin text-blue-400" />
                  <span className="text-xs font-bold">{t("Đang xoay ảnh...")}</span>
                </div>
              )}
            </div>

            {/* Portrait warning banner */}
            {metadata?.isPortrait && (
              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-2xs">
                <div className="flex items-center gap-2.5 text-amber-800 dark:text-amber-200">
                  <FiAlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                  <span>
                    {t("Ảnh đang theo")} <strong>{t("chiều dọc")}</strong> ({metadata?.height} × {metadata?.width} px). {t("VNPT eKYC yêu cầu ảnh CCCD nằm ngang để bóc tách chính xác.")}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onRotate(index, 90)}
                  disabled={rotatingIndex !== null}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shrink-0 flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-xs active:scale-98"
                >
                  <FiRotateCw className="w-3.5 h-3.5" />
                  <span>{t("Xoay ngang 90° ngay")}</span>
                </button>
              </div>
            )}

            {/* Rotation + action toolbar */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2 border-t app-border">
              <button
                type="button"
                onClick={() => onRotate(index, -90)}
                disabled={rotatingIndex !== null}
                className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer border app-border"
                title={t("Xoay trái 90°")}
              >
                <FiRotateCcw className="w-3.5 h-3.5 text-slate-600 dark:text-zinc-300" />
                <span>{t("Xoay trái 90°")}</span>
              </button>

              <button
                type="button"
                onClick={() => onRotate(index, 90)}
                disabled={rotatingIndex !== null}
                className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer border app-border"
                title={t("Xoay phải 90°")}
              >
                <FiRotateCw className="w-3.5 h-3.5 text-slate-600 dark:text-zinc-300" />
                <span>{t("Xoay phải 90°")}</span>
              </button>

              <button
                type="button"
                onClick={() => onRotate(index, 180)}
                disabled={rotatingIndex !== null}
                className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer border app-border"
                title={t("Lật 180°")}
              >
                <FiRepeat className="w-3.5 h-3.5 text-slate-600 dark:text-zinc-300" />
                <span>{t("Xoay 180°")}</span>
              </button>

              <button
                type="button"
                onClick={openCropExisting}
                className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer border app-border"
                title={t("Cắt ảnh")}
              >
                <FiCrop className="w-3.5 h-3.5 text-slate-600 dark:text-zinc-300" />
                <span>{t("Cắt ảnh")}</span>
              </button>

              <button
                type="button"
                onClick={openFilePicker}
                className="px-3.5 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer sm:ml-auto"
              >
                <FiUploadCloud className="w-3.5 h-3.5" />
                <span>{t("Chọn ảnh khác")}</span>
              </button>
            </div>
          </div>
        ) : (
          <label
            htmlFor={inputId}
            className="block relative rounded-3xl border-2 border-dashed border-slate-300 dark:border-zinc-700 bg-slate-50/50 dark:bg-zinc-900/40 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/20 dark:hover:bg-blue-950/20 transition-all p-6 sm:p-8 cursor-pointer text-center group"
          >
            <div className="py-8 sm:py-12 space-y-4 max-w-md mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-900/50 mx-auto flex items-center justify-center shadow-xs group-hover:scale-105 group-hover:bg-blue-600 group-hover:text-white transition-all">
                <FiUploadCloud className="w-7 h-7" />
              </div>
              <div className="space-y-1.5">
                <h4 className="text-base sm:text-lg font-bold app-text-main">
                  {t("Bấm để tải ảnh ")}{label}
                </h4>
                <p className="text-xs app-text-muted">
                  {t("Hỗ trợ định dạng JPG, PNG · Tối đa 10 MB · Có thể cắt sau khi chọn")}
                </p>
              </div>
              <div className="pt-2 flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-500 dark:text-zinc-400">
                {description.split(",").map((hint) => (
                  <span key={hint} className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-zinc-800 border app-border">
                    {hint.trim()}
                  </span>
                ))}
              </div>
            </div>
          </label>
        )}

        {/* Hidden file input — id must match label's htmlFor */}
        <input
          id={inputId}
          ref={inputRef}
          className="sr-only"
          type="file"
          aria-label={index === 0 ? t("Ảnh mặt trước căn cước") : t("Ảnh mặt sau căn cước")}
          accept="image/jpeg,image/png"
          capture="environment"
          disabled={busy}
          onChange={handleInputChange}
        />

        {/* VNPT Standards Guide */}
        <VnptInputStandardsGuide />

        {/* Navigation buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          {onPrev ? (
            <button
              type="button"
              onClick={onPrev}
              className="px-5 py-3 rounded-xl border app-border text-xs sm:text-sm font-semibold hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors inline-flex items-center gap-2 cursor-pointer app-text-main order-2 sm:order-1"
            >
              <FiArrowLeft className="w-4 h-4" />
              <span>{prevLabel ?? t("Quay lại")}</span>
            </button>
          ) : (
            <div className="order-2 sm:order-1" />
          )}
          <button
            type="button"
            onClick={onNext}
            className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/25 transition-all cursor-pointer flex items-center justify-center gap-2 order-1 sm:order-2 active:scale-98"
          >
            <span>{nextLabel}</span>
            <FiArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
}
