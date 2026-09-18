import { useRef, useState, type ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import {
  FiCheck,
  FiAlertCircle,
  FiRefreshCw,
  FiRotateCcw,
  FiRotateCw,
  FiRepeat,
  FiArrowLeft,
  FiArrowRight,
  FiCrop,
  FiEdit2,
  FiUploadCloud,
} from "react-icons/fi";
import { type ImageMetadata } from "@/utils/imageUtils";
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
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [showEditTools, setShowEditTools] = useState(false);

  const openFilePicker = () => {
    inputRef.current?.click();
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type) || file.size > 10 * 1024 * 1024) {
      onFileChange(index, e);
      return;
    }
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

      <div className="space-y-5">
        {/* Header Title & Instruction */}
        <div className="space-y-1">
          <h3 className="text-base sm:text-lg font-bold app-text-main">
            {label}
          </h3>
          <p className="text-xs sm:text-sm app-text-muted">
            {description}
          </p>
        </div>

        {/* Upload Container or Preview */}
        {preview ? (
          <div className="rounded-xl border app-border app-bg-card p-4 sm:p-5 space-y-4">
            {/* Image Preview Box */}
            <div className="relative max-w-md mx-auto aspect-[16/10] rounded-lg overflow-hidden border app-border bg-slate-950 flex items-center justify-center">
              <img
                src={preview}
                alt={`Ảnh ${label}`}
                className="w-full h-full object-contain select-none"
              />

              {/* Status Badge */}
              <div className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-md bg-emerald-600/90 text-white text-xs font-semibold flex items-center gap-1 shadow-sm backdrop-blur-xs">
                <FiCheck className="w-3.5 h-3.5 stroke-[3]" />
                <span>{metadata?.isPortrait ? t("Ảnh dọc - Cần xoay") : t("Ảnh đạt yêu cầu")}</span>
              </div>

              {/* Rotating overlay */}
              {rotatingIndex === index && (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white gap-2 z-20">
                  <FiRefreshCw className="w-6 h-6 animate-spin text-blue-400" />
                  <span className="text-xs font-medium">{t("Đang xoay ảnh...")}</span>
                </div>
              )}
            </div>

            {/* Portrait orientation alert if needed */}
            {metadata?.isPortrait && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                  <FiAlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{t("Ảnh đang chụp theo chiều dọc. Vui lòng xoay ngang để tiếp tục.")}</span>
                </div>
                <button
                  type="button"
                  onClick={() => onRotate(index, 90)}
                  disabled={rotatingIndex !== null}
                  className="px-3 py-1.5 rounded-md bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shrink-0 inline-flex items-center gap-1 cursor-pointer transition-all active:scale-98"
                >
                  <FiRotateCw className="w-3 h-3" />
                  <span>{t("Xoay ngang 90°")}</span>
                </button>
              </div>
            )}

            {/* Action Bar (Progressive Disclosure) */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={openFilePicker}
                className="px-3.5 py-1.5 rounded-lg border app-border app-bg-page hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs font-semibold app-text-main inline-flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <span>{t("Chọn ảnh khác")}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowEditTools((v) => !v)}
                className="px-3 py-1.5 rounded-lg border app-border text-xs font-medium text-slate-600 dark:text-zinc-300 hover:app-text-main inline-flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <FiEdit2 className="w-3 h-3" />
                <span>{showEditTools ? t("Thu gọn công cụ") : t("Chỉnh sửa (Xoay/Cắt)")}</span>
              </button>
            </div>

            {/* Revealed Edit Tools */}
            {showEditTools && (
              <div className="flex flex-wrap items-center justify-center gap-2 pt-3 border-t app-border animate-in fade-in">
                <button
                  type="button"
                  onClick={() => onRotate(index, -90)}
                  disabled={rotatingIndex !== null}
                  className="px-3 py-1.5 rounded-md bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 text-xs font-medium inline-flex items-center gap-1 cursor-pointer border app-border"
                >
                  <FiRotateCcw className="w-3 h-3" />
                  <span>{t("Xoay trái")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onRotate(index, 90)}
                  disabled={rotatingIndex !== null}
                  className="px-3 py-1.5 rounded-md bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 text-xs font-medium inline-flex items-center gap-1 cursor-pointer border app-border"
                >
                  <FiRotateCw className="w-3 h-3" />
                  <span>{t("Xoay phải")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onRotate(index, 180)}
                  disabled={rotatingIndex !== null}
                  className="px-3 py-1.5 rounded-md bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 text-xs font-medium inline-flex items-center gap-1 cursor-pointer border app-border"
                >
                  <FiRepeat className="w-3 h-3" />
                  <span>{t("Xoay 180°")}</span>
                </button>
                <button
                  type="button"
                  onClick={openCropExisting}
                  className="px-3 py-1.5 rounded-md bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 text-xs font-medium inline-flex items-center gap-1 cursor-pointer border app-border"
                >
                  <FiCrop className="w-3 h-3" />
                  <span>{t("Cắt ảnh")}</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Dropzone Upload Box */
          <div className="space-y-4">
            <label
              htmlFor={inputId}
              className="block relative rounded-2xl border-2 border-dashed border-blue-400/80 dark:border-blue-500/70 bg-blue-50/15 dark:bg-blue-950/15 hover:border-blue-600 dark:hover:border-blue-400 hover:bg-blue-50/35 dark:hover:bg-blue-950/25 transition-all duration-200 p-6 sm:p-8 cursor-pointer text-center group"
            >
              <div className="py-6 sm:py-8 space-y-3.5 max-w-md mx-auto">
                <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/25 mx-auto flex items-center justify-center group-hover:scale-110 group-hover:bg-blue-700 transition-all duration-200">
                  <FiUploadCloud className="w-7 h-7" />
                </div>

                <div className="space-y-1.5">
                  <h4 className="text-base sm:text-lg font-bold app-text-main group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {t("Bấm để tải ảnh ")}{label}
                  </h4>
                  <p className="text-xs app-text-muted">
                    {t("Hỗ trợ định dạng JPG, PNG · Tối đa 10 MB · Có thể cắt sau khi chọn")}
                  </p>
                </div>
              </div>
            </label>

            {/* Checklist items */}
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-xs text-slate-600 dark:text-zinc-400 pt-1">
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                <FiCheck className="w-3.5 h-3.5" />
                <span>{t("Ảnh rõ nét")}</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                <FiCheck className="w-3.5 h-3.5" />
                <span>{t("Đủ 4 góc")}</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                <FiCheck className="w-3.5 h-3.5" />
                <span>{t("Không bị lóa hoặc che thông tin")}</span>
              </div>
            </div>
          </div>
        )}

        {/* Hidden file input */}
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

        {/* Bottom Navigation */}
        <div className="flex items-center justify-between pt-3 border-t app-border">
          {onPrev ? (
            <button
              type="button"
              onClick={onPrev}
              className="px-4 py-2 rounded-lg border app-border text-xs sm:text-sm font-semibold hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors inline-flex items-center gap-1.5 cursor-pointer app-text-main"
            >
              <FiArrowLeft className="w-4 h-4" />
              <span>{prevLabel ?? t("Quay lại")}</span>
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={onNext}
            disabled={!preview}
            className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm shadow-sm transition-all cursor-pointer inline-flex items-center gap-1.5 active:scale-98"
          >
            <span>{nextLabel}</span>
            <FiArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
}
