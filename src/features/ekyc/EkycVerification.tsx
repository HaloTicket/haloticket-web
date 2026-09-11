import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ekycApi } from "@/services/ekycApi";
import { PATHS } from "@/routes/paths";
import { EKYC_STATUS_LABELS, type EkycStatusResponse } from "@/types/ekyc";
import {
  FiShield,
  FiCheckCircle,
  FiAlertCircle,
  FiArrowRight,
  FiRefreshCw,
  FiCheck,
  FiArrowLeft,
  FiClock,
  FiLock,
  FiInfo,
} from "react-icons/fi";
import { FaTicketAlt, FaMicrochip } from "react-icons/fa";
import { FiCreditCard } from "react-icons/fi";
import { ImageUploadStep } from "./components/ImageUploadStep";
import { ReviewSubmitStep } from "./components/ReviewSubmitStep";
import { rotateImageFile, readImageMetadata, type ImageMetadata } from "@/utils/imageUtils";

export default function EkycVerification() {
  const [params, setParams] = useSearchParams();
  const returnUrl =
    params.get("returnUrl") === PATHS.CREATE_EVENT
      ? PATHS.CREATE_EVENT
      : `${PATHS.PROFILE}?tab=ekyc`;

  const [status, setStatus] = useState<EkycStatusResponse | null>(null);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState(false);
  const [files, setFiles] = useState<(File | null)[]>([null, null]);
  const [previews, setPreviews] = useState<(string | null)[]>([null, null]);
  const [metadatas, setMetadatas] = useState<(ImageMetadata | null)[]>([null, null]);
  const [rotatingIndex, setRotatingIndex] = useState<number | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [uploadVersion, setUploadVersion] = useState(0);
  const inFlight = useRef(false);
  const previewUrls = useRef<(string | null)[]>([null, null]);

  // Reset inFlight on unmount to prevent stale lock across hot-reloads
  useEffect(() => {
    return () => { inFlight.current = false; };
  }, []);

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  useEffect(() => {
    let active = true;
    ekycApi
      .getStatus()
      .then((result) => { if (active) setStatus(result); })
      .catch(() => { if (active) setError("Không thể tải trạng thái xác minh từ hệ thống đối soát."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [refresh]);

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
      setError("Vui lòng chọn ảnh định dạng JPEG hoặc PNG có dung lượng dưới 10 MB.");
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
    if (inFlight.current || !consent || !files[0] || !files[1]) {
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setError("");
    setSuccessMessage("");
    try {
      const session = await ekycApi.startSession(true, "2026.1");
      if (Date.parse(session.expiresAt) <= Date.now()) throw new Error("Expired session");
      const verifyResult = await ekycApi.verify(session.sessionId, files[0]!, files[1]!);
      const finalStatus = verifyResult;
      setStatus(finalStatus);

      // If rejected, show error message from verifyResult
      if (verifyResult.status === "REJECTED") {
        if (verifyResult.reasonCode === "OCR_DATA_INCOMPLETE") {
          setError("Không đọc được đầy đủ thông tin từ CCCD. Vui lòng chụp rõ nét hơn.");
        } else if (verifyResult.reasonCode === "DOCUMENT_EXPIRED") {
          setError("CCCD đã hết hạn. Vui lòng sử dụng giấy tờ còn hiệu lực.");
        } else if (verifyResult.reasonCode === "DOCUMENT_TYPE_INVALID") {
          setError("VNPT không nhận diện ảnh là CCCD gắn chip. Vui lòng kiểm tra đúng mặt trước, mặt sau và chụp đủ bốn góc thẻ.");
        } else if (verifyResult.reasonCode === "DOCUMENT_INVALID") {
          setError("VNPT đã đọc được CCCD nhưng phát hiện cảnh báo về dữ liệu, chất lượng ảnh hoặc tính hợp lệ. Vui lòng chụp lại rõ nét, đủ bốn góc và đúng hai mặt của cùng một CCCD.");
        } else if (verifyResult.reasonCode === "PROVIDER_REJECTED") {
          setError("VNPT từ chối hồ sơ. Vui lòng kiểm tra chất lượng ảnh và thử lại.");
        } else if (verifyResult.reasonCode) {
          setError(`Xác minh bị từ chối: ${verifyResult.reasonCode}. Vui lòng kiểm tra lại giấy tờ.`);
        } else {
          setError("Xác minh không thành công. Vui lòng kiểm tra lại ảnh CCCD và thử lại.");
        }
        // Don't reset form for rejected cases - let user retry
        inFlight.current = false;
        setBusy(false);
        return;
      }

      if (verifyResult.status === "PENDING") {
        setSuccessMessage("Hồ sơ đã được gửi thành công. Chờ VNPT eKYC đối soát (thường 5–15 phút).");
        inFlight.current = false;
        setBusy(false);
        return;
      }

      setParams((prev) => { const next = new URLSearchParams(prev); next.delete("mode"); return next; });
      setFiles([null, null]);
      previewUrls.current.forEach((url) => { if (url) URL.revokeObjectURL(url); });
      previewUrls.current = [null, null];
      setPreviews([null, null]);
      setMetadatas([null, null]);
      setConsent(false);
      setCurrentStep(1);
      setUploadVersion((v) => v + 1);
      // Show success message based on returned status
      if (finalStatus.status === "APPROVED") {
        setSuccessMessage("Xác minh thành công! Danh tính của bạn đã được xác nhận.");
      } else if (finalStatus.status === "PENDING") {
        setSuccessMessage("Hồ sơ đã được gửi thành công. Chờ VNPT eKYC đối soát (thường 5–15 phút).");
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string; error?: string } }; message?: string };
      const apiMsg = axiosErr.response?.data?.message || axiosErr.response?.data?.error;
      if (apiMsg === "EKYC_ATTEMPT_LIMIT") {
        setError("Không thể hoàn tất xác minh: Bạn đã vượt quá số lần thử cho phép trong ngày. Vui lòng thử lại sau.");
      } else if (apiMsg && (apiMsg.includes("Loại giấy tờ") || apiMsg.includes("Vui lòng") || apiMsg.includes("CCCD"))) {
        setError(apiMsg);
      } else if (apiMsg) {
        setError(`Không thể hoàn tất xác minh (${apiMsg}). Vui lòng kiểm tra lại giấy tờ và gửi lại.`);
      } else {
        setError("Không thể hoàn tất xác minh. Vui lòng kiểm tra lại kết nối và độ rõ nét của ảnh, sau đó gửi lại.");
      }
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  const activateStep = (step: 1 | 2 | 3) => {
    setCurrentStep(step);
  };

  return (
    <main className="min-h-screen app-bg-page app-text-main py-6 sm:py-10 px-4 sm:px-6 lg:px-8 flex flex-col justify-between selection:bg-blue-500 selection:text-white">
      {/* Background Glow Accents */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-500/10 dark:bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-purple-500/10 dark:bg-purple-600/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-4xl w-full mx-auto space-y-8">
        {/* Navigation & Brand Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b app-border">
          <div className="flex items-center gap-3.5">
            <Link
              to={returnUrl}
              className="p-2.5 rounded-xl border app-border app-bg-card hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors text-slate-500 hover:app-text-main shadow-2xs"
              title="Quay về hồ sơ"
            >
              <FiArrowLeft className="w-4 h-4" />
            </Link>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/25">
                <FiShield className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-extrabold tracking-tight app-text-main">
                    Xác minh danh tính Nhà tổ chức
                  </h1>
                  <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    VNPT eKYC
                  </span>
                </div>
                <p className="text-xs app-text-muted mt-0.5">Xác minh danh tính trước khi tạo sự kiện</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:self-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-zinc-800/80 text-[11px] font-medium text-slate-600 dark:text-zinc-400 border app-border">
              <FiLock className="w-3.5 h-3.5 text-emerald-500" />
              <span>Ảnh được gửi để xác thực thông tin CCCD</span>
            </span>
            <Link
              to={returnUrl}
              className="text-xs font-semibold px-3.5 py-1.5 rounded-xl border app-border hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors app-text-main"
            >
              Về hồ sơ
            </Link>
          </div>
        </header>

        {/* 3-Step Interactive Stepper Buttons */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
          {[
            { step: 1 as const, title: "1. Mặt trước CCCD", sub: "Mặt trước CCCD gắn chip", hasFile: files[0] },
            { step: 2 as const, title: "2. Mặt sau giấy tờ", sub: "Mặt sau chip & mã MRZ", hasFile: files[1] },
            { step: 3 as const, title: "3. Xác minh", sub: "Bóc tách & Mở quyền", hasFile: null },
          ].map(({ step, title, sub, hasFile }) => {
            const isApprovedDone = step === 3 && status?.status === "APPROVED";
            const isDone = isApprovedDone || Boolean(hasFile);
            return (
              <button
                key={step}
                type="button"
                onClick={() => activateStep(step)}
                className={`p-3 sm:p-4 rounded-2xl border text-left sm:text-center transition-all cursor-pointer relative group ${
                  currentStep === step
                    ? "app-bg-card border-blue-500 bg-blue-50/30 dark:bg-blue-950/30 ring-2 ring-blue-500/20 app-text-main shadow-sm"
                    : isDone
                    ? "app-bg-card border-emerald-500/50 hover:border-emerald-500 bg-emerald-50/10 text-emerald-600 dark:text-emerald-400"
                    : "app-bg-card app-border hover:border-slate-400 dark:hover:border-zinc-600 opacity-80"
                }`}
              >
                <div className="flex items-center justify-between sm:justify-center gap-1.5 mb-1.5">
                  <span
                    className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                      isDone
                        ? "bg-emerald-500 text-white"
                        : currentStep === step
                        ? "bg-blue-600 text-white"
                        : "bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300"
                    }`}
                  >
                    {isDone ? <FiCheck className="w-3.5 h-3.5 stroke-[3]" /> : step}
                  </span>
                  {isDone && step !== 3 && (
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 sm:hidden">Đã tải</span>
                  )}
                </div>
                <h4 className="text-xs sm:text-sm font-bold block truncate">{title}</h4>
                <p className="text-[10px] sm:text-[11px] app-text-muted hidden sm:block mt-0.5">{sub}</p>
              </button>
            );
          })}
        </div>

        {/* LOADING STATE */}
        {loading && (
          <div className="app-bg-card app-border rounded-3xl border p-10 sm:p-14 text-center space-y-5 shadow-sm">
            <div className="relative w-16 h-16 mx-auto">
              <div className="absolute inset-0 rounded-2xl bg-blue-500/20 animate-ping" />
              <div className="relative w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
                <FiRefreshCw className="w-8 h-8 animate-spin" />
              </div>
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base sm:text-lg font-bold app-text-main">Đang kết nối cổng đối soát VNPT eKYC…</h3>
              <p className="text-xs sm:text-sm app-text-muted max-w-md mx-auto">
                Hệ thống đang tải thông tin định danh và trạng thái phê duyệt của tài khoản.
              </p>
            </div>
          </div>
        )}

        {/* ERROR / OFFLINE STATE */}
        {!loading && !status && (
          <div role="alert" className="app-bg-card app-border rounded-3xl border p-6 sm:p-10 shadow-lg space-y-6 animate-in fade-in zoom-in-95">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
              <div className="w-16 h-16 rounded-2xl bg-rose-100 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 shadow-md shadow-rose-500/10">
                <FiAlertCircle className="w-8 h-8" />
              </div>
              <div className="space-y-2 flex-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-xs font-bold border border-rose-200 dark:border-rose-800">
                  <span>Mất kết nối máy chủ</span>
                </div>
                <h2 className="text-lg sm:text-xl font-extrabold app-text-main">Không thể tải trạng thái xác minh. Vui lòng thử lại.</h2>
                <p className="text-xs sm:text-sm app-text-muted leading-relaxed">
                  {error || "Không thể tải trạng thái xác minh. Vui lòng thử lại."}
                </p>
              </div>
            </div>
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-zinc-900/60 border app-border space-y-3 text-xs sm:text-sm">
              <h4 className="font-bold app-text-main flex items-center gap-2">
                <FiInfo className="w-4 h-4 text-blue-500 shrink-0" />
                <span>Gợi ý khắc phục nhanh:</span>
              </h4>
              <ul className="space-y-2 text-xs app-text-muted list-disc list-inside">
                <li>Kiểm tra kết nối mạng Internet và thử lại.</li>
                <li>Bấm nút <strong>"Thử lại"</strong> bên dưới để hệ thống khởi tạo lại phiên kết nối.</li>
                <li>Hoặc tải lại trang sau ít phút nếu máy chủ đang bảo trì định kỳ.</li>
              </ul>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t app-border">
              <Link
                to={returnUrl}
                className="w-full sm:w-auto px-5 py-3 rounded-xl border app-border text-xs sm:text-sm font-semibold app-text-main hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors text-center order-3 sm:order-1"
              >
                Về hồ sơ
              </Link>
              <button
                type="button"
                className="w-full sm:w-auto min-h-11 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 px-5 py-3 font-semibold text-xs sm:text-sm transition-all cursor-pointer inline-flex items-center justify-center gap-2 border app-border app-text-main order-1 sm:order-2"
                onClick={() => { setLoading(true); setError(""); setRefresh((v) => v + 1); }}
              >
                <FiRefreshCw className="w-4 h-4" />
                <span>Thử lại</span>
              </button>
            </div>
          </div>
        )}

        {/* SUCCESS BANNER (submit succeeded) */}
        {successMessage && (
          <div role="status" className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm flex items-start gap-3 shadow-xs animate-in fade-in">
            <FiCheckCircle className="w-5 h-5 shrink-0 text-emerald-500 mt-0.5" />
            <div className="flex-1 space-y-0.5">
              <span className="font-bold">Thành công:</span>
              <p>{successMessage}</p>
            </div>
            <button
              type="button"
              aria-label="Đóng thông báo"
              onClick={() => setSuccessMessage("")}
              className="shrink-0 text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-200 transition-colors"
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
              <span className="font-bold">Lỗi xác minh:</span>
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* APPROVED STATE */}
        {status?.status === "APPROVED" && (
          <div className="app-bg-card app-border rounded-3xl border p-6 sm:p-8 space-y-6 shadow-md animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b app-border">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/25 shrink-0">
                  <FiCheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p role="status" className="text-lg sm:text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                      Đã xác thực thông tin CCCD
                    </p>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-300 dark:border-emerald-800">
                      Đã xác minh
                    </span>
                  </div>
                  <p className="text-xs app-text-muted mt-0.5">Máy chủ đã xác nhận thông tin được bóc tách từ CCCD.</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                <FiCheck className="w-4 h-4" />
                <span>Thông tin CCCD: Đã xác thực</span>
              </div>
            </div>

            {/* Digital Identity Card */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white p-6 sm:p-7 shadow-xl border border-blue-500/30">
              <div className="absolute -right-16 -top-16 w-56 h-56 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -left-16 -bottom-16 w-56 h-56 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
              <div className="flex items-center justify-between pb-4 border-b border-white/10 relative z-10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow">
                    <FaTicketAlt className="w-4 h-4 transform -rotate-12" />
                  </div>
                  <div>
                    <span className="text-xs font-extrabold tracking-wider uppercase text-blue-300 block leading-none">HaloTicket Identity</span>
                    <span className="text-[10px] text-slate-400">Thẻ định danh kỹ thuật số</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400/20 border border-amber-400/30 text-amber-300 text-[10px] font-extrabold uppercase tracking-wider">
                  <FaMicrochip className="w-3.5 h-3.5 text-amber-400" />
                  <span>CCCD</span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-5 pb-2 relative z-10">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Họ và tên chủ tài khoản</span>
                  <p className="text-lg sm:text-xl font-extrabold uppercase tracking-wide text-white">{status.legalName || "CHƯA CÓ DỮ LIỆU"}</p>
                </div>
                <div className="space-y-1 sm:text-right">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Số Căn cước công dân</span>
                  <p className="text-base sm:text-lg font-mono font-extrabold text-blue-400">{status.documentNumber || "Chưa có dữ liệu"}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/10 text-[11px] text-slate-400 relative z-10">
                <div className="flex items-center gap-1.5">
                  <FiCheckCircle className="w-4 h-4 text-emerald-400" />
                  <span>Kết quả xác minh từ máy chủ</span>
                </div>
                <div>
                  <span>Ngày xác thực: {status.verifiedAt ? new Date(status.verifiedAt).toLocaleDateString("vi-VN") : "Chưa có dữ liệu"}</span>
                </div>
              </div>
            </div>

            {/* Unlocked Privileges */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { color: "emerald", Icon: FiCheck, title: "Tạo & Quản lý Sự kiện", desc: "Đủ điều kiện tạo sự kiện và phát hành vé." },
                { color: "purple", Icon: FaTicketAlt, title: "Chuyển nhượng & Bán vé", desc: "Có quyền bán vé sự kiện và sang nhượng vé chính chủ." },
                { color: "blue", Icon: FiShield, title: "Tài khoản thụ hưởng riêng", desc: "Tài khoản thụ hưởng nhận tiền cần được xác minh riêng." },
              ].map(({ color, Icon, title, desc }) => (
                <div key={title} className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-900/60 border app-border space-y-1">
                  <div className={`w-8 h-8 rounded-xl bg-${color}-100 dark:bg-${color}-950 text-${color}-600 flex items-center justify-center font-bold mb-2`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <h5 className="text-xs font-bold app-text-main">{title}</h5>
                  <p className="text-[11px] app-text-muted">{desc}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t app-border">
              <Link to={returnUrl} className="text-xs font-semibold app-text-muted hover:app-text-main">← Quay lại hồ sơ</Link>
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                <Link
                  to={returnUrl === PATHS.CREATE_EVENT ? PATHS.CREATE_EVENT : PATHS.MY_EVENTS}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/25 transition-all cursor-pointer active:scale-98"
                >
                  <span>{returnUrl === PATHS.CREATE_EVENT ? "Tiếp tục tạo sự kiện" : "Vào trung tâm Nhà tổ chức"}</span>
                  <FiArrowRight className="w-4 h-4" />
                </Link>
              </div>
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
                <span role="status">{EKYC_STATUS_LABELS.PENDING}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold app-text-main">Hồ sơ đang được đối soát</h2>
              <p className="text-xs sm:text-sm app-text-muted leading-relaxed">
                Hồ sơ đang chờ kết quả xác minh. Bạn có thể kiểm tra lại trạng thái sau.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-900/60 border app-border max-w-md mx-auto text-xs app-text-muted space-y-1">
              <p>⏱️ Thời gian xử lý trung bình: <strong>5 - 15 phút</strong></p>
              <p>📧 Kết quả phê duyệt sẽ được thông báo trực tiếp qua Email của bạn.</p>
            </div>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                className="w-full sm:w-auto min-h-11 rounded-xl bg-blue-600 hover:bg-blue-700 px-6 py-3 font-bold text-white shadow-md shadow-blue-500/25 transition-all cursor-pointer inline-flex items-center justify-center gap-2 text-xs sm:text-sm"
                onClick={() => { setError(""); setRefresh((v) => v + 1); }}
              >
                <FiRefreshCw className="w-4 h-4" />
                <span>Kiểm tra trạng thái</span>
              </button>
              <Link
                to={returnUrl}
                className="w-full sm:w-auto px-6 py-3 rounded-xl border app-border text-xs sm:text-sm font-semibold app-text-main hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors text-center"
              >
                Về hồ sơ
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
              className="app-bg-card app-border rounded-3xl border p-6 sm:p-8 space-y-7 shadow-md"
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              {/* Stepper header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b app-border">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px] font-extrabold uppercase tracking-wide border border-blue-200 dark:border-blue-800">
                      Bước {currentStep}/3
                    </span>
                    <h3 className="text-base sm:text-lg font-bold app-text-main">
                      {currentStep === 1 && "1. Tải lên Mặt trước CCCD gắn chip"}
                      {currentStep === 2 && "2. Tải lên Mặt sau CCCD (Chip & Mã MRZ)"}
                      {currentStep === 3 && "3. Kiểm tra và gửi xác minh"}
                    </h3>
                  </div>
                  <p className="text-xs app-text-muted mt-0.5">
                    {currentStep === 1 && "Chụp rõ nét mặt trước thẻ CCCD gắn chip, đảm bảo thấy rõ ảnh và số định danh 12 số."}
                    {currentStep === 2 && "Chụp rõ mặt sau chứa chip vi mạch điện tử và 3 dòng mã ký tự quang học MRZ."}
                    {currentStep === 3 && "Xem lại hai mặt CCCD, đồng ý điều khoản và gửi VNPT bóc tách thông tin."}
                  </p>
                </div>

                {/* Mini step switcher */}
                <div className="flex items-center gap-1.5 self-start sm:self-auto bg-slate-100 dark:bg-zinc-800/80 p-1 rounded-xl border app-border">
                  {([1, 2, 3] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setCurrentStep(s)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        currentStep === s ? "bg-blue-600 text-white shadow-xs" : "app-text-muted hover:app-text-main"
                      }`}
                    >
                      {s === 1 && files[0] && <FiCheck className="w-3.5 h-3.5 stroke-[3]" />}
                      {s === 2 && files[1] && <FiCheck className="w-3.5 h-3.5 stroke-[3]" />}
                      {s === 3 && files.every(Boolean) && <FiCheck className="w-3.5 h-3.5 stroke-[3]" />}
                      <span>{s === 1 ? "1. Mặt trước" : s === 2 ? "2. Mặt sau" : "3. Xác minh"}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* TAB 1 */}
              <div className={currentStep === 1 ? "block" : "hidden"}>
                <ImageUploadStep
                  index={0}
                  label="Mặt trước CCCD gắn chip"
                  description="Giữ thẻ thẳng góc, Đủ ánh sáng, Rõ 12 số định danh"
                  accentColor="blue"
                  icon={<FiCreditCard className="w-8 h-8" />}
                  preview={previews[0]}
                  metadata={metadatas[0]}
                  rotatingIndex={rotatingIndex}
                  busy={busy}
                  currentFile={files[0]}
                  onFileChange={handleFileSelect}
                  onCropConfirm={handleCropConfirm}
                  onRotate={(i, d) => void handleRotate(i, d)}
                  nextLabel="Sang bước 2: Mặt sau giấy tờ"
                  onNext={() => setCurrentStep(2)}
                />
              </div>

              {/* TAB 2 */}
              <div className={currentStep === 2 ? "block" : "hidden"}>
                <ImageUploadStep
                  index={1}
                  label="Mặt sau CCCD (Chip & Mã MRZ)"
                  description="Rõ chip vi mạch, Rõ 3 dòng mã MRZ, Không che vân tay"
                  accentColor="purple"
                  icon={<FaMicrochip className="w-8 h-8" />}
                  preview={previews[1]}
                  metadata={metadatas[1]}
                  rotatingIndex={rotatingIndex}
                  busy={busy}
                  currentFile={files[1]}
                  onFileChange={handleFileSelect}
                  onCropConfirm={handleCropConfirm}
                  onRotate={(i, d) => void handleRotate(i, d)}
                  prevLabel="Quay lại bước 1"
                  onPrev={() => setCurrentStep(1)}
                  nextLabel="Sang bước 3: Kiểm tra thông tin"
                  onNext={() => setCurrentStep(3)}
                />
              </div>

              <div className={currentStep === 3 ? "block" : "hidden"}>
                <ReviewSubmitStep
                  previews={[previews[0], previews[1]]}
                  metadatas={[metadatas[0], metadatas[1]]}
                  files={[files[0], files[1]]}
                  rotatingIndex={rotatingIndex}
                  consent={consent}
                  busy={busy}
                  onConsentChange={setConsent}
                  onRotate={(i, d) => void handleRotate(i, d)}
                  onGoToStep={setCurrentStep}
                  onPrev={() => setCurrentStep(2)}
                  returnUrl={returnUrl}
                />
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Trust & Legal Footer */}
      <footer className="text-center pt-10 text-[11px] app-text-muted space-y-1.5 max-w-xl mx-auto">
        <div className="flex items-center justify-center gap-2 font-bold text-slate-500 dark:text-zinc-400">
          <FiShield className="w-3.5 h-3.5 text-blue-500" />
          <span>Bảo mật dữ liệu định danh người dùng HaloTicket</span>
        </div>
        <p className="text-slate-400 dark:text-zinc-500">
          Xác minh danh tính xong mới có quyền tạo sự kiện, chuyển nhượng vé, bán vé. Xác minh tài khoản thụ hưởng riêng.
        </p>
      </footer>
    </main>
  );
}
