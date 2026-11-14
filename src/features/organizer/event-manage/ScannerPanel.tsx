import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FiCamera, FiCameraOff } from "react-icons/fi";

import { SCAN_REPEAT_WINDOW_MS, cameraErrorState, type ScannerState } from "./scannerSupport";

interface ScannerPanelProps {
  /** Called once per code read (the same code again only after SCAN_REPEAT_WINDOW_MS). */
  onScan: (code: string) => void;
  /** True while the page is busy with the last scan; codes read meanwhile are dropped. */
  busy?: boolean;
}

const STATE_TEXT: Record<Exclude<ScannerState, "off" | "starting" | "scanning">, string> = {
  denied: "Trình duyệt chưa cho phép dùng camera. Bật quyền camera cho trang này rồi thử lại, hoặc nhập mã bằng tay.",
  "no-camera": "Thiết bị này không có camera dùng được. Nhập mã bằng tay hoặc dùng máy quét mã.",
  error: "Không mở được camera. Thử lại hoặc nhập mã bằng tay.",
};

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

  const stop = useCallback(() => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (scanner) {
      try { scanner.stop(); } catch { /* already stopped */ }
      try { scanner.destroy(); } catch { /* already destroyed */ }
    }
    setState("off");
  }, []);

  const handleCode = useCallback((raw: string) => {
    const code = (raw ?? "").trim();
    if (!code || busyRef.current) return;
    const now = Date.now();
    const last = lastRef.current;
    if (last && last.code === code && now - last.at < SCAN_REPEAT_WINDOW_MS) return;
    lastRef.current = { code, at: now };
    onScanRef.current(code);
  }, []);

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
        try { scanner.destroy(); } catch { /* ignore */ }
      }
      setState(cameraErrorState(err));
    }
  }, [handleCode]);

  // the camera must not keep running when the person leaves the page or switches to another tab
  useEffect(() => {
    const onHide = () => { if (document.hidden) stop(); };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      const scanner = scannerRef.current;
      scannerRef.current = null;
      if (scanner) {
        try { scanner.stop(); scanner.destroy(); } catch { /* ignore */ }
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
