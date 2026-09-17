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
  FiShield,
} from "react-icons/fi";
import { Link } from "react-router-dom";

interface FaceCaptureStepProps {
  onCapture: (file: File, previewUrl: string) => void;
  previewUrl: string | null;
  file: File | null;
  onRetake: () => void;
  onNext: () => void;
  onPrev: () => void;
  returnUrl: string;
  isActive?: boolean;
}

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

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    setCameraLoading(true);
    setCameraError(null);
    stopCamera();

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Trình duyệt không hỗ trợ truy cập camera.");
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
        // Fallback to basic video constraint for external PC webcams without facingMode
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => { });
      }
      setCameraLoading(false);
    } catch (err: unknown) {
      stopCamera();
      setCameraLoading(false);
      const error = err as { name?: string; message?: string };
      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        setCameraError(
          "Quyền truy cập Camera bị từ chối hoặc chưa được cấp. Vui lòng bấm 'Cấp quyền & Bật Camera' bên dưới, cho phép trên thanh địa chỉ trình duyệt, hoặc quét mã QR để mở trên điện thoại."
        );
      } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
        setCameraError(
          "Không tìm thấy thiết bị Camera/Webcam trên máy tính của bạn. Vui lòng sử dụng điện thoại bằng cách quét mã QR bên dưới."
        );
        setShowQrModal(true);
      } else {
        setCameraError(
          error.message || "Không thể khởi động Camera. Vui lòng kiểm tra lại thiết bị hoặc dùng điện thoại."
        );
      }
    }
  }, [stopCamera]);

  // When component unmounts or becomes inactive, stop any active camera hardware stream
  useEffect(() => {
    if (!isActive) {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isActive, stopCamera]);

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

    // Flip horizontally for mirroring effect from selfie camera
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const capturedFile = new File([blob], `face_portrait_${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        const url = URL.createObjectURL(capturedFile);
        stopCamera();
        onCapture(capturedFile, url);
      },
      "image/jpeg",
      0.95
    );
  };

  const isCameraRunning = Boolean(isActive && cameraStarted);

  const handlePrev = () => {
    stopCamera();
    setCameraStarted(false);
    onPrev();
  };

  const handleRetakeClick = () => {
    onRetake();
    setCameraStarted(true);
    void startCamera();
  };

  const currentUrl = typeof window !== "undefined" ? window.location.href : "";
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(
    currentUrl
  )}`;

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      void navigator.clipboard.writeText(currentUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hidden Canvas used for capturing frame */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Hidden input for test automation or mobile camera fallback */}
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

      {/* Main Camera / Preview Card */}
      <div className="relative rounded-3xl overflow-hidden border app-border bg-slate-950 shadow-2xl flex flex-col items-center justify-center min-h-[420px] sm:min-h-[480px]">
        {/* State 1: Photo already captured */}
        {previewUrl ? (
          <div className="relative w-full h-full flex flex-col items-center justify-center p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="relative w-64 h-80 sm:w-72 sm:h-90 rounded-[50px] overflow-hidden border-4 border-emerald-500 shadow-2xl shadow-emerald-500/20 bg-slate-900">
              <img
                src={previewUrl}
                alt="Ảnh chân dung đã chụp"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 right-3 bg-emerald-500 text-white rounded-full p-1.5 shadow-md">
                <FiCheck className="w-4 h-4 stroke-[3]" />
              </div>
            </div>

            <div className="text-center space-y-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                <FiCheck className="w-3.5 h-3.5" />
                <span>{t("Ảnh chân dung đã chụp thành công")}</span>
              </span>
              <p className="text-xs text-slate-400 max-w-sm">
                {t("Khuôn mặt rõ ràng, đủ sáng và nhìn thẳng. Bạn có thể chụp lại nếu muốn cải thiện chất lượng.")}
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleRetakeClick}
                className="px-5 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs sm:text-sm inline-flex items-center gap-2 transition-colors cursor-pointer"
              >
                <FiRefreshCw className="w-4 h-4" />
                <span>{t("Chụp lại")}</span>
              </button>
              <button
                type="button"
                onClick={onNext}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm inline-flex items-center gap-2 shadow-lg shadow-blue-500/30 transition-all cursor-pointer"
              >
                <span>{t("Tiếp tục sang bước xem lại")}</span>
                <FiArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : !isCameraRunning && !cameraError ? (
          /* State 2: Pre-capture Permission & Confirmation Screen */
          <div className="relative w-full h-full flex flex-col items-center justify-center p-8 sm:p-12 text-center space-y-6 max-w-lg mx-auto animate-in fade-in">
            <div className="relative">
              <div className="w-20 h-20 rounded-3xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center mx-auto shadow-xl shadow-blue-500/10">
                <FiCamera className="w-10 h-10" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold border-2 border-slate-950">
                <FiShield className="w-3 h-3" />
              </div>
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-bold border border-blue-500/20">
                {t("Bước 3: Sinh trắc học khuôn mặt")}
              </span>
              <h3 className="text-lg sm:text-xl font-black text-white">
                {t("Chụp ảnh chân dung xác thực")}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-md mx-auto">
                {t("Hệ thống cần quyền mở Camera để kiểm tra người thật (Face Liveness) và đối soát với CCCD. Bạn vui lòng bấm nút bên dưới để cấp quyền và mở camera.")}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 w-full max-w-sm text-left text-xs text-slate-400 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-2">
                <FiCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{t("Chụp trực tiếp webcam")}</span>
              </div>
              <div className="flex items-center gap-2">
                <FiCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{t("Bảo mật & mã hóa VNPT")}</span>
              </div>
              <div className="flex items-center gap-2">
                <FiCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{t("Không lưu trữ video")}</span>
              </div>
              <div className="flex items-center gap-2">
                <FiCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{t("Hỗ trợ quét bằng mobile")}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 w-full">
              <button
                type="button"
                onClick={() => {
                  setCameraStarted(true);
                  void startCamera();
                }}
                className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 text-white font-black text-sm shadow-xl shadow-blue-500/30 inline-flex items-center justify-center gap-2.5 transition-all cursor-pointer active:scale-95"
              >
                <FiCamera className="w-5 h-5" />
                <span>{t("Bật Camera & Bắt đầu chụp")}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowQrModal(true)}
                className="w-full sm:w-auto px-5 py-3.5 rounded-full border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <FiSmartphone className="w-4 h-4" />
                <span>{t("Chụp trên điện thoại")}</span>
              </button>
            </div>
          </div>
        ) : (
          /* State 3: Live Camera Feed or Error State */
          <div className="relative w-full h-full flex flex-col items-center justify-center">
            {cameraError ? (
              <div className="p-8 text-center space-y-5 max-w-md animate-in fade-in">
                <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto shadow-lg">
                  <FiAlertCircle className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-base font-extrabold text-white">
                    {t("Không thể mở Camera")}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {cameraError}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCameraStarted(true);
                      void startCamera();
                    }}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-blue-500/25"
                  >
                    <FiCamera className="w-4 h-4" />
                    <span>{t("Cấp quyền & Bật Camera")}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowQrModal(true)}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <FiSmartphone className="w-4 h-4" />
                    <span>{t("Quét mã QR sang điện thoại")}</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Live Camera Stream with Oval Mask Guide */
              <div className="relative w-full aspect-[4/3] max-w-lg sm:aspect-video overflow-hidden flex items-center justify-center">
                {cameraLoading && (
                  <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center z-20 space-y-3">
                    <FiRefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                    <p className="text-xs text-slate-400 font-medium">
                      {t("Đang kết nối Camera...")}
                    </p>
                  </div>
                )}

                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />

                {/* Oval Biometric Mask Guide Overlay */}
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-10">
                  <div className="relative w-56 h-72 sm:w-64 sm:h-80 rounded-[50px] border-2 border-dashed border-blue-400/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] flex items-center justify-center animate-pulse">
                    {/* Corner Accent Markers */}
                    <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-blue-400" />
                    <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-blue-400" />
                    <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-blue-400" />
                    <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-blue-400" />
                  </div>
                  <span className="mt-4 px-3 py-1 rounded-full bg-slate-900/90 text-blue-300 text-[11px] font-bold border border-blue-500/30 backdrop-blur-md">
                    {t("Căn chỉnh khuôn mặt vừa vặn khung hình")}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Camera Action Buttons (Only when live camera is running) */}
      {!previewUrl && !cameraError && isCameraRunning && (
        <div className="flex flex-col items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleCapture}
            disabled={cameraLoading}
            className="group relative px-8 py-3.5 rounded-full bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 text-white font-black text-sm shadow-xl shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2.5 transition-all cursor-pointer active:scale-95"
          >
            <div className="w-5 h-5 rounded-full border-2 border-white flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-white group-hover:scale-125 transition-transform" />
            </div>
            <span>{t("Chụp ảnh chân dung")}</span>
          </button>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => {
                stopCamera();
                setCameraStarted(false);
              }}
              className="text-xs text-rose-400 hover:text-rose-300 inline-flex items-center gap-1 transition-colors cursor-pointer py-1"
            >
              ✕ {t("Tắt Camera")}
            </button>
            <span className="text-slate-600">·</span>
            <button
              type="button"
              onClick={() => setShowQrModal(true)}
              className="text-xs app-text-muted hover:app-text-main inline-flex items-center gap-1.5 transition-colors cursor-pointer py-1"
            >
              <FiSmartphone className="w-3.5 h-3.5 text-blue-500" />
              <span>{t("Quét mã QR để chụp bằng điện thoại")}</span>
            </button>
          </div>
        </div>
      )}

      {/* Guidelines & Tips */}
      <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 space-y-2 text-xs">
        <div className="flex items-center gap-2 font-bold text-blue-700 dark:text-blue-300">
          <FiShield className="w-4 h-4 text-blue-500" />
          <span>{t("Yêu cầu kiểm tra người thật (Face Liveness & Matching)")}</span>
        </div>
        <ul className="grid grid-cols-1 sm:grid-cols-3 gap-2 app-text-muted">
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span>{t("Nhìn thẳng vào camera")}</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span>{t("Đảm bảo đủ ánh sáng, rõ nét")}</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span>{t("Không đeo kính râm, mũ, khẩu trang")}</span>
          </li>
        </ul>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={handlePrev}
          className="px-5 py-2.5 rounded-xl border app-border text-xs sm:text-sm font-semibold hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors inline-flex items-center gap-2 cursor-pointer app-text-main"
        >
          <FiArrowLeft className="w-4 h-4" />
          <span>{t("Quay lại mặt sau CCCD")}</span>
        </button>

        {previewUrl && (
          <button
            type="button"
            onClick={onNext}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm inline-flex items-center gap-1.5 shadow-md shadow-blue-500/25 transition-all cursor-pointer"
          >
            <span>{t("Tiếp tục")}</span>
            <FiArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Return to Profile Link */}
      <div className="text-center">
        <Link to={returnUrl} className="text-xs app-text-muted hover:app-text-main">
          ← {t("Về hồ sơ")}
        </Link>
      </div>

      {/* QR Code Modal for Mobile Camera Fallback */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-sm rounded-3xl app-bg-card border app-border p-6 sm:p-7 shadow-2xl space-y-5 animate-in zoom-in-95">
            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 app-text-muted hover:app-text-main transition-colors cursor-pointer"
            >
              <FiX className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1.5">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto shadow-sm">
                <FiSmartphone className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold app-text-main">
                {t("Chụp khuôn mặt trên điện thoại")}
              </h3>
              <p className="text-xs app-text-muted">
                {t("Dùng camera điện thoại quét mã QR bên dưới để mở trang eKYC này và chụp ảnh selfie trực tiếp.")}
              </p>
            </div>

            {/* QR Code Image */}
            <div className="w-52 h-52 mx-auto bg-white rounded-2xl p-3 shadow-md border border-slate-200 flex items-center justify-center overflow-hidden">
              <img
                src={qrCodeUrl}
                alt="QR Code eKYC Mobile"
                className="w-full h-full object-contain"
              />
            </div>

            {/* Copy Link Action */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleCopyLink}
                className="w-full py-2.5 px-4 rounded-xl border app-border app-bg-page hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs font-bold app-text-main inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {copiedLink ? (
                  <>
                    <FiCheck className="w-4 h-4 text-emerald-500" />
                    <span>{t("Đã sao chép liên kết!")}</span>
                  </>
                ) : (
                  <>
                    <FiCopy className="w-4 h-4" />
                    <span>{t("Sao chép liên kết eKYC")}</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-[11px] text-center app-text-muted">
              {t("Sau khi hoàn tất trên điện thoại, bạn có thể tải lại trang này để xem kết quả.")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
