import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FiCamera, FiCameraOff } from "react-icons/fi";

import { SCAN_REPEAT_WINDOW_MS, cameraErrorState, type ScannerState } from "./scannerSupport";

/** Props của {@code ScannerPanel}: callback nhận mã quét và cờ báo trang đang bận. */
interface ScannerPanelProps {
  /** Được gọi một lần cho mỗi mã đọc được (cùng mã đó chỉ được báo lại sau {@code SCAN_REPEAT_WINDOW_MS}). */
  onScan: (code: string) => void;
  /** {@code true} khi trang đang bận với lượt quét trước; các mã đọc được trong lúc đó bị bỏ qua. */
  busy?: boolean;
}

const STATE_TEXT: Record<Exclude<ScannerState, "off" | "starting" | "scanning">, string> = {
  denied: "Trình duyệt chưa cho phép dùng camera. Bật quyền camera cho trang này rồi thử lại, hoặc nhập mã bằng tay.",
  "no-camera": "Thiết bị này không có camera dùng được. Nhập mã bằng tay hoặc dùng máy quét mã.",
  error: "Không mở được camera. Thử lại hoặc nhập mã bằng tay.",
};

/**
 * Bảng điều khiển quét mã QR bằng camera: nút bật hoặc tắt camera, khung video và thông báo lỗi quyền hoặc thiết bị.
 * Thư viện {@code qr-scanner} chỉ được nạp khi bắt đầu quét; mã lặp lại liên tiếp bị lọc bớt.
 */
export const ScannerPanel: React.FC<ScannerPanelProps> = ({ onScan, busy = false }) => {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<{ stop: () => void; destroy: () => void } | null>(null);
  const lastRef = useRef<{ code: string; at: number } | null>(null);
  const busyRef = useRef(busy);
  const onScanRef = useRef(onScan);
  const [state, setState] = useState<ScannerState>("off");

  useEffect(() => { busyRef.current = busy; }, [busy]);
  useEffect(() => { onScanRef.current = onScan; }, [onScan]);

  /** Dừng và hủy bộ quét đang chạy (nếu có) rồi đưa trạng thái về {@code off}. */
  const stop = useCallback(() => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (scanner) {
      try { scanner.stop(); } catch { /* đã dừng rồi */ }
      try { scanner.destroy(); } catch { /* đã hủy rồi */ }
    }
    setState("off");
  }, []);

  /** Nhận mã đọc được: bỏ mã rỗng, bỏ khi đang bận hoặc khi trùng mã vừa quét trong khoảng chống lặp, còn lại báo cho {@code onScan}. */
  const handleCode = useCallback((raw: string) => {
    const code = (raw ?? "").trim();
    if (!code || busyRef.current) return;
    const now = Date.now();
    const last = lastRef.current;
    if (last && last.code === code && now - last.at < SCAN_REPEAT_WINDOW_MS) return;
    lastRef.current = { code, at: now };
    onScanRef.current(code);
  }, []);

  /** Mở camera và bắt đầu quét; đặt trạng thái không có camera, bị từ chối hoặc lỗi khi không khởi động được. */
  const start = useCallback(async () => {
    if (scannerRef.current || !videoRef.current) return;
    setState("starting");
    try {
      const { default: QrScanner } = await import("qr-scanner");
      if (!(await QrScanner.hasCamera())) {
        setState("no-camera");
        return;
      }
      const video = videoRef.current;
      if (!video) return;
      const scanner = new QrScanner(video, (result) => handleCode(result.data), {
        returnDetailedScanResult: true,
        preferredCamera: "environment",
        highlightScanRegion: true,
        highlightCodeOutline: true,
        maxScansPerSecond: 5,
      });
      scannerRef.current = scanner;
      await scanner.start();
      setState("scanning");
    } catch (err) {
      const scanner = scannerRef.current;
      scannerRef.current = null;
      if (scanner) {
        try { scanner.destroy(); } catch { /* bỏ qua */ }
      }
      setState(cameraErrorState(err));
    }
  }, [handleCode]);

  // camera không được chạy tiếp khi người dùng rời trang hoặc chuyển sang tab khác
  useEffect(() => {
    /** Tắt camera khi tab bị ẩn. */
    const onHide = () => { if (document.hidden) stop(); };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      const scanner = scannerRef.current;
      scannerRef.current = null;
      if (scanner) {
        try { scanner.stop(); scanner.destroy(); } catch { /* bỏ qua */ }
      }
    };
  }, [stop]);

  const active = state === "scanning" || state === "starting";
  const problem = state === "denied" || state === "no-camera" || state === "error" ? STATE_TEXT[state] : null;

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => (active ? stop() : void start())}
        aria-pressed={active}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold border app-border app-text-main hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
      >
        {active ? <FiCameraOff className="w-4 h-4" /> : <FiCamera className="w-4 h-4" />}
        {active ? t("Tắt camera") : t("Quét bằng camera")}
      </button>

      {problem && (
        <p role="alert" className="text-xs font-medium text-amber-700 dark:text-amber-300">
          {t(problem)}
        </p>
      )}

      <div className={active ? "relative max-w-sm overflow-hidden rounded-2xl border app-border bg-black" : "hidden"}>
        <video ref={videoRef} playsInline muted className="w-full aspect-square object-cover" />
        {state === "starting" && (
          <p className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white/90">{t("Đang mở camera...")}</p>
        )}
      </div>
    </div>
  );
};

export default ScannerPanel;
