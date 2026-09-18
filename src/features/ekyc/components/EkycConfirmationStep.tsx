import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FiChevronDown,
  FiChevronUp,
  FiChevronLeft,
  FiCheck,
  FiAlertCircle,
  FiShield,
  FiLock,
  FiInfo,
  FiArrowRight,
} from "react-icons/fi";
import { Link, useNavigate } from "react-router-dom";
import type { EkycStatusResponse } from "@/types/ekyc";
import { userApi, type UserProfile } from "@/services/userApi";
import { PATHS } from "@/routes/paths";

interface EkycConfirmationStepProps {
  status: EkycStatusResponse;
  userProfile: UserProfile | null;
  returnUrl?: string;
  onBackToVerification?: () => void;
}

const POPULAR_BANKS = [
  { code: "VCB", name: "Vietcombank (VCB) - TMCP Ngoại thương VN" },
  { code: "TCB", name: "Techcombank (TCB) - TMCP Kỹ Thương VN" },
  { code: "MB", name: "MBBank (MB) - TMCP Quân Đội" },
  { code: "ACB", name: "ACB - TMCP Á Châu" },
  { code: "BIDV", name: "BIDV - TMCP Đầu tư và Phát triển VN" },
  { code: "CTG", name: "VietinBank (CTG) - TMCP Công Thương VN" },
  { code: "VPB", name: "VPBank (VPB) - TMCP Việt Nam Thịnh Vượng" },
  { code: "TPB", name: "TPBank (TPB) - TMCP Tiên Phong" },
  { code: "STB", name: "Sacombank (STB) - TMCP Sài Gòn Thương Tín" },
  { code: "VBA", name: "Agribank (VBA) - Nông nghiệp & PTNT VN" },
  { code: "HDB", name: "HDBank - TMCP Phát triển TP.HCM" },
  { code: "VIB", name: "VIB - TMCP Quốc Tế Việt Nam" },
  { code: "OCB", name: "OCB - TMCP Phương Đông" },
  { code: "MSB", name: "MSB - TMCP Hàng Hải VN" },
  { code: "SHB", name: "SHB - TMCP Sài Gòn - Hà Nội" },
  { code: "SEAB", name: "SeABank - TMCP Đông Nam Á" },
];

const PAYOUT_STORAGE_KEY = "haloticket_payout_bank";

function maskDocumentNumber(num: string) {
  if (!num) return "—";
  const cleaned = num.trim();
  if (cleaned.length < 8) return cleaned;
  return cleaned.slice(0, 6) + "****" + cleaned.slice(-2);
}

function getVerifiedBirthDate(status: EkycStatusResponse): string {
  if (status.status === "APPROVED" && status.birthDate?.trim()) {
    return status.birthDate.trim();
  }
  const saved = typeof window !== "undefined" ? localStorage.getItem("ekyc_saved_dob") : null;
  return saved || "";
}

function getVerifiedAddress(status: EkycStatusResponse): string {
  if (status.status === "APPROVED" && status.address?.trim()) {
    return status.address.trim();
  }
  const saved = typeof window !== "undefined" ? localStorage.getItem("ekyc_saved_address") : null;
  return saved || "";
}

export function EkycConfirmationStep({
  status,
  userProfile,
  returnUrl = "/profile",
  onBackToVerification,
}: EkycConfirmationStepProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Purge legacy mock data if lingering in localStorage
  if (typeof window !== "undefined") {
    const savedDob = localStorage.getItem("ekyc_saved_dob");
    if (savedDob === "01/09/2000") {
      localStorage.removeItem("ekyc_saved_dob");
    }
    const savedAddr = localStorage.getItem("ekyc_saved_address");
    if (savedAddr && savedAddr.includes("Bà Huyện Thanh Quan")) {
      localStorage.removeItem("ekyc_saved_address");
    }
  }

  // Accordion state
  const [personalInfoOpen, setPersonalInfoOpen] = useState(true);
  const [paymentInfoOpen, setPaymentInfoOpen] = useState(true);

  // Form state from verified CCCD
  const isApproved = status.status === "APPROVED";
  const legalName = isApproved && status.legalName ? status.legalName.toUpperCase() : (userProfile?.fullName || "").toUpperCase();
  const documentNumber = isApproved && status.documentNumber ? status.documentNumber : "";
  const email = userProfile?.email || "";

  // Pre-fill info ONLY when CCCD has been verified and returned by backend
  const defaultDob = getVerifiedBirthDate(status);
  const defaultAddress = getVerifiedAddress(status);
  const hasExtractedDob = isApproved && Boolean(status.birthDate?.trim());
  const hasExtractedAddress = isApproved && Boolean(status.address?.trim());

  const [userEditedDob, setUserEditedDob] = useState<string | null>(null);
  const [userEditedAddress, setUserEditedAddress] = useState<string | null>(null);
  const dob = userEditedDob !== null ? userEditedDob : defaultDob;
  const address = userEditedAddress !== null ? userEditedAddress : defaultAddress;

  const [phoneCountry, setPhoneCountry] = useState("+84");
  const [userEditedPhone, setUserEditedPhone] = useState<string | null>(null);

  // Derive initial phone number from userProfile without triggering cascading renders in useEffect
  const profilePhoneClean = (() => {
    const raw = userProfile?.phoneNumber || "";
    return raw.startsWith("+84") ? raw.slice(3) : raw.startsWith("0") ? raw.slice(1) : raw;
  })();
  const phoneNumber = userEditedPhone !== null ? userEditedPhone : profilePhoneClean;

  // Payment state
  const [bankName, setBankName] = useState(() => {
    try {
      const saved = localStorage.getItem(PAYOUT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.bankName || "";
      }
    } catch {
      // ignore
    }
    return "";
  });
  const [accountNumber, setAccountNumber] = useState(() => {
    try {
      const saved = localStorage.getItem(PAYOUT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.accountNumber || "";
      }
    } catch {
      // ignore
    }
    return "";
  });
  const [accountHolder, setAccountHolder] = useState(() => {
    try {
      const saved = localStorage.getItem(PAYOUT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.accountHolder || "";
      }
    } catch {
      // ignore
    }
    return "";
  });

  // Commitment checkbox
  const [agreed, setAgreed] = useState(true);

  // Status & error state
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [confirmedSuccess, setConfirmedSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!agreed) {
      setErrorMsg(t("Vui lòng xác nhận cam kết thông tin cung cấp là đúng sự thật."));
      return;
    }

    if (!bankName) {
      setErrorMsg(t("Vui lòng chọn ngân hàng thụ hưởng nhận tiền."));
      setPaymentInfoOpen(true);
      return;
    }

    if (!accountNumber.trim()) {
      setErrorMsg(t("Vui lòng nhập số tài khoản ngân hàng."));
      setPaymentInfoOpen(true);
      return;
    }

    if (!accountHolder.trim()) {
      setErrorMsg(t("Vui lòng nhập tên chủ tài khoản ngân hàng."));
      setPaymentInfoOpen(true);
      return;
    }

    if (!phoneNumber.trim()) {
      setErrorMsg(t("Vui lòng nhập số điện thoại liên hệ."));
      setPersonalInfoOpen(true);
      return;
    }

    setSubmitting(true);
    try {
      const fullPhone = phoneNumber.startsWith("0") ? phoneNumber : `0${phoneNumber}`;

      // Update user profile phone number
      try {
        await userApi.updateProfile({
          fullName: legalName || userProfile?.fullName || '',
          phoneNumber: fullPhone,
        });
      } catch (err) {
        console.warn("Could not sync phone to user profile:", err);
      }

      // Save payout bank info to local storage for event payouts
      const payoutData = {
        bankName,
        accountHolder: accountHolder.trim().toUpperCase(),
        accountNumber: accountNumber.trim(),
        address: address.trim(),
        dob: dob.trim(),
        phone: fullPhone,
        confirmedAt: new Date().toISOString(),
      };
      localStorage.setItem(PAYOUT_STORAGE_KEY, JSON.stringify(payoutData));
      localStorage.setItem("ekyc_saved_dob", dob.trim());
      localStorage.setItem("ekyc_saved_address", address.trim());

      setConfirmedSuccess(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("Không thể lưu thông tin. Vui lòng thử lại.");
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmedSuccess) {
    return (
      <div className="max-w-xl mx-auto w-full app-bg-card rounded-3xl border app-border p-6 sm:p-8 space-y-6 shadow-xl text-center animate-in zoom-in-95 duration-300">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
          <FiCheck className="w-8 h-8 stroke-[3]" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl sm:text-2xl font-black app-text-main">
            {t("Đã xác nhận thông tin thành công!")}
          </h3>
          <p className="text-xs sm:text-sm app-text-muted leading-relaxed max-w-md mx-auto">
            {t("Hồ sơ cá nhân và tài khoản nhận tiền bán vé của bạn đã được đối soát đồng bộ với CCCD thành công.")}
          </p>
        </div>

        <div className="p-5 rounded-2xl app-bg-page border app-border text-left text-xs space-y-3">
          <div className="flex justify-between items-center pb-2 border-b app-border">
            <span className="app-text-muted">{t("Chủ tài khoản:")}</span>
            <span className="font-bold app-text-main uppercase">{accountHolder || legalName}</span>
          </div>
          <div className="flex justify-between items-center pb-2 border-b app-border">
            <span className="app-text-muted">{t("Ngân hàng thụ hưởng:")}</span>
            <span className="font-bold app-text-main">{bankName}</span>
          </div>
          <div className="flex justify-between items-center pb-2 border-b app-border">
            <span className="app-text-muted">{t("Số tài khoản:")}</span>
            <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">
              {accountNumber}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="app-text-muted">{t("Số CCCD đối soát:")}</span>
            <span className="font-mono font-bold app-text-main">
              {maskDocumentNumber(documentNumber)}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(returnUrl || PATHS.PROFILE)}
            className="w-full py-3 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98"
          >
            <span>{t("Hoàn tất và quay lại")}</span>
            <FiArrowRight className="w-4 h-4" />
          </button>
          <Link
            to={returnUrl}
            className="w-full py-2.5 rounded-lg border app-border text-xs font-semibold app-text-muted hover:app-text-main hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            {t("Về trang cá nhân")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-3xl app-bg-card border app-border shadow-xs">
      {/* Step 4 Header - Unified with Steps 1-3 */}
      <div className="p-6 sm:p-7 pb-4 sm:pb-5 border-b app-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base sm:text-lg font-bold app-text-main">
            {t("4. Xác nhận thông tin cá nhân & Tài khoản thanh toán")}
          </h3>
          <p className="text-xs app-text-muted mt-0.5">
            {t("Đối soát danh tính & Thiết lập tài khoản nhận tiền bán vé")}
          </p>
        </div>
        {onBackToVerification && (
          <button
            type="button"
            onClick={onBackToVerification}
            className="px-4 py-2 rounded-xl border app-border text-xs font-semibold app-text-main hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors inline-flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <FiChevronLeft className="w-4 h-4" />
            <span>{t("Chụp lại CCCD")}</span>
          </button>
        )}
      </div>

      {/* Notice Banner */}
      <div className="p-4 sm:p-5 bg-blue-50/60 dark:bg-blue-950/30 border-b app-border text-xs leading-relaxed flex items-start gap-3">
        <FiInfo className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <p className="app-text-muted text-[11px] sm:text-xs leading-relaxed">
          {t("Vui lòng kiểm tra đảm bảo các thông tin chính xác. HaloTicket sẽ chuyển tiền bán vé đến tài khoản của bạn sau khi sự kiện kết thúc thành công trong vòng 7 - 10 ngày làm việc.")}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-5 sm:p-7 space-y-6">
        {/* SECTION 1: THÔNG TIN CÁ NHÂN */}
        <div className="rounded-2xl app-bg-page border app-border overflow-hidden shadow-xs">
          <button
            type="button"
            onClick={() => setPersonalInfoOpen((prev) => !prev)}
            className="w-full px-5 py-4 flex items-center justify-between text-left font-extrabold text-xs sm:text-sm app-text-main hover:bg-slate-100 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 dark:bg-blue-400" />
              <span>{t("Thông tin cá nhân")}</span>
              <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                {t("Đối soát từ CCCD")}
              </span>
            </span>
            {personalInfoOpen ? (
              <FiChevronUp className="w-5 h-5 app-text-muted" />
            ) : (
              <FiChevronDown className="w-5 h-5 app-text-muted" />
            )}
          </button>

          {personalInfoOpen && (
            <div className="px-5 pb-6 pt-2 space-y-4 border-t app-border text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Họ và Tên */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold app-text-main flex items-center gap-1">
                      <span>{t("Họ và Tên")}</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1">
                      <FiLock className="w-3 h-3" />
                      <span>{t("Khóa theo CCCD")}</span>
                    </span>
                  </div>
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={legalName}
                    className="w-full rounded-xl app-bg-subnav border app-border px-3.5 py-2.5 text-xs sm:text-sm font-bold app-text-main uppercase cursor-not-allowed select-none tracking-wide"
                  />
                </div>

                {/* Số CCCD */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold app-text-main flex items-center gap-1">
                      <span>{t("Số CCCD")}</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1">
                      <FiLock className="w-3 h-3" />
                      <span>{t("Đã đối soát")}</span>
                    </span>
                  </div>
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={maskDocumentNumber(documentNumber)}
                    className="w-full rounded-xl app-bg-subnav border app-border px-3.5 py-2.5 text-xs sm:text-sm font-mono font-bold app-text-muted cursor-not-allowed select-none"
                  />
                </div>

                {/* Ngày sinh */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold app-text-main flex items-center gap-1">
                      <span>{t("Ngày sinh")}</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    {hasExtractedDob && (
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1">
                        <FiShield className="w-3 h-3" />
                        <span>{t("Trích xuất từ CCCD")}</span>
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={dob}
                    onChange={(e) => setUserEditedDob(e.target.value)}
                    placeholder="DD/MM/YYYY"
                    className="w-full rounded-xl app-bg-card border app-border px-3.5 py-2.5 text-xs sm:text-sm font-semibold app-text-main focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                  />
                </div>

                {/* Số điện thoại */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold app-text-main flex items-center gap-1">
                    <span>{t("Số điện thoại")}</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={phoneCountry}
                      onChange={(e) => setPhoneCountry(e.target.value)}
                      className="w-20 rounded-xl app-bg-subnav border app-border px-2.5 py-2.5 text-xs font-bold app-text-main focus:border-blue-500 focus:outline-none cursor-pointer"
                    >
                      <option value="+84">+84</option>
                      <option value="+1">+1</option>
                      <option value="+82">+82</option>
                      <option value="+81">+81</option>
                    </select>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setUserEditedPhone(e.target.value.replace(/[^0-9]/g, ""))}
                      placeholder={t("Nhập số điện thoại liên hệ")}
                      className="flex-1 rounded-xl app-bg-card border app-border px-3.5 py-2.5 text-xs sm:text-sm font-semibold app-text-main focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Địa chỉ Email */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold app-text-main flex items-center gap-1">
                    <span>{t("Địa chỉ Email")}</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    readOnly
                    disabled
                    value={email}
                    className="w-full rounded-xl app-bg-subnav border app-border px-3.5 py-2.5 text-xs sm:text-sm font-medium app-text-muted cursor-not-allowed select-none"
                  />
                </div>

                {/* Địa chỉ thường trú */}
                <div className="space-y-1.5 sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold app-text-main flex items-center gap-1">
                      <span>{t("Địa chỉ thường trú")}</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    {hasExtractedAddress && (
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1">
                        <FiShield className="w-3 h-3" />
                        <span>{t("Trích xuất từ CCCD")}</span>
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setUserEditedAddress(e.target.value)}
                    placeholder={t("Nhập địa chỉ thường trú theo CCCD")}
                    className="w-full rounded-xl app-bg-card border app-border px-3.5 py-2.5 text-xs sm:text-sm app-text-main focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 2: THÔNG TIN THANH TOÁN */}
        <div className="rounded-2xl app-bg-page border app-border overflow-hidden shadow-xs">
          <button
            type="button"
            onClick={() => setPaymentInfoOpen((prev) => !prev)}
            className="w-full px-5 py-4 flex items-center justify-between text-left font-extrabold text-xs sm:text-sm app-text-main hover:bg-slate-100 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
              <span>{t("Thông tin thanh toán")}</span>
              <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                {t("Quyết toán doanh thu")}
              </span>
            </span>
            {paymentInfoOpen ? (
              <FiChevronUp className="w-5 h-5 app-text-muted" />
            ) : (
              <FiChevronDown className="w-5 h-5 app-text-muted" />
            )}
          </button>

          {paymentInfoOpen && (
            <div className="px-5 pb-6 pt-2 space-y-4 border-t app-border text-xs">
              {/* Tên Ngân Hàng */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold app-text-main flex items-center gap-1">
                  <span>{t("Tên Ngân hàng thụ hưởng")}</span>
                  <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full rounded-xl app-bg-card border app-border px-3.5 py-2.5 text-xs sm:text-sm font-semibold app-text-main focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none cursor-pointer appearance-none transition-all"
                  >
                    <option value="">{t("-- Chọn ngân hàng nhận tiền quyết toán --")}</option>
                    {POPULAR_BANKS.map((b) => (
                      <option key={b.code} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                  <FiChevronDown className="w-4 h-4 app-text-muted absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Số Tài Khoản */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold app-text-main flex items-center gap-1">
                    <span>{t("Số Tài khoản")}</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value.replace(/[^0-9A-Za-z]/g, ""))}
                    placeholder={t("Nhập số tài khoản ngân hàng")}
                    className="w-full rounded-xl app-bg-card border app-border px-3.5 py-2.5 text-xs sm:text-sm font-mono font-bold app-text-main focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all tracking-wider"
                  />
                </div>

                {/* Tên Chủ Tài Khoản */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold app-text-main flex items-center gap-1">
                      <span>{t("Tên Chủ tài khoản")}</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    {legalName && !accountHolder && (
                      <button
                        type="button"
                        onClick={() => setAccountHolder(legalName)}
                        className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-medium"
                      >
                        {t("Điền theo tên CCCD")}
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={accountHolder}
                    onChange={(e) => setAccountHolder(e.target.value.toUpperCase())}
                    placeholder={t("Nhập tên chủ tài khoản (vd: NGUYEN VAN A hoặc CTY TNHH ABC)")}
                    className="w-full rounded-xl app-bg-card border app-border px-3.5 py-2.5 text-xs sm:text-sm font-bold app-text-main uppercase focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all tracking-wide"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 text-[11px] text-blue-800 dark:text-blue-300 leading-relaxed flex items-start gap-2">
                <FiInfo className="w-4 h-4 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
                <span>
                  {t("Doanh thu bán vé sẽ được đối soát và chuyển về tài khoản này. Bạn có thể sử dụng tài khoản ngân hàng cá nhân hoặc tài khoản đại diện / công ty.")}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Checkbox cam kết */}
        <label className="flex items-start gap-3 p-3.5 sm:p-4 rounded-2xl app-bg-page border app-border cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-zinc-800/40 transition-colors">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border app-border text-blue-600 focus:ring-0 cursor-pointer accent-blue-600"
          />
          <span className="text-xs app-text-muted leading-relaxed">
            {t("Tôi xác nhận các thông tin cung cấp là chính xác và đồng ý với Điều khoản của HaloTicket.")}
          </span>
        </label>

        {/* Error message */}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <FiAlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Submit Button - Solid Blue */}
        <button
          type="submit"
          disabled={submitting || !agreed}
          className="w-full py-3.5 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white font-bold text-sm shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98"
        >
          {submitting ? (
            <>
              <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              <span>{t("Đang lưu thông tin...")}</span>
            </>
          ) : (
            <span>{t("Tiếp tục")}</span>
          )}
        </button>

        {/* Secondary options */}
        <div className="pt-1 text-center">
          {onBackToVerification && (
            <button
              type="button"
              onClick={onBackToVerification}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline transition-colors cursor-pointer"
            >
              {t("Chụp lại CCCD hoặc tải ảnh mới")}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
