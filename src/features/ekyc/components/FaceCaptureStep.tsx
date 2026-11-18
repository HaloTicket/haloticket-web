import { useEffect, useRef, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  FiCamera,
  FiRefreshCw,
  FiArrowLeft,
  FiArrowRight,
  FiCheck,
  FiAlertCircle,
  FiSmartphone,
  FiCopy,
  FiX,
  FiUser,
} from "react-icons/fi";

/** Props của bước chụp khuôn mặt: hàm nhận ảnh, ảnh xem trước, hàm chụp lại, chuyển bước và cờ bước đang hoạt động. */
interface FaceCaptureStepProps {
  onCapture: (file: File, previewUrl: string) => void;
  previewUrl: string | null;
  file?: File | null;
  onRetake: () => void;
  onNext: () => void;
  onPrev: () => void;
  returnUrl?: string;
  isActive?: boolean;
}

/** Bước chụp ảnh chân dung bằng webcam (có QR để mở trên điện thoại), tự tắt camera khi bước không còn hoạt động. */
export function FaceCaptureStep({
  onCapture,
  previewUrl,
  onRetake,
  onNext,
  onPrev,
  returnUrl,
  isActive = true,
}: FaceCaptureStepProps) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraStarted, setCameraStarted] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Dừng các luồng camera một cách sạch sẽ
  /** Dừng mọi track của luồng camera và gỡ luồng khỏi thẻ video. */
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Điều chỉnh state ngay trong lúc render khi isActive chuyển sang false (mẫu của React)
  // Tránh camera còn ở trạng thái 'started' khi người dùng chuyển tab hoặc bước
  const [prevIsActive, setPrevIsActive] = useState(isActive);
  if (prevIsActive !== isActive) {
    setPrevIsActive(isActive);
    if (!isActive) {
      setCameraStarted(false);
      setCameraLoading(false);
      setCameraError(null);
    }
  }

  /** Xin quyền và bật camera trước, rồi phát lên thẻ video; lỗi quyền hoặc thiếu thiết bị được đổi thành thông báo tiếng Việt. */
  const startCamera = useCallback(async () => {
    setCameraLoading(true);
    setCameraError(null);
    stopCamera();

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(t("Trình duyệt không hỗ trợ truy cập camera."));
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch {
        // Dự phòng: dùng ràng buộc video cơ bản cho webcam ngoài trên máy tính không có facingMode
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCameraLoading(false);
    } catch (err: unknown) {
      stopCamera();
      setCameraLoading(false);
      setCameraStarted(false);
      const error = err as { name?: string; message?: string };
      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        setCameraError(
          t("Quyền truy cập Camera bị từ chối. Vui lòng cho phép trên trình duyệt hoặc quét mã QR để mở trên điện thoại.")
        );
      } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
        setCameraError(
          t("Không tìm thấy thiết bị Camera trên máy tính. Bạn có thể sử dụng điện thoại bằng cách quét mã QR.")
        );
      } else {
        setCameraError(
          error.message ? t(error.message) : t("Không thể khởi động Camera. Vui lòng kiểm tra lại thiết bị hoặc dùng điện thoại.")
        );
      }
    }
  }, [stopCamera, t]);

  // Khi component unmount hoặc không còn hoạt động, dừng luồng camera đang chạy
  useEffect(() => {
    if (!isActive) {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isActive, stopCamera]);

  /** Chụp khung hình hiện tại vào canvas (lật gương) thành tệp JPEG, tắt camera và gọi {@code onCapture}. */
  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Lật ngang để có hiệu ứng gương như camera selfie
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `selfie-${Date.now()}.jpg`, {
          type: "image/jpeg",
          lastModified: Date.now(),
        });
        const url = URL.createObjectURL(file);
        stopCamera();
        setCameraStarted(false);
        onCapture(file, url);
      },
      "image/jpeg",
      0.92
    );
  };

  /** Tắt camera và yêu cầu chụp lại ảnh. */
  const handleRetakeClick = () => {
    stopCamera();
    setCameraStarted(false);
    onRetake();
  };

  /** Tắt camera rồi quay về bước trước. */
  const handlePrev = () => {
    stopCamera();
    setCameraStarted(false);
    onPrev();
  };

  const targetUrl = returnUrl
    ? (returnUrl.startsWith("http") ? returnUrl : `${window.location.origin}${returnUrl.startsWith("/") ? returnUrl : `/${returnUrl}`}`)
    : window.location.href;

  /** Sao chép liên kết của trang vào clipboard và hiện trạng thái đã sao chép trong 2,5 giây. */
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(targetUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // ignore
    }
  };

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
    targetUrl
  )}`;

  const isCameraRunning = Boolean(isActive && cameraStarted && !previewUrl);

  return (
    <div className="space-y-5">
      {/* Canvas ẩn dùng để chụp khung hình */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Ô nhập ẩn phục vụ kiểm thử tự động hoặc dự phòng camera trên điện thoại */}
      <input
        type="file"
        data-testid="face-capture-input"
        aria-label={t("Chụp ảnh khuôn mặt")}
        accept="image/jpeg,image/png"
        className="sr-only"
        onChange={(e) => {
          const captured = e.target.files?.[0];
          if (captured) {
            const url = URL.createObjectURL(captured);
            onCapture(captured, url);
          }
        }}
      />

      {/* Thông tin tiêu đề */}
      <div className="space-y-1">
        <h3 className="text-base sm:text-lg font-bold app-text-main">
          {t("Chụp khuôn mặt")}
        </h3>
        <p className="text-xs sm:text-sm app-text-muted">
          {t("Đưa khuôn mặt vào giữa khung hình. Tháo kính râm và khẩu trang.")}
        </p>
      </div>

      {/* Khung camera chính hoặc ảnh xem trước */}
      <div className="rounded-xl border app-border app-bg-card overflow-hidden">
        {/* Trạng thái 1: đã có ảnh chụp */}
        {previewUrl ? (
          <div className="p-6 flex flex-col items-center justify-center space-y-4 text-center">
            <div className="relative w-56 h-72 sm:w-64 sm:h-80 rounded-xl overflow-hidden border-2 border-emerald-500 bg-slate-950 flex items-center justify-center shadow-md">
              <img
                src={previewUrl}
                alt={t("Ảnh khuôn mặt đã chụp")}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2.5 right-2.5 bg-emerald-600 text-white rounded-full p-1 shadow-sm">
                <FiCheck className="w-3.5 h-3.5 stroke-[3]" />
              </div>
            </div>

            <div className="space-y-1">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold border border-emerald-300 dark:border-emerald-800">
                <FiCheck className="w-3 h-3 stroke-[3]" />
                <span>{t("Ảnh đạt yêu cầu")}</span>
              </span>
              <p className="text-xs app-text-muted">
                {t("Khuôn mặt rõ ràng và nhìn thẳng. Bạn có thể chụp lại nếu muốn.")}
              </p>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={handleRetakeClick}
                className="px-4 py-2 rounded-lg border app-border app-bg-page hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs font-semibold app-text-main inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <FiRefreshCw className="w-3.5 h-3.5" />
                <span>{t("Chụp lại")}</span>
              </button>
              <button
                type="button"
                onClick={onNext}
                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-98"
              >
                <span>{t("Tiếp tục")}</span>
                <FiArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : !isCameraRunning ? (
          /* Trạng thái 2: màn hình sẵn sàng trước khi chụp */
          <div className="p-6 sm:p-10 flex flex-col items-center justify-center text-center space-y-5 max-w-md mx-auto">
            {/* Hình minh họa khung oval */}
            <div className="w-36 h-48 rounded-[36px] border-2 border-dashed border-blue-400 dark:border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 flex flex-col items-center justify-center text-blue-500 space-y-2">
              <FiUser className="w-12 h-12 stroke-1 opacity-70" />
              <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400">
                {t("Khung khuôn mặt")}
              </span>
            </div>

            {cameraError && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2 text-left">
                <FiAlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                <span className="leading-relaxed">{cameraError}</span>
              </div>
            )}

            <div className="space-y-1">
              <p className="text-xs app-text-muted leading-relaxed">
                {t("Hệ thống sẽ kiểm tra khuôn mặt và đối chiếu với ảnh trên CCCD.")}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center">
              <button
                type="button"
                onClick={() => {
                  setCameraStarted(true);
                  void startCamera();
                }}
                className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-98"
              >
                <FiCamera className="w-4 h-4" />
                <span>{t("Bật camera")}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowQrModal(true)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-lg border app-border hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs font-semibold app-text-main inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <FiSmartphone className="w-3.5 h-3.5" />
                <span>{t("Chụp trên điện thoại")}</span>
              </button>
            </div>
          </div>
        ) : (
          /* Trạng thái 3: luồng camera trực tiếp */
          <div className="relative w-full bg-black flex flex-col items-center justify-center min-h-[380px] sm:min-h-[440px]">
            {cameraLoading && (
              <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center z-20 space-y-2 text-white">
                <FiRefreshCw className="w-6 h-6 text-blue-400 animate-spin" />
                <span className="text-xs font-medium">{t("Đang mở camera...")}</span>
              </div>
            )}

            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full max-h-[440px] object-cover scale-x-[-1]"
            />

            {/* Lớp phủ khung oval */}
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-10">
              <div className="w-48 h-64 sm:w-56 sm:h-72 rounded-[40px] border-2 border-dashed border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] flex items-center justify-center" />
              <span className="mt-3 px-3 py-1 rounded-full bg-black/75 text-white text-xs font-medium backdrop-blur-xs">
                {t("Giữ khuôn mặt trong khung hình")}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Nút chụp (khi camera đang chạy) */}
      {!previewUrl && isCameraRunning && (
        <div className="flex flex-col items-center justify-center gap-3 pt-1">
          <button
            type="button"
            onClick={handleCapture}
            disabled={cameraLoading}
            className="px-8 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm inline-flex items-center gap-2 shadow-md shadow-blue-500/20 transition-all cursor-pointer active:scale-98"
          >
            <div className="w-3.5 h-3.5 rounded-full bg-white animate-pulse" />
            <span>{t("Chụp ảnh")}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              stopCamera();
              setCameraStarted(false);
            }}
            className="text-xs app-text-muted hover:text-rose-500 transition-colors cursor-pointer py-1"
          >
            ✕ {t("Tắt camera")}
          </button>
        </div>
      )}

      {/* Điều hướng bước ở phía dưới */}
      <div className="flex items-center justify-between pt-2 border-t app-border">
        <button
          type="button"
          onClick={handlePrev}
          className="px-4 py-2 rounded-lg border app-border text-xs sm:text-sm font-semibold hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors inline-flex items-center gap-1.5 cursor-pointer app-text-main"
        >
          <FiArrowLeft className="w-4 h-4" />
          <span>{t("Quay lại")}</span>
        </button>

        {previewUrl ? (
          <button
            type="button"
            onClick={onNext}
            className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm inline-flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-98"
          >
            <span>{t("Tiếp tục")}</span>
            <FiArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <span className="text-xs app-text-muted">
            {t("Bước 3/4")}
          </span>
        )}
      </div>

      {/* Hộp thoại mã QR để dùng camera điện thoại thay thế */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-sm rounded-xl app-bg-card border app-border p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 app-text-muted hover:app-text-main transition-colors cursor-pointer"
            >
              <FiX className="w-4 h-4" />
            </button>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold app-text-main">
                {t("Chụp trên điện thoại")}
              </h3>
              <p className="text-xs app-text-muted">
                {t("Quét mã QR bên dưới bằng camera điện thoại để tiếp tục:")}
              </p>
            </div>

            {/* Mã QR */}
            <div className="w-48 h-48 mx-auto bg-white rounded-lg p-2.5 border border-slate-200 flex items-center justify-center overflow-hidden shadow-xs">
              <img
                src={qrCodeUrl}
                alt="QR Code eKYC Mobile"
                className="w-full h-full object-contain"
              />
            </div>

            <button
              type="button"
              onClick={handleCopyLink}
              className="w-full py-2 px-3 rounded-lg border app-border app-bg-page hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs font-semibold app-text-main inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              {copiedLink ? (
                <>
                  <FiCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{t("Đã sao chép liên kết!")}</span>
                </>
              ) : (
                <>
                  <FiCopy className="w-3.5 h-3.5" />
                  <span>{t("Sao chép liên kết eKYC")}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
