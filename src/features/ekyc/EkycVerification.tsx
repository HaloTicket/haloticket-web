import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ekycApi } from "@/services/ekycApi";
import { PATHS } from "@/routes/paths";
import { EKYC_STATUS_LABELS, type EkycStatusResponse } from "@/types/ekyc";
import {
  FiCheckCircle,
  FiAlertCircle,
  FiRefreshCw,
  FiCheck,
  FiArrowLeft,
  FiClock,
  FiInfo,
  FiCreditCard,
  FiChevronDown,
} from "react-icons/fi";
import { FaTicketAlt, FaMicrochip } from "react-icons/fa";
import { ImageUploadStep } from "./components/ImageUploadStep";
import { FaceCaptureStep } from "./components/FaceCaptureStep";
import { ReviewSubmitStep } from "./components/ReviewSubmitStep";
import { EkycConfirmationStep } from "./components/EkycConfirmationStep";
import { userApi, type UserProfile } from "@/services/userApi";
import { rotateImageFile, readImageMetadata, type ImageMetadata } from "@/utils/imageUtils";

export default function EkycVerification() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const returnUrl =
    params.get("returnUrl") === PATHS.ADMIN_SETTINGS_SECTION("account-security")
      ? PATHS.ADMIN_SETTINGS_SECTION("account-security")
      : params.get("returnUrl") === PATHS.CREATE_EVENT
      ? PATHS.CREATE_EVENT
      : `${PATHS.PROFILE}?tab=ekyc`;

  const [status, setStatus] = useState<EkycStatusResponse | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState(false);
  const [files, setFiles] = useState<(File | null)[]>([null, null, null]);
  const [previews, setPreviews] = useState<(string | null)[]>([null, null, null]);
  const [metadatas, setMetadatas] = useState<(ImageMetadata | null)[]>([null, null, null]);
  const [rotatingIndex, setRotatingIndex] = useState<number | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [uploadVersion, setUploadVersion] = useState(0);
  const inFlight = useRef(false);
  const previewUrls = useRef<(string | null)[]>([null, null, null]);

  // Reset inFlight on unmount to prevent stale lock across hot-reloads
  useEffect(() => {
    return () => { inFlight.current = false; };
  }, []);

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  useEffect(() => {
    let active = true;
    Promise.allSettled([ekycApi.getStatus(), userApi.getProfile()]).then(([ekycRes, profileRes]) => {
      if (!active) return;
      if (ekycRes.status === "fulfilled") {
        const val = ekycRes.value;
        setStatus(val);
        if (val.status === "APPROVED") {
          setCurrentStep(5);
        }
      } else {
        setError(t("Không thể tải trạng thái xác minh từ hệ thống đối soát."));
      }
      if (profileRes.status === "fulfilled") {
        setUserProfile(profileRes.value);
      }
      setLoading(false);
    });
    return () => { active = false; };
  }, [refresh, params, t]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      previewUrls.current.forEach((url) => {
        if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
      });
    };
  }, []);

  const handleFileSelect = (index: number, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (
      file &&
      (![" image/jpeg", "image/jpeg", "image/png"].includes(file.type) ||
        file.size > 10 * 1024 * 1024 ||
        !file.size)
    ) {
      e.target.value = "";
      if (previewUrls.current[index]?.startsWith("blob:")) URL.revokeObjectURL(previewUrls.current[index]!);
      previewUrls.current[index] = null;
      setFiles((c) => c.map((old, i) => (i === index ? null : old)));
      setPreviews((c) => c.map((old, i) => (i === index ? null : old)));
      setMetadatas((c) => c.map((old, i) => (i === index ? null : old)));
      setError(t("Vui lòng chọn ảnh định dạng JPEG hoặc PNG có dung lượng dưới 10 MB."));
      return;
    }
    setError("");
    if (previewUrls.current[index]?.startsWith("blob:")) URL.revokeObjectURL(previewUrls.current[index]!);
    setFiles((c) => c.map((old, i) => (i === index ? file : old)));
    if (file) {
      const url = URL.createObjectURL(file);
      previewUrls.current[index] = url;
      setPreviews((c) => c.map((old, i) => (i === index ? url : old)));
      void readImageMetadata(file).then((meta) => {
        setMetadatas((c) => c.map((old, i) => (i === index ? meta : old)));
      });
    } else {
      previewUrls.current[index] = null;
      setPreviews((c) => c.map((old, i) => (i === index ? null : old)));
      setMetadatas((c) => c.map((old, i) => (i === index ? null : old)));
    }
  };

  /** Called by ImageUploadStep after crop modal confirms */
  const handleCropConfirm = (index: number, croppedFile: File, croppedUrl: string) => {
    setError("");
    if (previewUrls.current[index]?.startsWith("blob:")) URL.revokeObjectURL(previewUrls.current[index]!);
    previewUrls.current[index] = croppedUrl;
    setFiles((c) => c.map((f, i) => (i === index ? croppedFile : f)));
    setPreviews((c) => c.map((p, i) => (i === index ? croppedUrl : p)));
    void readImageMetadata(croppedFile).then((meta) => {
      setMetadatas((c) => c.map((m, i) => (i === index ? meta : m)));
    });
  };

  /** Called by FaceCaptureStep after webcam photo is captured */
  const handleFaceCapture = (file: File, url: string) => {
    setError("");
    if (previewUrls.current[2]?.startsWith("blob:")) URL.revokeObjectURL(previewUrls.current[2]!);
    previewUrls.current[2] = url;
    setFiles((c) => [c[0], c[1], file]);
    setPreviews((c) => [c[0], c[1], url]);
    void readImageMetadata(file).then((meta) => {
      setMetadatas((c) => [c[0], c[1], meta]);
    });
  };

  /** Called by FaceCaptureStep when retaking portrait */
  const handleFaceRetake = () => {
    if (previewUrls.current[2]?.startsWith("blob:")) URL.revokeObjectURL(previewUrls.current[2]!);
    previewUrls.current[2] = null;
    setFiles((c) => [c[0], c[1], null]);
    setPreviews((c) => [c[0], c[1], null]);
    setMetadatas((c) => [c[0], c[1], null]);
  };

  const handleRotate = async (index: number, degrees: number) => {
    const currentFile = files[index];
    if (!currentFile || busy || rotatingIndex !== null) return;
    setRotatingIndex(index);
    try {
      const { rotatedFile, width, height } = await rotateImageFile(currentFile, degrees);
      if (previewUrls.current[index]?.startsWith("blob:")) URL.revokeObjectURL(previewUrls.current[index]!);
      const newUrl = URL.createObjectURL(rotatedFile);
      previewUrls.current[index] = newUrl;
      setFiles((c) => c.map((f, i) => (i === index ? rotatedFile : f)));
      setPreviews((c) => c.map((p, i) => (i === index ? newUrl : p)));
      setMetadatas((c) =>
        c.map((meta, i) =>
          i === index
            ? { width, height, size: rotatedFile.size, isPortrait: height > width, quality: meta?.quality || "standard" }
            : meta
        )
      );
    } catch (err) {
      console.warn("Lỗi khi xoay ảnh:", err);
    } finally {
      setRotatingIndex(null);
    }
  };

  async function submit() {
    if (inFlight.current || !consent || !files[0] || !files[1] || !files[2]) {
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setError("");
    setSuccessMessage("");
    try {
      const session = await ekycApi.startSession(true, "2026.1");
      if (Date.parse(session.expiresAt) <= Date.now()) throw new Error("Expired session");
      const verifyResult = await ekycApi.verify(session.sessionId, files[0]!, files[1]!, files[2]!);
      const finalStatus = verifyResult;
      setStatus(finalStatus);

      // If rejected, show error message from verifyResult
      if (verifyResult.status === "REJECTED") {
        if (verifyResult.reasonCode === "OCR_DATA_INCOMPLETE") {
          setError(t("Không đọc được đầy đủ thông tin từ CCCD. Vui lòng chụp rõ nét hơn."));
        } else if (verifyResult.reasonCode === "DOCUMENT_EXPIRED") {
          setError(t("CCCD đã hết hạn. Vui lòng sử dụng giấy tờ còn hiệu lực."));
        } else if (verifyResult.reasonCode === "DOCUMENT_TYPE_INVALID") {
          setError(t("VNPT không nhận diện ảnh là CCCD gắn chip. Vui lòng kiểm tra đúng mặt trước, mặt sau và chụp đủ bốn góc thẻ."));
        } else if (verifyResult.reasonCode === "DOCUMENT_INVALID") {
          setError(t("VNPT đã đọc được CCCD nhưng phát hiện cảnh báo về dữ liệu, chất lượng ảnh hoặc tính hợp lệ. Vui lòng chụp lại rõ nét, đủ bốn góc và đúng hai mặt của cùng một CCCD."));
        } else if (verifyResult.reasonCode === "FACE_LIVENESS_FAILED") {
          setError(t("Khuôn mặt không vượt qua kiểm tra người thật (Face Liveness). Vui lòng nhìn thẳng camera và đảm bảo đủ ánh sáng."));
        } else if (verifyResult.reasonCode === "FACE_MATCH_FAILED") {
          setError(t("Khuôn mặt không khớp với ảnh trên CCCD. Vui lòng chụp lại khuôn mặt rõ ràng, không đeo kính hoặc phụ kiện."));
        } else if (verifyResult.reasonCode === "FACE_MULTIPLE_DETECTED") {
          setError(t("Phát hiện nhiều hơn 1 khuôn mặt trong khung hình. Vui lòng chụp một mình trong khung hình camera."));
        } else if (verifyResult.reasonCode === "PROVIDER_REJECTED") {
          setError(t("VNPT từ chối hồ sơ. Vui lòng kiểm tra chất lượng ảnh và thử lại."));
        } else if (verifyResult.reasonCode) {
          setError(t("Xác minh bị từ chối: {{code}}. Vui lòng kiểm tra lại giấy tờ.", { code: verifyResult.reasonCode }));
        } else {
          setError(t("Xác minh không thành công. Vui lòng kiểm tra lại ảnh CCCD và ảnh chân dung rồi thử lại."));
        }
        // Don't reset form for rejected cases - let user retry
        inFlight.current = false;
        setBusy(false);
        return;
      }

      if (verifyResult.status === "PENDING") {
        setSuccessMessage(t("Hồ sơ đã được gửi thành công. Chờ VNPT eKYC đối soát (thường 5–15 phút)."));
        inFlight.current = false;
        setBusy(false);
        return;
      }

      setParams((prev) => { const next = new URLSearchParams(prev); next.delete("mode"); return next; });
      setFiles([null, null, null]);
      previewUrls.current.forEach((url) => { if (url) URL.revokeObjectURL(url); });
      previewUrls.current = [null, null, null];
      setPreviews([null, null, null]);
      setMetadatas([null, null, null]);
      setConsent(false);
      setUploadVersion((v) => v + 1);
      // Show success message based on returned status and switch to step 5
      if (finalStatus.status === "APPROVED") {
        void userApi.getProfile().then(setUserProfile);
        setSuccessMessage(t("Xác minh CCCD & Khuôn mặt thành công! Vui lòng kiểm tra lại thông tin cá nhân và tài khoản nhận tiền."));
        setCurrentStep(5);
      } else if (finalStatus.status === "PENDING") {
        setSuccessMessage(t("Hồ sơ đã được gửi thành công. Chờ VNPT eKYC đối soát (thường 5–15 phút)."));
        setCurrentStep(1);
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string; error?: string } }; message?: string };
      const apiMsg = axiosErr.response?.data?.message || axiosErr.response?.data?.error;
      if (apiMsg === "EKYC_ATTEMPT_LIMIT") {
        setError(t("Không thể hoàn tất xác minh: Bạn đã vượt quá số lần thử cho phép trong ngày. Vui lòng thử lại sau."));
      } else if (apiMsg && (apiMsg.includes("Loại giấy tờ") || apiMsg.includes("Vui lòng") || apiMsg.includes("CCCD") || apiMsg.includes("khuôn mặt") || apiMsg.includes("Face"))) {
        setError(apiMsg);
      } else if (apiMsg) {
        setError(t("Không thể hoàn tất xác minh ({{msg}}). Vui lòng kiểm tra lại giấy tờ và gửi lại.", { msg: apiMsg }));
      } else {
        setError(t("Không thể hoàn tất xác minh. Vui lòng kiểm tra lại kết nối và độ rõ nét của ảnh, sau đó gửi lại."));
      }
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  const activateStep = (step: 1 | 2 | 3 | 4 | 5) => {
    setCurrentStep(step);
  };

  return (
    <div className="app-bg-page app-text-main py-8 sm:py-12 px-4 sm:px-6 lg:px-8 selection:bg-blue-500 selection:text-white">
      <div className="max-w-2xl w-full mx-auto space-y-5">
        {/* Top Back Navigation */}
        <div className="flex items-center justify-between">
          <Link
            to={returnUrl}
            className="inline-flex items-center gap-1.5 text-xs font-semibold app-text-muted hover:app-text-main transition-colors"
          >
            <FiArrowLeft className="w-4 h-4" />
            <span>{t("Quay lại Tài khoản")}</span>
          </Link>
          <span className="text-xs app-text-muted font-medium">
            {t("Bước {{current}} / {{total}}", { current: currentStep, total: 4 })}
          </span>
        </div>

        {/* Page Title & Clean Status */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight app-text-main">
              {t("Xác minh danh tính")}
            </h1>
            {status?.status === "APPROVED" ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                <FiCheck className="w-3 h-3 stroke-[3]" />
                <span>{t("Đã xác thực")}</span>
              </span>
            ) : status?.status === "PENDING" ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                <FiClock className="w-3 h-3" />
                <span>{t("Đang đối soát")}</span>
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border app-border">
                <span>{t("Chưa xác minh")}</span>
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm app-text-muted">
            {t("Xác minh thông tin CCCD để kích hoạt các tính năng dành cho nhà tổ chức.")}
          </p>
        </div>

        {/* Compact Stepper */}
        <div className="w-full app-bg-card border app-border rounded-xl px-3 sm:px-4 py-2.5 shadow-2xs">
          <div className="flex items-center justify-between overflow-x-auto no-scrollbar gap-2 sm:gap-4">
            {[
              { step: 1 as const, title: t("CCCD mặt trước") },
              { step: 2 as const, title: t("CCCD mặt sau") },
              { step: 3 as const, title: t("Khuôn mặt") },
              { step: 4 as const, title: t("Kiểm tra") },
            ].map(({ step, title }) => {
              const isApproved = status?.status === "APPROVED";
              const isCompleted =
                (step === 1 && (Boolean(files[0]) || (isApproved && params.get("mode") !== "update"))) ||
                (step === 2 && (Boolean(files[1]) || (isApproved && params.get("mode") !== "update"))) ||
                (step === 3 && (Boolean(files[2]) || (isApproved && params.get("mode") !== "update"))) ||
                (step === 4 && isApproved);
              const isActive = currentStep === step;

              return (
                <button
                  key={step}
                  type="button"
                  onClick={() => activateStep(step)}
                  className="flex items-center gap-1.5 sm:gap-2 py-1 px-1.5 rounded-lg text-xs cursor-pointer transition-all shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${isActive
                      ? "bg-blue-600 text-white shadow-xs"
                      : isCompleted
                        ? "bg-emerald-600 text-white"
                        : "app-bg-subnav app-text-muted border app-border"
                      }`}
                  >
                    {isCompleted && !isActive ? <FiCheck className="w-3.5 h-3.5 stroke-[3]" /> : step}
                  </div>

                  <span
                    className={`text-xs hidden sm:inline transition-colors ${isActive
                      ? "text-blue-600 dark:text-blue-400 font-bold"
                      : isCompleted
                        ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                        : "app-text-muted font-normal"
                      }`}
                  >
                    {title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="space-y-6">

          {/* LOADING STATE */}
          {loading && (
            <div className="app-bg-card app-border rounded-xl border p-8 sm:p-12 text-center space-y-4 shadow-2xs">
              <div className="w-12 h-12 rounded-lg bg-blue-600 text-white flex items-center justify-center mx-auto shadow-sm">
                <FiRefreshCw className="w-6 h-6 animate-spin" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold app-text-main">{t("Đang kiểm tra trạng thái xác minh…")}</h3>
                <p className="text-xs app-text-muted max-w-sm mx-auto">
                  {t("Hệ thống đang tải dữ liệu định danh của tài khoản.")}
                </p>
              </div>
            </div>
          )}

          {/* ERROR / OFFLINE STATE */}
          {!loading && !status && (
            <div role="alert" className="app-bg-card app-border rounded-xl border p-6 sm:p-8 space-y-5 animate-in fade-in">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
                <div className="w-12 h-12 rounded-lg bg-rose-100 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <FiAlertCircle className="w-6 h-6" />
                </div>
                <div className="space-y-1 flex-1">
                  <h2 className="text-base sm:text-lg font-bold app-text-main">
                    {t("Không thể tải trạng thái xác minh. Vui lòng thử lại.")}
                  </h2>
                  <p className="text-xs app-text-muted leading-relaxed">
                    {error || t("Không thể tải trạng thái xác minh. Vui lòng thử lại.")}
                  </p>
                </div>
              </div>
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-zinc-900/60 border app-border space-y-3 text-xs sm:text-sm">
                <h4 className="font-bold app-text-main flex items-center gap-2">
                  <FiInfo className="w-4 h-4 text-blue-500 shrink-0" />
                  <span>{t("Gợi ý khắc phục nhanh:")}</span>
                </h4>
                <ul className="space-y-2 text-xs app-text-muted list-disc list-inside">
                  <li>{t("Kiểm tra kết nối mạng Internet và thử lại.")}</li>
                  <li>{t("Bấm nút \"Thử lại\" bên dưới để hệ thống khởi tạo lại phiên kết nối.")}</li>
                  <li>{t("Hoặc tải lại trang sau ít phút nếu máy chủ đang bảo trì định kỳ.")}</li>
                </ul>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t app-border">
                <Link
                  to={returnUrl}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl border app-border text-xs sm:text-sm font-semibold app-text-main hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors text-center order-3 sm:order-1"
                >
                  {t("Về hồ sơ")}
                </Link>
                <button
                  type="button"
                  className="w-full sm:w-auto min-h-11 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 px-5 py-3 font-semibold text-xs sm:text-sm transition-all cursor-pointer inline-flex items-center justify-center gap-2 border app-border app-text-main order-1 sm:order-2"
                  onClick={() => { setLoading(true); setError(""); setRefresh((v) => v + 1); }}
                >
                  <FiRefreshCw className="w-4 h-4" />
                  <span>{t("Thử lại")}</span>
                </button>
              </div>
            </div>
          )}

          {/* SUCCESS BANNER (submit succeeded) */}
          {successMessage && (
            <div role="status" className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm flex items-start gap-3 shadow-xs animate-in fade-in">
              <FiCheckCircle className="w-5 h-5 shrink-0 text-emerald-500 mt-0.5" />
              <div className="flex-1 space-y-0.5">
                <span className="font-bold">{t("Thành công:")}</span>
                <p>{successMessage}</p>
              </div>
              <button
                type="button"
                aria-label={t("Đóng thông báo")}
                onClick={() => setSuccessMessage("")}
                className="shrink-0 text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-200 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* ERROR BANNER (submit failed) */}
          {error && status && (
            <div role="alert" className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs sm:text-sm flex items-start gap-3 shadow-xs animate-in fade-in">
              <FiAlertCircle className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
              <div className="flex-1 space-y-0.5">
                <span className="font-bold">{t("Lỗi xác minh:")}</span>
                <p>{error}</p>
              </div>
            </div>
          )}

          {/* APPROVED STATE: Load personal info & payment confirmation */}
          {status?.status === "APPROVED" && (
            <div className="space-y-8 animate-in fade-in">
              <EkycConfirmationStep
                status={status}
                userProfile={userProfile}
                returnUrl={returnUrl}
                onBackToVerification={() => {
                  setParams((prev) => {
                    const next = new URLSearchParams(prev);
                    next.set("mode", "update");
                    return next;
                  });
                  setCurrentStep(1);
                }}
              />

              {/* Collapsible Digital Identity Card & Privileges */}
              <div className="max-w-md mx-auto w-full pt-2 border-t app-border text-center">
                <details className="group">
                  <summary className="text-xs font-bold text-slate-500 hover:app-text-main cursor-pointer list-none inline-flex items-center gap-1.5 py-2 px-4 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors">
                    <FiCreditCard className="w-4 h-4 text-blue-500" />
                    <span>{t("Xem thẻ CCCD điện tử đã đối soát")}</span>
                    <FiChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="mt-4 text-left space-y-4">
                    {/* Digital Identity Card */}
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white p-6 shadow-xl border border-blue-500/30">
                      <div className="flex items-center justify-between pb-3 border-b border-white/10">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-xs">
                            <FaTicketAlt className="w-3.5 h-3.5 transform -rotate-12" />
                          </div>
                          <div>
                            <span className="text-[11px] font-extrabold uppercase text-blue-300 block leading-none">HaloTicket Identity</span>
                            <span className="text-[9px] text-slate-400">{t("Đã xác minh bởi VNPT eKYC")}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-bold">
                          <FaMicrochip className="w-3 h-3 text-amber-400" />
                          <span>CHIP</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 py-4">
                        <div>
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">{t("Họ và tên")}</span>
                          <p className="text-sm font-extrabold uppercase text-white truncate">{status.legalName || "—"}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">{t("Số CCCD")}</span>
                          <p className="text-xs font-mono font-extrabold text-blue-400">{status.documentNumber || "—"}</p>
                        </div>
                      </div>
                      <div className="flex justify-between items-center pt-3 border-t border-white/10 text-[10px] text-slate-400">
                        <div className="flex items-center gap-1 text-emerald-400">
                          <FiCheckCircle className="w-3.5 h-3.5" />
                          <span>{t("Hợp lệ & Không sửa đổi")}</span>
                        </div>
                        <span>{t("Cập nhật:")} {status.verifiedAt ? new Date(status.verifiedAt).toLocaleDateString("vi-VN") : t("Hôm nay")}</span>
                      </div>
                    </div>
                  </div>
                </details>
              </div>
            </div>
          )}

          {/* PENDING STATE */}
          {status?.status === "PENDING" && (
            <div className="app-bg-card app-border rounded-3xl border p-8 sm:p-12 space-y-6 shadow-md text-center animate-in fade-in">
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 rounded-full bg-amber-400/20 animate-ping" />
                <div className="relative w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/10">
                  <FiClock className="w-9 h-9 animate-pulse" />
                </div>
              </div>
              <div className="space-y-2 max-w-lg mx-auto">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 text-xs font-bold border border-amber-300 dark:border-amber-800">
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                  <span role="status">{t(EKYC_STATUS_LABELS.PENDING)}</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold app-text-main">{t("Hồ sơ đang được đối soát")}</h2>
                <p className="text-xs sm:text-sm app-text-muted leading-relaxed">
                  {t("Hồ sơ đang chờ kết quả xác minh. Bạn có thể kiểm tra lại trạng thái sau.")}
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-900/60 border app-border max-w-md mx-auto text-xs app-text-muted space-y-1">
                <p>⏱️ {t("Thời gian xử lý trung bình: 5 - 15 phút")}</p>
                <p>📧 {t("Kết quả phê duyệt sẽ được thông báo trực tiếp qua Email của bạn.")}</p>
              </div>
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  className="w-full sm:w-auto min-h-11 rounded-xl bg-blue-600 hover:bg-blue-700 px-6 py-3 font-bold text-white shadow-md shadow-blue-500/25 transition-all cursor-pointer inline-flex items-center justify-center gap-2 text-xs sm:text-sm"
                  onClick={() => { setError(""); setRefresh((v) => v + 1); }}
                >
                  <FiRefreshCw className="w-4 h-4" />
                  <span>{t("Kiểm tra trạng thái")}</span>
                </button>
                <Link
                  to={returnUrl}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl border app-border text-xs sm:text-sm font-semibold app-text-main hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors text-center"
                >
                  {t("Về hồ sơ")}
                </Link>
              </div>
            </div>
          )}

          {/* UPLOAD & VERIFICATION CONTAINER */}
          {status && status.status !== "APPROVED" && status.status !== "PENDING" && (
            <div className="space-y-6">
              {/* Wizard Form */}
              <form
                key={uploadVersion}
                className="app-bg-card app-border rounded-xl border p-5 sm:p-7 space-y-6 shadow-xs"
                onSubmit={(e) => {
                  e.preventDefault();
                  void submit();
                }}
              >
                {/* TAB 1 */}
                <div className={currentStep === 1 ? "block" : "hidden"}>
                  <ImageUploadStep
                    index={0}
                    label={t("CCCD mặt trước")}
                    description={t("Đặt mặt trước CCCD vào khung hình. Đảm bảo 4 góc giấy tờ nhìn rõ.")}
                    preview={previews[0]}
                    metadata={metadatas[0]}
                    rotatingIndex={rotatingIndex}
                    busy={busy}
                    currentFile={files[0]}
                    onFileChange={handleFileSelect}
                    onCropConfirm={handleCropConfirm}
                    onRotate={(i, d) => void handleRotate(i, d)}
                    nextLabel={t("Tiếp tục")}
                    onNext={() => setCurrentStep(2)}
                  />
                </div>

                {/* TAB 2 */}
                <div className={currentStep === 2 ? "block" : "hidden"}>
                  <ImageUploadStep
                    index={1}
                    label={t("CCCD mặt sau")}
                    description={t("Đảm bảo mã QR và thông tin trên giấy tờ nhìn rõ.")}
                    preview={previews[1]}
                    metadata={metadatas[1]}
                    rotatingIndex={rotatingIndex}
                    busy={busy}
                    currentFile={files[1]}
                    onFileChange={handleFileSelect}
                    onCropConfirm={handleCropConfirm}
                    onRotate={(i, d) => void handleRotate(i, d)}
                    prevLabel={t("Quay lại")}
                    onPrev={() => setCurrentStep(1)}
                    nextLabel={t("Tiếp tục")}
                    onNext={() => setCurrentStep(3)}
                  />
                </div>

                {/* TAB 3: Chụp khuôn mặt */}
                <div className={currentStep === 3 ? "block" : "hidden"}>
                  <FaceCaptureStep
                    isActive={currentStep === 3}
                    file={files[2]}
                    previewUrl={previews[2]}
                    onCapture={handleFaceCapture}
                    onRetake={handleFaceRetake}
                    onPrev={() => setCurrentStep(2)}
                    onNext={() => setCurrentStep(4)}
                    returnUrl={returnUrl}
                  />
                </div>

                {/* TAB 4: Kiểm tra thông tin & Gửi xác minh */}
                <div className={currentStep === 4 ? "block" : "hidden"}>
                  <ReviewSubmitStep
                    previews={previews}
                    metadatas={metadatas}
                    files={files}
                    rotatingIndex={rotatingIndex}
                    consent={consent}
                    busy={busy}
                    onConsentChange={setConsent}
                    onRotate={(i, d) => void handleRotate(i, d)}
                    onGoToStep={(s) => setCurrentStep(s as 1 | 2 | 3 | 4 | 5)}
                    onPrev={() => setCurrentStep(3)}
                    returnUrl={returnUrl}
                  />
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
