import { useRef, type ChangeEvent } from "react";
import { FiArrowLeft, FiArrowRight, FiCamera, FiCheck, FiUploadCloud } from "react-icons/fi";

interface FaceUploadStepProps {
  preview: string | null;
  busy: boolean;
  onFileChange: (index: number, event: ChangeEvent<HTMLInputElement>) => void;
  onPrev: () => void;
  onNext: () => void;
}

export function FaceUploadStep({ preview, busy, onFileChange, onPrev, onNext }: FaceUploadStepProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const openPicker = () => {
    if (!inputRef.current) return;
    inputRef.current.value = "";
    inputRef.current.click();
  };

  return (
    <div className="space-y-6">
      <button type="button" onClick={openPicker} className="block w-full max-w-md mx-auto rounded-3xl border-2 border-dashed app-border p-6 cursor-pointer">
        <div className="aspect-square max-w-xs mx-auto rounded-full overflow-hidden bg-slate-100 dark:bg-zinc-800 flex items-center justify-center">
          {preview ? <img src={preview} alt="Ảnh chân dung" className="w-full h-full object-cover" /> : <FiCamera className="w-14 h-14 text-emerald-500" />}
        </div>
        <div className="mt-4 text-center font-bold app-text-main flex items-center justify-center gap-2">
          {preview ? <><FiCheck className="text-emerald-500" /> Chọn ảnh chân dung khác</> : <><FiUploadCloud /> Tải ảnh chân dung</>}
        </div>
        <p className="mt-2 text-xs app-text-muted text-center">Nhìn thẳng, đủ sáng, không đeo kính râm hoặc khẩu trang.</p>
      </button>
      <input ref={inputRef} className="sr-only" type="file" aria-label="Ảnh chân dung" accept="image/jpeg,image/png" capture="user" disabled={busy} onChange={(event) => onFileChange(2, event)} />
      <div className="flex justify-between gap-3">
        <button type="button" onClick={onPrev} className="px-5 py-3 rounded-xl border app-border font-semibold text-sm"><FiArrowLeft className="inline mr-2" />Quay lại bước 2</button>
        <button type="button" onClick={onNext} disabled={!preview} className="px-6 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm disabled:opacity-50">Xem lại hồ sơ<FiArrowRight className="inline ml-2" /></button>
      </div>
    </div>
  );
}
