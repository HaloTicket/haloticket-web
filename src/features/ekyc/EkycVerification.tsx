import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ekycApi } from "@/services/ekycApi";
import { PATHS } from "@/routes/paths";
import { EKYC_STATUS_LABELS, type EkycStatusResponse } from "@/types/ekyc";
import {
  FiShield,
  FiCheckCircle,
  FiAlertCircle,
  FiUploadCloud,
  FiCamera,
  FiArrowRight,
  FiRefreshCw,
  FiCheck,
  FiArrowLeft,
  FiClock,
  FiCreditCard,
  FiLock,
  FiHelpCircle,
  FiInfo,
} from "react-icons/fi";
import { FaTicketAlt, FaMicrochip } from "react-icons/fa";

export default function EkycVerification() {
  const [params] = useSearchParams();
  const returnUrl =
    params.get("returnUrl") === PATHS.CREATE_EVENT
      ? PATHS.CREATE_EVENT
      : `${PATHS.PROFILE}?tab=ekyc`;

  const [status, setStatus] = useState<EkycStatusResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState(false);
  const [files, setFiles] = useState<(File | null)[]>([null, null, null]);
  const [previews, setPreviews] = useState<(string | null)[]>([null, null, null]);
  const [refresh, setRefresh] = useState(0);
  const [uploadVersion, setUploadVersion] = useState(0);
  const inFlight = useRef(false);
  const previewUrls = useRef<(string | null)[]>([null, null, null]);

  useEffect(() => {
    let active = true;
    ekycApi
      .getStatus()
      .then((result) => {
        if (active) setStatus(result);
      })
      .catch(() => {
        if (active) {
          setError("Không thể tải trạng thái xác minh từ hệ thống đối soát.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refresh]);

  // Clean up object URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      previewUrls.current.forEach((preview) => {
        if (preview?.startsWith("blob:")) {
          URL.revokeObjectURL(preview);
        }
      });
    };
  }, []);

  const handleFileSelect = (index: number, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (
      file &&
      (!["image/jpeg", "image/png"].includes(file.type) ||
        file.size > 10 * 1024 * 1024 ||
        !file.size)
    ) {
      e.target.value = "";
      if (previewUrls.current[index]?.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrls.current[index]!);
      }
      previewUrls.current[index] = null;
      setFiles((current) => current.map((old, i) => (i === index ? null : old)));
      setPreviews((current) => current.map((old, i) => (i === index ? null : old)));
      setError("Vui lòng chọn ảnh định dạng JPEG hoặc PNG có dung lượng dưới 10 MB.");
      return;
    }
    setError("");
    if (previewUrls.current[index]?.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrls.current[index]!);
    }
    setFiles((current) => current.map((old, i) => (i === index ? file : old)));
    if (file) {
      const url = URL.createObjectURL(file);
      previewUrls.current[index] = url;
      setPreviews((current) => current.map((old, i) => (i === index ? url : old)));
    } else {
      previewUrls.current[index] = null;
      setPreviews((current) => current.map((old, i) => (i === index ? null : old)));
    }
  };

  async function submit() {
    if (inFlight.current || !consent || files.some((file) => !file)) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const session = await ekycApi.startSession(true, "2026.1");
      if (Date.parse(session.expiresAt) <= Date.now()) throw new Error("Expired session");
      const updatedStatus = await ekycApi.verify(session.sessionId, files[0]!, files[1]!, files[2]!);
      setStatus(updatedStatus);
      setFiles([null, null, null]);
      previewUrls.current.forEach(url => { if (url) URL.revokeObjectURL(url); });
      previewUrls.current = [null, null, null];
      setPreviews([null, null, null]);
      setUploadVersion((value) => value + 1);
    } catch {
      setError(
        "Không thể hoàn tất xác minh. Vui lòng kiểm tra lại kết nối và độ rõ nét của ảnh, sau đó gửi lại."
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  const UPLOAD_CARDS = [
    {
      label: "Ảnh mặt trước căn cước",
      subLabel: "Chụp rõ nét mặt trước CCCD gắn chip",
      icon: <FiCreditCard className="w-5 h-5 text-blue-500" />,
      capture: "environment",
      tip: "Hiển thị rõ ảnh chân dung và số định danh cá nhân",
    },
    {
      label: "Ảnh mặt sau căn cước",
      subLabel: "Chụp rõ mặt sau chứa chip vi mạch & dải MRZ",
      icon: <FiCreditCard className="w-5 h-5 text-purple-500" />,
      capture: "environment",
      tip: "Đảm bảo mã vạch và đặc điểm nhận dạng không bị che",
    },
    {
      label: "Ảnh chân dung",
      subLabel: "Nhìn thẳng camera, đủ sáng, không đeo kính râm / khẩu trang",
      icon: <FiCamera className="w-5 h-5 text-emerald-500" />,
      capture: "user",
      tip: "Gương mặt nằm chính giữa khung hình",
    },
  ];

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
                <p className="text-xs app-text-muted mt-0.5">
                  Xác minh danh tính trước khi tạo sự kiện
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:self-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-zinc-800/80 text-[11px] font-medium text-slate-600 dark:text-zinc-400 border app-border">
              <FiLock className="w-3.5 h-3.5 text-emerald-500" />
              <span>Ảnh được gửi để xác minh danh tính</span>
            </span>
            <Link
              to={returnUrl}
              className="text-xs font-semibold px-3.5 py-1.5 rounded-xl border app-border hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors app-text-main"
            >
              Về hồ sơ
            </Link>
          </div>
        </header>

        {/* 3-Step Flow Visual Guide */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
          <div className={`p-3 sm:p-4 rounded-2xl border transition-all ${
            status?.status === "APPROVED" || status?.status === "PENDING" || files.every((f) => !!f)
              ? "app-bg-card border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
              : "app-bg-card border-blue-500 bg-blue-50/20 dark:bg-blue-950/20 app-text-main"
          }`}>
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold mb-1.5">
              1
            </span>
            <h4 className="text-xs sm:text-sm font-bold block truncate">1. Chụp giấy tờ</h4>
            <p className="text-[10px] sm:text-[11px] app-text-muted hidden sm:block mt-0.5">Hai mặt CCCD gắn chip</p>
          </div>

          <div className={`p-3 sm:p-4 rounded-2xl border transition-all ${
            status?.status === "APPROVED" || status?.status === "PENDING"
              ? "app-bg-card border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
              : files[2]
              ? "app-bg-card border-blue-500 bg-blue-50/20 dark:bg-blue-950/20 app-text-main"
              : "app-bg-card app-border opacity-70"
          }`}>
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-bold mb-1.5">
              2
            </span>
            <h4 className="text-xs sm:text-sm font-bold block truncate">2. Ảnh chân dung</h4>
            <p className="text-[10px] sm:text-[11px] app-text-muted hidden sm:block mt-0.5">Ảnh chân dung</p>
          </div>

          <div className={`p-3 sm:p-4 rounded-2xl border transition-all ${
            status?.status === "APPROVED"
              ? "app-bg-card border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 font-bold"
              : status?.status === "PENDING"
              ? "app-bg-card border-amber-500 bg-amber-50/20 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 font-bold"
              : "app-bg-card app-border opacity-70"
          }`}>
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-bold mb-1.5">
              3
            </span>
            <h4 className="text-xs sm:text-sm font-bold block truncate">3. Kích hoạt quyền</h4>
            <p className="text-[10px] sm:text-[11px] app-text-muted hidden sm:block mt-0.5">Tạo sự kiện & Bán vé</p>
          </div>
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
              <h3 className="text-base sm:text-lg font-bold app-text-main">
                Đang kết nối cổng đối soát VNPT eKYC…
              </h3>
              <p className="text-xs sm:text-sm app-text-muted max-w-md mx-auto">
                Hệ thống đang tải thông tin định danh và trạng thái phê duyệt của tài khoản.
              </p>
            </div>
          </div>
        )}

        {/* ERROR / OFFLINE STATE (Khi không tải được trạng thái từ server) */}
        {!loading && !status && (
          <div
            role="alert"
            className="app-bg-card app-border rounded-3xl border p-6 sm:p-10 shadow-lg space-y-6 animate-in fade-in zoom-in-95"
          >
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
              <div className="w-16 h-16 rounded-2xl bg-rose-100 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 shadow-md shadow-rose-500/10">
                <FiAlertCircle className="w-8 h-8" />
              </div>
              <div className="space-y-2 flex-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-xs font-bold border border-rose-200 dark:border-rose-800">
                  <span>Mất kết nối máy chủ</span>
                </div>
                <h2 className="text-lg sm:text-xl font-extrabold app-text-main">
                  Không thể tải trạng thái xác minh. Vui lòng thử lại.
                </h2>
                <p className="text-xs sm:text-sm app-text-muted leading-relaxed">
                  {error || "Không thể tải trạng thái xác minh. Vui lòng thử lại."}
                </p>
              </div>
            </div>

            {/* Helper Tips Box */}
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

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t app-border">
              <Link
                to={returnUrl}
                className="w-full sm:w-auto px-5 py-3 rounded-xl border app-border text-xs sm:text-sm font-semibold app-text-main hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors text-center order-3 sm:order-1"
              >
                Về hồ sơ
              </Link>
              <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto order-1 sm:order-2">
                <button
                  type="button"
                  className="w-full sm:w-auto min-h-11 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 px-5 py-3 font-semibold text-xs sm:text-sm transition-all cursor-pointer inline-flex items-center justify-center gap-2 border app-border app-text-main"
                  onClick={() => {
                    setLoading(true);
                    setError("");
                    setRefresh((value) => value + 1);
                  }}
                >
                  <FiRefreshCw className="w-4 h-4" />
                  <span>Thử lại</span>
                </button>

              </div>
            </div>
          </div>
        )}

        {/* ERROR BANNER IF PRESENT (WHEN STATUS IS LOADED BUT SUBMIT FAILED) */}
        {error && status && (
          <div
            role="alert"
            className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs sm:text-sm flex items-start gap-3 shadow-xs animate-in fade-in"
          >
            <FiAlertCircle className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
            <div className="flex-1 space-y-0.5">
              <span className="font-bold">Lỗi xác minh:</span>
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* APPROVED STATE (ĐÃ DUYỆT THÀNH CÔNG) */}
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
                      {EKYC_STATUS_LABELS.APPROVED}
                    </p>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-300 dark:border-emerald-800">
                      Đã xác minh
                    </span>
                  </div>
                  <p className="text-xs app-text-muted mt-0.5">
                    Máy chủ đã xác nhận kết quả xác minh danh tính.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                <FiCheck className="w-4 h-4" />
                <span>Danh tính: Đã xác minh</span>
              </div>
            </div>

            {/* Digital Identity Card (Mô phỏng CCCD điện tử sang trọng) */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white p-6 sm:p-7 shadow-xl border border-blue-500/30">
              <div className="absolute -right-16 -top-16 w-56 h-56 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -left-16 -bottom-16 w-56 h-56 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

              {/* Card Top */}
              <div className="flex items-center justify-between pb-4 border-b border-white/10 relative z-10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow">
                    <FaTicketAlt className="w-4 h-4 transform -rotate-12" />
                  </div>
                  <div>
                    <span className="text-xs font-extrabold tracking-wider uppercase text-blue-300 block leading-none">
                      HaloTicket Identity
                    </span>
                    <span className="text-[10px] text-slate-400">Thẻ định danh kỹ thuật số</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400/20 border border-amber-400/30 text-amber-300 text-[10px] font-extrabold uppercase tracking-wider">
                  <FaMicrochip className="w-3.5 h-3.5 text-amber-400" />
                  <span>CCCD</span>
                </div>
              </div>

              {/* Card Body */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-5 pb-2 relative z-10">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                    Họ và tên chủ tài khoản
                  </span>
                  <p className="text-lg sm:text-xl font-extrabold uppercase tracking-wide text-white">
                    {status.legalName || "CHƯA CÓ DỮ LIỆU"}
                  </p>
                </div>

                <div className="space-y-1 sm:text-right">
                  <div className="flex items-center sm:justify-end gap-1.5">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                      Số Căn cước công dân
                    </span>

                  </div>
                  <p className="text-base sm:text-lg font-mono font-extrabold text-blue-400">
                    {status.documentNumber || "Chưa có dữ liệu"}
                  </p>
                </div>
              </div>

              {/* Card Footer */}
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

            {/* Quyền lợi đã mở khóa */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-900/60 border app-border space-y-1">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center font-bold mb-2">
                  <FiCheck className="w-4 h-4" />
                </div>
                <h5 className="text-xs font-bold app-text-main">Tạo & Quản lý Sự kiện</h5>
                <p className="text-[11px] app-text-muted">Tiếp tục tạo sự kiện sau khi kiểm tra quyền Nhà tổ chức.</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-900/60 border app-border space-y-1">
                <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 flex items-center justify-center font-bold mb-2">
                  <FaTicketAlt className="w-3.5 h-3.5" />
                </div>
                <h5 className="text-xs font-bold app-text-main">Chuyển nhượng & Resale</h5>
                <p className="text-[11px] app-text-muted">Xem và quản lý vé trong tài khoản.</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-900/60 border app-border space-y-1">
                <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center font-bold mb-2">
                  <FiShield className="w-4 h-4" />
                </div>
                <h5 className="text-xs font-bold app-text-main">Tài khoản thụ hưởng</h5>
                <p className="text-[11px] app-text-muted">Tài khoản thụ hưởng cần được xác minh riêng.</p>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t app-border">
              <Link
                to={PATHS.PROFILE}
                className="text-xs font-semibold app-text-muted hover:app-text-main"
              >
                ← Quay lại hồ sơ người dùng
              </Link>
              <Link
                to={returnUrl === PATHS.CREATE_EVENT ? PATHS.CREATE_EVENT : PATHS.MY_EVENTS}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/25 transition-all cursor-pointer active:scale-98"
              >
                <span>{returnUrl === PATHS.CREATE_EVENT ? "Tiếp tục tạo sự kiện" : "Vào trung tâm Nhà tổ chức"}</span>
                <FiArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        {/* PENDING STATE (ĐANG ĐỐI SOÁT) */}
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
              <h2 className="text-xl sm:text-2xl font-extrabold app-text-main">
                Hồ sơ đang được đối soát
              </h2>
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
                onClick={() => {
                  setError("");
                  setRefresh((value) => value + 1);
                }}
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

        {/* UPLOAD FORM (KHI CHƯA XÁC MINH HOẶC BỊ TỪ CHỐI) */}
        {status && status.status !== "APPROVED" && status.status !== "PENDING" && (
          <form
            key={uploadVersion}
            className="app-bg-card app-border rounded-3xl border p-6 sm:p-8 space-y-7 shadow-md"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            {/* Status Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b app-border">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-bold app-text-main">
                    Tải lên hình ảnh giấy tờ xác thực
                  </h3>
                  <p role="status" className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-[10px] font-bold border border-amber-300 dark:border-amber-800">
                    {EKYC_STATUS_LABELS[status.status]}
                  </p>
                </div>
                <p className="text-xs app-text-muted mt-0.5">
                  Cung cấp ảnh hai mặt CCCD gắn chip và ảnh chân dung rõ nét.
                </p>
              </div>

              <span className="text-xs font-semibold app-text-muted">CCCD gắn chip</span>
            </div>

            {/* 3 Upload Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {UPLOAD_CARDS.map((card, index) => {
                const isSelected = !!files[index];
                const preview = previews[index];
                return (
                  <label
                    key={card.label}
                    className={`block relative rounded-2xl border-2 transition-all p-4 cursor-pointer text-center space-y-3 group ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-xs"
                        : "border-dashed border-slate-300 dark:border-zinc-700 bg-slate-50/50 dark:bg-zinc-900/40 hover:border-blue-500 hover:bg-blue-50/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="block text-xs font-bold app-text-main text-left">
                        {card.label}
                      </span>
                      {isSelected ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1 shadow-xs">
                          <FiCheck className="w-3 h-3 stroke-[3]" />
                          <span>Đã chọn</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-rose-500">* Bắt buộc</span>
                      )}
                    </div>

                    {/* Preview / Upload Area */}
                    <div className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 flex items-center justify-center relative group-hover:border-blue-400 transition-colors">
                      {preview ? (
                        <div className="relative w-full h-full">
                          <img
                            src={preview}
                            alt={card.label}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1.5 backdrop-blur-2xs">
                            <FiUploadCloud className="w-4 h-4" />
                            <span>Đổi ảnh khác</span>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2 text-center p-3">
                          <div className="w-11 h-11 rounded-xl bg-white dark:bg-zinc-700 mx-auto flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                            {card.icon}
                          </div>
                          <p className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center justify-center gap-1">
                            <FiUploadCloud className="w-3.5 h-3.5 text-blue-500" />
                            <span>Bấm để tải ảnh</span>
                          </p>
                          <p className="text-[10px] text-slate-400 dark:text-zinc-500">
                            Hỗ trợ JPG, PNG
                          </p>
                        </div>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-tight">
                      {card.subLabel}
                    </p>

                    <input
                      className="sr-only"
                      type="file"
                      aria-label={card.label}
                      accept="image/jpeg,image/png"
                      capture={card.capture as "user" | "environment"}
                      required
                      disabled={busy}
                      onChange={(e) => handleFileSelect(index, e)}
                    />
                  </label>
                );
              })}
            </div>

            {/* Quality Standard Notice Box */}
            <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 flex items-start gap-3 text-xs">
              <FiHelpCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div className="space-y-1 text-slate-600 dark:text-zinc-300">
                <span className="font-bold text-blue-700 dark:text-blue-300">Quy chuẩn ảnh hợp lệ:</span>
                <p className="leading-relaxed">
                  Ảnh chụp phải là giấy tờ gốc, không bị cắt góc, không lóa đèn flash hoặc ngược sáng. Ảnh chân dung cần nhìn thẳng, không đeo kính đen hay phụ kiện che khuôn mặt.
                </p>
              </div>
            </div>

            {/* Legal Consent Checkbox */}
            <label className="flex min-h-11 items-start gap-3 text-xs sm:text-sm p-4 rounded-2xl bg-slate-50 dark:bg-zinc-900/60 border app-border cursor-pointer hover:bg-slate-100/60 transition-colors">
              <input
                type="checkbox"
                className="mt-0.5 size-4.5 rounded text-blue-600 focus:ring-blue-500 shrink-0 cursor-pointer"
                checked={consent}
                disabled={busy}
                onChange={(event) => setConsent(event.target.checked)}
              />
              <span className="app-text-muted leading-relaxed">
                Tôi đồng ý gửi ảnh giấy tờ và khuôn mặt để HaloTicket xử lý xác minh danh tính qua VNPT eKYC (phiên bản đồng ý 2026.1).
              </span>
            </label>

            {/* Submit Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <Link
                to={returnUrl}
                className="text-xs font-semibold app-text-muted hover:app-text-main order-2 sm:order-1"
              >
                ← Quay lại hồ sơ
              </Link>

              <button
                type="submit"
                className="w-full sm:w-auto min-h-12 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-8 py-3.5 font-bold text-white text-xs sm:text-sm shadow-lg shadow-blue-500/25 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-98 order-1 sm:order-2"
                disabled={!consent || files.some((file) => !file) || busy}
              >
                {busy ? (
                  <>
                    <FiRefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang gửi xác minh…</span>
                  </>
                ) : (
                  <>
                    <span>Gửi xác minh</span>
                    <FiArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Trust & Legal Footer */}
      <footer className="text-center pt-10 text-[11px] app-text-muted space-y-1.5 max-w-xl mx-auto">
        <div className="flex items-center justify-center gap-2 font-bold text-slate-500 dark:text-zinc-400">
          <FiShield className="w-3.5 h-3.5 text-blue-500" />
          <span>Bảo mật dữ liệu định danh người dùng HaloTicket</span>
        </div>
        <p className="text-slate-400 dark:text-zinc-500">
          Xác minh danh tính và xác minh tài khoản thụ hưởng là hai bước riêng.
        </p>
      </footer>
    </main>
  );
}
