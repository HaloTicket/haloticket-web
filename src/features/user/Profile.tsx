import { useTranslation } from "react-i18next";
import { t as translate } from "@/i18n";
import { useState, useEffect, useRef, type ChangeEvent, type FormEvent } from "react";
import { validateProfileForm, hasProfileErrors, type ProfileFieldErrors } from "@/validation";
import { mediaApi } from "@/services/mediaApi";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { PATHS } from "@/routes/paths";
import { userApi, type UserProfile, type UserProfileUpdateRequest } from "@/services/userApi";
import { ekycApi } from "@/services/ekycApi";
import { EKYC_STATUS_LABELS, type EkycStatusResponse } from "@/types/ekyc";
import { getKeycloakSession } from "@/services/keycloakSession";
import MyTickets from "@/features/tickets/MyTickets";
import {
  FiUser,
  FiMail,
  FiPhone,
  FiShield,
  FiSave,
  FiLock,
  FiCheckCircle,
  FiAlertCircle,
  FiArrowLeft,
  FiArrowRight,
  FiLogOut,
  FiCamera,
  FiCopy,
  FiCheck,
} from "react-icons/fi";
import { FaTicketAlt, FaGem } from "react-icons/fa";

function createProfileDraft(profile: UserProfile): UserProfileUpdateRequest {
  return {
    fullName: profile.fullName || "",
    phoneNumber: profile.phoneNumber || "",
    gender: profile.gender || "OTHER",
    avatarUrl: profile.avatarUrl || "",
  };
}

export default function Profile() {
  useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "info";

  const [activeTab, setActiveTab] = useState<"info" | "security" | "membership" | "ekyc" | "tickets">(
    initialTab === "tickets"
      ? "tickets"
      : initialTab === "ekyc"
      ? "ekyc"
      : initialTab === "membership"
      ? "membership"
      : initialTab === "security"
      ? "security"
      : "info"
  );

  const [ekycStatus, setEkycStatus] = useState<EkycStatusResponse | null>(null);
  const [ekycError, setEkycError] = useState("");

  useEffect(() => {
    let active = true;
    ekycApi.getStatus().then((result) => {
      if (active) setEkycStatus(result);
    }).catch(() => {
      if (active) setEkycError(translate("Không thể tải trạng thái xác minh. Mở trang xác minh để thử lại."));
    });
    return () => {
      active = false;
    };
  }, []);

  const [profile, setProfile] = useState<UserProfile>({
    email: "",
    fullName: "",
    phoneNumber: "",
    gender: "OTHER",
    status: "ACTIVE",
  });

  const [formData, setFormData] = useState<UserProfileUpdateRequest>({
    fullName: "",
    phoneNumber: "",
    gender: "OTHER",
    avatarUrl: "",
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<ProfileFieldErrors>({});
  const avatarInput = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [failedAvatar, setFailedAvatar] = useState<string>();

  const handleAvatarUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setErrorMessage(translate("Vui lòng chọn ảnh JPG, PNG hoặc WebP tối đa 5 MB."));
      return;
    }
    setIsUploadingAvatar(true);
    setErrorMessage("");
    setSaveSuccess(false);
    try {
      const result = await mediaApi.uploadImage(file, "avatars");
      if (!result?.imageUrl) throw new Error(translate("Không thể tải ảnh lên. Vui lòng thử lại."));
      setFormData((previous) => ({ ...previous, avatarUrl: result.imageUrl }));
      setFailedAvatar(undefined);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : translate("Không thể tải ảnh lên. Vui lòng thử lại."));
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  // copy member ID state
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!getKeycloakSession().isAuthenticated()) {
      navigate(PATHS.LOGIN, { replace: true });
      return;
    }

    let isMounted = true;
    async function loadData() {
      setIsLoading(true);
      try {
        const data = await userApi.getProfile();
        if (isMounted && data) {
          setProfile(data);
          setFormData(createProfileDraft(data));
        }
      } catch (err) {
        console.error("Error loading profile:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [navigate]);

  const handleTabChange = (tab: "info" | "security" | "membership" | "ekyc" | "tickets") => {
    setActiveTab(tab);
    setSearchParams(tab === "info" ? {} : { tab });
    setSaveSuccess(false);
    setErrorMessage("");
    setPasswordSuccess(false);
    setPasswordError("");
  };

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();

    // validate fields
    const errors = validateProfileForm(formData);
    setFieldErrors(errors);
    if (hasProfileErrors(errors)) return;

    setIsSaving(true);
    setErrorMessage("");
    setSaveSuccess(false);
    setFieldErrors({});

    try {
      const updated = await userApi.updateProfile(formData);
      const savedProfile = { ...profile, ...updated };
      setProfile(savedProfile);
      setFormData(createProfileDraft(savedProfile));
      setFailedAvatar(undefined);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : translate("Không thể cập nhật thông tin. Vui lòng thử lại.");
      setErrorMessage(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess(false);

    if (!passwordData.currentPassword) {
      setPasswordError(translate("Vui lòng nhập mật khẩu hiện tại."));
      return;
    }
    if (passwordData.newPassword.length < 8) {
      setPasswordError(translate("Mật khẩu mới phải có ít nhất 8 ký tự."));
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError(translate("Mật khẩu xác nhận không khớp."));
      return;
    }

    setPasswordSaving(true);
    try {
      // mock API delay for security verification
      await new Promise((resolve) => setTimeout(resolve, 800));
      setPasswordSuccess(true);
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setTimeout(() => setPasswordSuccess(false), 5000);
    } catch {
      setPasswordError(translate("Đổi mật khẩu không thành công. Vui lòng thử lại."));
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleCopyMemberId = () => {
    const memberId = profile.id || "HT-883921-VIP";
    navigator.clipboard.writeText(memberId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogout = async () => {
    await getKeycloakSession().logout();
    window.dispatchEvent(new Event("auth-changed"));
    navigate(PATHS.HOME, { replace: true });
  };

  const isDirty =
    formData.fullName !== (profile.fullName || "") ||
    formData.phoneNumber !== (profile.phoneNumber || "") ||
    formData.gender !== (profile.gender || "OTHER") ||
    formData.avatarUrl !== (profile.avatarUrl || "");

  const handleCancelChanges = () => {
    setFormData(createProfileDraft(profile));
    setFailedAvatar(undefined);
    setErrorMessage("");
    setSaveSuccess(false);
  };

  const userInitial = (profile.fullName?.[0] || profile.email?.[0] || "M").toUpperCase();

  if (isLoading) {
    return (
      <div className="min-h-[60vh] max-w-[1120px] mx-auto px-4 py-10 sm:px-6" aria-label={translate("Đang tải thông tin hồ sơ...")}>
        <div className="h-7 w-56 rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse" />
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="h-64 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse lg:col-span-4" />
          <div className="h-[520px] rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse lg:col-span-8" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-[1120px] mx-auto px-4 py-8 sm:px-6 lg:py-10">
      <div className="mb-7">
        <div className="mb-3 flex items-center gap-2 text-sm app-text-muted">
          <Link to={PATHS.HOME} className="hover:text-blue-600 transition-colors flex items-center gap-1.5">
            <FiArrowLeft className="w-4 h-4" />
            <span>{translate("Trang chủ")}</span>
          </Link>
          <span>/</span>
          <span className="font-semibold app-text-main">{translate("Tài khoản")}</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight app-text-main sm:text-3xl">
          {translate("Tài khoản của tôi")}
        </h1>
        <p className="mt-1.5 max-w-xl text-sm app-text-muted">
          {translate("Quản lý hồ sơ, bảo mật và quyền lợi thành viên HaloTicket của bạn.")}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-4 space-y-5">
          <section className="rounded-2xl app-bg-card border app-border p-6 shadow-sm" aria-labelledby="saved-profile-heading">
            <p className="mb-5 text-xs font-bold uppercase tracking-[0.14em] app-text-muted">
              {translate("Hồ sơ đã lưu")}
            </p>
            <div className="flex items-center gap-4 lg:flex-col lg:text-center">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border-4 border-white bg-blue-600 text-2xl font-bold text-white shadow-sm dark:border-slate-800 flex items-center justify-center">
                  {profile.avatarUrl && failedAvatar !== profile.avatarUrl ? (
                    <img
                      src={profile.avatarUrl}
                      alt={profile.fullName || translate("Ảnh đại diện")}
                      className="h-full w-full object-cover"
                      onError={() => setFailedAvatar(profile.avatarUrl)}
                    />
                  ) : (
                    <span>{userInitial}</span>
                  )}
              </div>
              <div className="min-w-0">
                <h2 id="saved-profile-heading" className="truncate text-lg font-bold app-text-main">
                  {profile.fullName || translate("Khách hàng HaloTicket")}
                </h2>
                <p className="mt-1 flex items-center gap-1.5 truncate text-sm app-text-muted lg:justify-center">
                  <FiMail className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                  <span className="truncate">{profile.email || "email@haloticket.vn"}</span>
                </p>
                <span className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {translate("Tài khoản đang hoạt động")}
                </span>
              </div>
            </div>
          </section>

          <nav className="flex gap-2 overflow-x-auto rounded-2xl app-bg-card border app-border p-2 shadow-sm lg:flex-col" aria-label={translate("Điều hướng tài khoản")}>
            <button
              type="button"
              onClick={() => handleTabChange("info")}
              className={`shrink-0 flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-semibold transition-colors cursor-pointer lg:w-full ${
                activeTab === "info"
                  ? "bg-blue-600 text-white"
                  : "app-text-main hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <FiUser className={`w-4 h-4 ${activeTab === "info" ? "text-white" : "text-blue-500"}`} />
              <span>{translate("Thông tin cá nhân")}</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange("security")}
              className={`shrink-0 flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-semibold transition-colors cursor-pointer lg:w-full ${
                activeTab === "security"
                  ? "bg-blue-600 text-white"
                  : "app-text-main hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <FiShield className={`w-4 h-4 ${activeTab === "security" ? "text-white" : "text-emerald-500"}`} />
              <span>{translate("Bảo mật & Mật khẩu")}</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange("membership")}
              className={`shrink-0 flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-semibold transition-colors cursor-pointer lg:w-full ${
                activeTab === "membership"
                  ? "bg-blue-600 text-white"
                  : "app-text-main hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <FaGem className={`w-4 h-4 ${activeTab === "membership" ? "text-white" : "text-amber-500"}`} />
              <span>{translate("Thẻ thành viên VIP")}</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange("ekyc")}
              className={`shrink-0 flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all cursor-pointer whitespace-nowrap flex-nowrap lg:w-full ${
                activeTab === "ekyc"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "app-text-main hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <div className="flex items-center gap-2.5 shrink-0">
                <FiShield className={`w-4 h-4 shrink-0 ${activeTab === "ekyc" ? "text-white" : "text-blue-500"}`} />
                <span className="whitespace-nowrap">{translate("Xác minh danh tính (eKYC)")}</span>
              </div>
              {ekycStatus?.status === "APPROVED" ? (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                    activeTab === "ekyc"
                      ? "bg-emerald-400/30 text-white border border-white/20"
                      : "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800"
                  }`}
                >
                  {translate("Đã duyệt")}
                </span>
              ) : (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                    activeTab === "ekyc"
                      ? "bg-white/20 text-white border border-white/20"
                      : "bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800"
                  }`}
                >
                  {translate("Chưa duyệt")}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleTabChange("tickets")}
              className={`shrink-0 flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-semibold transition-colors cursor-pointer lg:w-full ${
                activeTab === "tickets"
                  ? "bg-blue-600 text-white"
                  : "app-text-main hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <FaTicketAlt className={`w-4 h-4 ${activeTab === "tickets" ? "text-white" : "text-purple-500"}`} />
              <span>{translate("Vé của tôi")}</span>
            </button>

            <div className="hidden lg:block my-1 border-t app-border" />

            <button
              type="button"
              onClick={handleLogout}
              className="shrink-0 flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer lg:w-full"
            >
              <FiLogOut className="w-4 h-4 text-rose-500" />
              <span>{translate("Đăng xuất")}</span>
            </button>
          </nav>
        </div>

        {/* Right Side: Tab Contents */}
        <div className="lg:col-span-8">
          {/* TAB 1: THÔNG TIN CÁ NHÂN */}
          {activeTab === "info" && (
            <div className="rounded-2xl app-bg-card border app-border p-5 shadow-sm sm:p-7">
              <div className="mb-6 border-b app-border pb-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-xl font-bold app-text-main">{translate("Thông tin cá nhân")}</h3>
                  {isDirty && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" role="status">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                      {translate("Có thay đổi chưa lưu")}
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-sm app-text-muted">
                  {translate("Cung cấp thông tin chính xác sẽ hỗ trợ bạn trong quá trình mua vé, hoặc khi cần xác thực vé")}
                </p>
              </div>

              {saveSuccess && (
                <div className="mb-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm flex items-center gap-2.5 animate-in fade-in duration-300">
                  <FiCheckCircle className="w-5 h-5 shrink-0 text-emerald-500" />
                  <span>{translate("Cập nhật thông tin cá nhân thành công!")}</span>
                </div>
              )}

              {errorMessage && (
                <div className="mb-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs sm:text-sm flex items-center gap-2.5 animate-in fade-in duration-300">
                  <FiAlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="space-y-6">
                {/* Avatar — căn giữa, camera button overlay */}
                <div className="flex flex-col items-center gap-3 pb-2">
                  <div className="relative">
                    {/* Avatar circle */}
                    <div className="h-24 w-24 overflow-hidden rounded-full border-4 border-white dark:border-slate-700 bg-blue-600 text-3xl font-bold text-white flex items-center justify-center shadow-md">
                      {formData.avatarUrl && failedAvatar !== formData.avatarUrl ? (
                        <img
                          src={formData.avatarUrl}
                          alt={translate("Ảnh đại diện mới")}
                          className="h-full w-full object-cover"
                          onError={() => setFailedAvatar(formData.avatarUrl)}
                        />
                      ) : (
                        <span>{userInitial}</span>
                      )}
                    </div>

                    {/* Camera button overlay */}
                    <input
                      ref={avatarInput}
                      id="profile-avatar"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      aria-label={translate("Chọn ảnh đại diện")}
                      disabled={isUploadingAvatar || isSaving}
                      onChange={handleAvatarUpload}
                    />
                    <button
                      type="button"
                      disabled={isUploadingAvatar || isSaving}
                      onClick={() => avatarInput.current?.click()}
                      className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-md ring-2 ring-white dark:ring-slate-800 transition-colors disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                      title={translate("Thay đổi ảnh đại diện")}
                    >
                      {isUploadingAvatar ? (
                        <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      ) : (
                        <FiCamera className="h-3.5 w-3.5" />
                      )}
                    </button>

                    {/* Badge ảnh mới chưa lưu */}
                    {formData.avatarUrl !== (profile.avatarUrl || "") && !isUploadingAvatar && (
                      <span
                        className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 ring-2 ring-white dark:ring-slate-800"
                        title={translate("Ảnh mới chưa lưu")}
                      >
                        <span className="text-[9px] font-black text-white">!</span>
                      </span>
                    )}
                  </div>

                  {/* Helper text căn giữa */}
                  <p className="text-center text-xs app-text-muted">
                    {isUploadingAvatar
                      ? translate("Đang tải ảnh lên...")
                      : translate("JPG, PNG hoặc WebP, tối đa 5 MB")}
                  </p>
                </div>

                {/* Full Name */}
                <div>
                  <label htmlFor="profile-full-name" className="block text-xs font-bold uppercase tracking-wider app-text-muted mb-2">
                    {translate("Họ và tên")}<span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <FiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      id="profile-full-name"
                      value={formData.fullName}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, fullName: e.target.value }));
                        if (fieldErrors.fullName) setFieldErrors((prev) => ({ ...prev, fullName: undefined }));
                      }}
                      placeholder={translate("Nhập họ và tên đầy đủ")}
                      className={`w-full rounded-xl pl-10 pr-4 py-2.5 text-sm app-bg-subnav app-text-main border focus:outline-none focus:ring-2 transition-all ${
                        fieldErrors.fullName
                          ? "border-rose-400 focus:ring-rose-400"
                          : "app-border focus:ring-blue-500"
                      }`}
                    />
                  </div>
                  {fieldErrors.fullName && (
                    <p className="mt-1.5 text-xs text-rose-500 flex items-center gap-1">
                      <FiAlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {fieldErrors.fullName}
                    </p>
                  )}
                </div>

                {/* Email (Read-only / Identity) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="profile-email" className="block text-xs font-bold uppercase tracking-wider app-text-muted">
                      {translate("Địa chỉ Email")}</label>
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <FiCheckCircle className="w-3 h-3" /> {translate("Đã xác thực")}</span>
                  </div>
                  <div className="relative">
                    <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      id="profile-email"
                      value={profile.email}
                      readOnly
                      disabled
                      className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm app-bg-subnav app-text-muted border app-border opacity-75 cursor-not-allowed"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {translate("Email dùng để nhận vé điện tử và thông báo sự kiện, không thể thay đổi trực tiếp.")}</p>
                </div>

                {/* Phone Number */}
                <div>
                  <label htmlFor="profile-phone" className="block text-xs font-bold uppercase tracking-wider app-text-muted mb-2">
                    {translate("Số điện thoại liên hệ")}<span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <FiPhone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="tel"
                      id="profile-phone"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={formData.phoneNumber}
                      onChange={(e) => {
                        const onlyNums = e.target.value.replace(/\D/g, "");
                        setFormData((prev) => ({ ...prev, phoneNumber: onlyNums }));
                        if (fieldErrors.phoneNumber) setFieldErrors((prev) => ({ ...prev, phoneNumber: undefined }));
                      }}
                      placeholder="09xx xxx xxx"
                      className={`w-full rounded-xl pl-10 pr-4 py-2.5 text-sm app-bg-subnav app-text-main border focus:outline-none focus:ring-2 transition-all ${
                        fieldErrors.phoneNumber
                          ? "border-rose-400 focus:ring-rose-400"
                          : "app-border focus:ring-blue-500"
                      }`}
                    />
                  </div>
                  {fieldErrors.phoneNumber ? (
                    <p className="mt-1.5 text-xs text-rose-500 flex items-center gap-1">
                      <FiAlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {fieldErrors.phoneNumber}
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-400 mt-1">
                      {translate("Số điện thoại dùng để nhận tin nhắn SMS xác nhận vé tại cổng sự kiện.")}
                    </p>
                  )}
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider app-text-muted mb-3">
                    {translate("Giới tính")}<span className="text-rose-500">*</span>
                  </label>
                  <div className="flex flex-wrap gap-5">
                    {([
                      { id: "MALE", label: translate("Nam") },
                      { id: "FEMALE", label: translate("Nữ") },
                      { id: "OTHER", label: translate("Khác") },
                    ] as const).map((item) => (
                      <label
                        key={item.id}
                        htmlFor={`gender-${item.id}`}
                        className="flex items-center gap-2 cursor-pointer select-none"
                      >
                        <input
                          type="radio"
                          id={`gender-${item.id}`}
                          name="profile-gender"
                          value={item.id}
                          checked={formData.gender === item.id}
                          onChange={() => {
                            setFormData((prev) => ({ ...prev, gender: item.id }));
                            if (fieldErrors.gender) setFieldErrors((prev) => ({ ...prev, gender: undefined }));
                          }}
                          className="w-4 h-4 accent-blue-600 cursor-pointer"
                        />
                        <span className="text-sm font-medium app-text-main">{item.label}</span>
                      </label>
                    ))}
                  </div>
                  {fieldErrors.gender && (
                    <p className="mt-1.5 text-xs text-rose-500 flex items-center gap-1">
                      <FiAlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {fieldErrors.gender}
                    </p>
                  )}
                </div>

                {isDirty && (
                  <div className="flex flex-col-reverse gap-3 border-t app-border pt-5 sm:flex-row sm:items-center sm:justify-end">
                    <button
                      type="button"
                      onClick={handleCancelChanges}
                      disabled={isSaving || isUploadingAvatar}
                      className="min-h-10 rounded-xl border app-border px-5 py-2.5 text-sm font-semibold app-text-main transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      {translate("Hủy thay đổi")}
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving || isUploadingAvatar}
                      className="flex min-h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                    >
                      {isSaving ? (
                        <>
                          <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                          <span>{translate("Đang lưu...")}</span>
                        </>
                      ) : (
                        <>
                          <FiSave className="h-4 w-4" />
                          <span>{translate("Lưu thay đổi")}</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </form>
            </div>
          )}

          {/* TAB 2: BẢO MẬT & MẬT KHẨU */}
          {activeTab === "security" && (
            <div className="rounded-2xl app-bg-card border app-border p-5 shadow-sm sm:p-7">
              <div className="border-b app-border pb-5 mb-6">
                <h3 className="text-xl font-bold app-text-main">{translate("Bảo mật & Đổi mật khẩu")}</h3>
                <p className="text-xs sm:text-sm app-text-muted mt-1">
                  {translate("Bảo vệ tài khoản và cập nhật mật khẩu đăng nhập an toàn.")}</p>
              </div>

              {passwordSuccess && (
                <div className="mb-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm flex items-center gap-2.5">
                  <FiCheckCircle className="w-5 h-5 shrink-0 text-emerald-500" />
                  <span>{translate("Đổi mật khẩu thành công! Tài khoản của bạn đã được bảo vệ.")}</span>
                </div>
              )}

              {passwordError && (
                <div className="mb-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs sm:text-sm flex items-center gap-2.5">
                  <FiAlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
                  <span>{passwordError}</span>
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider app-text-muted mb-2">
                    {translate("Mật khẩu hiện tại")}<span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) =>
                        setPasswordData((prev) => ({ ...prev, currentPassword: e.target.value }))
                      }
                      placeholder="••••••••"
                      className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm app-bg-subnav app-text-main border app-border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider app-text-muted mb-2">
                    {translate("Mật khẩu mới")}<span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) =>
                        setPasswordData((prev) => ({ ...prev, newPassword: e.target.value }))
                      }
                      placeholder={translate("Ít nhất 8 ký tự, gồm chữ và số")}
                      className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm app-bg-subnav app-text-main border app-border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider app-text-muted mb-2">
                    {translate("Xác nhận mật khẩu mới")}<span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) =>
                        setPasswordData((prev) => ({ ...prev, confirmPassword: e.target.value }))
                      }
                      placeholder={translate("Nhập lại mật khẩu mới")}
                      className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm app-bg-subnav app-text-main border app-border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      required
                    />
                  </div>
                </div>

                <div className="pt-4 border-t app-border flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={passwordSaving}
                    className="flex min-h-10 items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                  >
                    {passwordSaving ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>{translate("Đang xử lý...")}</span>
                      </>
                    ) : (
                      <>
                        <FiSave className="w-4 h-4" />
                        <span>{translate("Cập nhật mật khẩu")}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: THẺ THÀNH VIÊN VIP */}
          {activeTab === "membership" && (
            <div className="rounded-2xl app-bg-card border app-border p-5 shadow-sm space-y-6 sm:p-7">
              <div className="border-b app-border pb-5">
                <h3 className="text-xl font-bold app-text-main">{translate("Thẻ thành viên HaloTicket VIP")}</h3>
                <p className="text-xs sm:text-sm app-text-muted mt-1">
                  {translate("Đặc quyền thành viên, tích lũy điểm thưởng và ưu tiên mua vé sớm.")}</p>
              </div>

              {/* Digital Member Card */}
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-tr from-slate-900 via-indigo-950 to-blue-900 text-white p-6 sm:p-8 shadow-2xl border border-white/10">
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

                <div className="flex items-center justify-between relative z-10 mb-8">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-md">
                      <FaTicketAlt className="w-4 h-4 transform -rotate-12" />
                    </div>
                    <span className="text-xl font-extrabold tracking-tight text-white">HaloTicket</span>
                  </div>

                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-extrabold uppercase tracking-wider">
                    <FaGem className="w-3.5 h-3.5 text-amber-400" />
                    <span>{translate("Silver Member")}</span>
                  </div>
                </div>

                <div className="relative z-10 space-y-6">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1">
                      {translate("Chủ thẻ thành viên")}</span>
                    <h4 className="text-2xl font-bold tracking-wide text-white">
                      {profile.fullName || translate("Khách hàng HaloTicket")}
                    </h4>
                  </div>

                  <div className="flex flex-wrap items-end justify-between gap-4 pt-4 border-t border-white/10">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1">
                        {translate("Mã định danh thẻ")}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm sm:text-base font-bold text-slate-200">
                          {profile.id ? `HT-${profile.id.slice(0, 8).toUpperCase()}` : "HT-883921-VIP"}
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyMemberId}
                          className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 transition-colors cursor-pointer"
                          title={translate("Sao chép mã thẻ")}
                        >
                          {copied ? <FiCheck className="w-3.5 h-3.5 text-emerald-400" /> : <FiCopy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1">
                        {translate("Điểm thưởng tích lũy")}</span>
                      <span className="text-xl font-extrabold text-amber-400">1,250 PTS</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* VIP Perks List */}
              <div className="space-y-3 pt-2">
                <h4 className="text-sm font-bold uppercase tracking-wider app-text-muted">
                  {translate("Đặc quyền thành viên Silver VIP")}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 flex items-start gap-3">
                    <FiCheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="text-xs font-bold app-text-main">{translate("Ưu tiên đặt vé sớm")}</h5>
                      <p className="text-[11px] app-text-muted mt-0.5">
                        {translate("Mở bán sớm 1 giờ trước giờ công khai cho các sự kiện độc quyền.")}</p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/40 flex items-start gap-3">
                    <FaGem className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="text-xs font-bold app-text-main">{translate("Tích lũy 5% điểm")}</h5>
                      <p className="text-[11px] app-text-muted mt-0.5">
                        {translate("Quy đổi điểm thành mã giảm giá trực tiếp khi thanh toán vé.")}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: XÁC MINH DANH TÍNH (eKYC) */}
          {activeTab === "ekyc" && (
            <div className="rounded-3xl app-bg-card border app-border p-6 sm:p-8 shadow-sm space-y-7 animate-in fade-in">
              {/* Header */}
              <div className="border-b app-border pb-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                      <FiShield className="w-5 h-5" />
                    </div>
                    <h3 className="text-xl font-extrabold app-text-main">
                      {translate("Xác minh danh tính Nhà tổ chức")}
                    </h3>
                  </div>
                  <p className="text-xs sm:text-sm app-text-muted mt-1">
                    {translate("Xác minh danh tính & Thiết lập tài khoản nhận tiền bán vé.")}
                  </p>
                </div>

                <div className="shrink-0">
                  {ekycStatus?.status === "APPROVED" ? (
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 text-xs font-bold shadow-xs">
                      <FiCheckCircle className="w-4 h-4 text-emerald-500" />
                      <span>{translate("Đã xác thực")}</span>
                    </span>
                  ) : ekycStatus?.status === "PENDING" ? (
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800 text-xs font-bold shadow-xs">
                      <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                      <span>{translate("Đang chờ đối soát")}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border app-border text-xs font-bold shadow-xs">
                      <FiAlertCircle className="w-4 h-4 text-amber-500" />
                      <span>{ekycError || (ekycStatus ? EKYC_STATUS_LABELS[ekycStatus.status] : translate("Đang tải…"))}</span>
                    </span>
                  )}
                </div>
              </div>

              {ekycStatus?.status === "APPROVED" ? (
                <div className="space-y-6">
                  {/* Digital ID Hologram Card */}
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white p-6 shadow-xl border border-blue-500/30">
                    <div className="absolute -right-12 -top-12 w-48 h-48 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />
                    <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />

                    <div className="flex items-center justify-between pb-3 border-b border-white/10 relative z-10">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow">
                          <FaTicketAlt className="w-3.5 h-3.5 transform -rotate-12" />
                        </div>
                        <span className="text-xs font-extrabold uppercase tracking-wider text-blue-300">
                          HaloTicket Verified Identity
                        </span>
                      </div>
                      <span className="text-[10px] uppercase font-bold text-amber-400 px-2 py-0.5 rounded-md bg-amber-400/10 border border-amber-400/30">
                        EMV Chip ID-1
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 pb-2 relative z-10 text-xs">
                      <div className="space-y-0.5">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                          {translate("Họ và tên")}
                        </span>
                        <p className="text-base font-bold uppercase text-white">
                          {ekycStatus.legalName || translate("Chưa có dữ liệu")}
                        </p>
                      </div>

                      <div className="space-y-0.5 sm:text-right">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                          {translate("Số CCCD (đã che)")}
                        </span>
                        <p className="text-base font-mono font-bold text-blue-400">
                          {ekycStatus.documentNumber || translate("Chưa có dữ liệu")}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-white/10 text-[11px] text-slate-400 relative z-10">
                      <span className="flex items-center gap-1.5">
                        <FiCheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        {translate("Đã xác minh danh tính")}
                      </span>
                      <span>
                        {translate("Ngày xác thực:")}{" "}
                        {ekycStatus.verifiedAt
                          ? new Date(ekycStatus.verifiedAt).toLocaleDateString("vi-VN")
                          : translate("Chưa có dữ liệu")}
                      </span>
                    </div>
                  </div>

                  {/* Notice & Actions */}
                  <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 text-xs app-text-muted">
                    <p className="leading-relaxed">
                      {translate("Thông tin CCCD đã được xác thực. Tài khoản thụ hưởng cần được xác minh riêng trước khi nhận thanh toán.")}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
                    <Link
                      to={PATHS.MY_EVENTS}
                      className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all text-center"
                    >
                      {translate("Quản lý sự kiện")}
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 p-5 rounded-xl border app-border app-bg-card">
                  <div className="space-y-1">
                    <h4 className="text-base font-bold app-text-main">
                      {translate("Xác minh danh tính Nhà tổ chức")}
                    </h4>
                    <p className="text-xs sm:text-sm app-text-muted">
                      {translate("Xác minh thông tin CCCD để sử dụng các tính năng dành cho nhà tổ chức.")}
                    </p>
                  </div>

                  <div className="py-2 space-y-2 text-xs sm:text-sm">
                    <p className="font-bold app-text-main">{translate("Bạn sẽ có thể:")}</p>
                    <div className="space-y-1.5 pl-1">
                      <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                        <FiCheck className="w-4 h-4 shrink-0" />
                        <span className="app-text-main font-medium">{translate("Tạo và quản lý sự kiện")}</span>
                      </div>
                      <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                        <FiCheck className="w-4 h-4 shrink-0" />
                        <span className="app-text-main font-medium">{translate("Bán và chuyển nhượng vé")}</span>
                      </div>
                      <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                        <FiCheck className="w-4 h-4 shrink-0" />
                        <span className="app-text-main font-medium">{translate("Thiết lập tài khoản nhận tiền")}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t app-border">
                    <div className="text-xs app-text-muted">
                      {translate("Chuẩn bị CCCD gắn chip và thiết bị có camera.")}
                    </div>
                    <Link
                      to={`${PATHS.EKYC}?returnUrl=/profile?tab=ekyc`}
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-sm transition-all cursor-pointer whitespace-nowrap shrink-0 active:scale-98"
                    >
                      <span>{translate("Bắt đầu xác minh")}</span>
                      <FiArrowRight className="w-4 h-4 shrink-0" />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: VÉ CỦA TÔI */}
          {activeTab === "tickets" && (
            <div className="animate-in fade-in">
              <MyTickets embedded />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
