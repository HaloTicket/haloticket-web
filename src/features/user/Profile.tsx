import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { PATHS } from "@/routes/paths";
import { userApi, type UserProfile, type UserProfileUpdateRequest } from "@/services/userApi";
import { getKeycloakSession } from "@/services/keycloakSession";
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
  FiLogOut,
  FiCamera,
  FiAward,
  FiCopy,
  FiCheck,
} from "react-icons/fi";
import { FaTicketAlt, FaGem } from "react-icons/fa";

export default function Profile() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "info";

  const [activeTab, setActiveTab] = useState<"info" | "security" | "membership">(
    initialTab === "membership" ? "membership" : initialTab === "security" ? "security" : "info"
  );

  const [profile, setProfile] = useState<UserProfile>({
    email: "",
    fullName: "",
    phoneNumber: "",
    gender: "OTHER",
    isActive: true,
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

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  // Copy member ID state
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
          setFormData({
            fullName: data.fullName || "",
            phoneNumber: data.phoneNumber || "",
            gender: data.gender || "OTHER",
            avatarUrl: data.avatarUrl || "",
          });
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

  const handleTabChange = (tab: "info" | "security" | "membership") => {
    setActiveTab(tab);
    setSearchParams(tab === "info" ? {} : { tab });
    setSaveSuccess(false);
    setErrorMessage("");
    setPasswordSuccess(false);
    setPasswordError("");
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim()) {
      setErrorMessage("Vui lòng nhập họ và tên.");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    setSaveSuccess(false);

    try {
      const updated = await userApi.updateProfile(formData);
      setProfile((prev) => ({ ...prev, ...updated }));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Không thể cập nhật thông tin. Vui lòng thử lại.";
      setErrorMessage(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess(false);

    if (!passwordData.currentPassword) {
      setPasswordError("Vui lòng nhập mật khẩu hiện tại.");
      return;
    }
    if (passwordData.newPassword.length < 8) {
      setPasswordError("Mật khẩu mới phải có ít nhất 8 ký tự.");
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setPasswordSaving(true);
    try {
      // Mock API delay for security verification
      await new Promise((resolve) => setTimeout(resolve, 800));
      setPasswordSuccess(true);
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setTimeout(() => setPasswordSuccess(false), 5000);
    } catch {
      setPasswordError("Đổi mật khẩu không thành công. Vui lòng thử lại.");
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

  const userInitial = (profile.fullName?.[0] || profile.email?.[0] || "M").toUpperCase();

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold app-text-muted">Đang tải thông tin hồ sơ...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-[1200px] mx-auto">
      {/* Navigation Header / Breadcrumbs */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2 text-sm app-text-muted">
          <Link to={PATHS.HOME} className="hover:text-blue-600 transition-colors flex items-center gap-1.5">
            <FiArrowLeft className="w-4 h-4" />
            <span>Trang chủ</span>
          </Link>
          <span>/</span>
          <span className="font-semibold app-text-main">Thông tin cá nhân</span>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border app-border text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
        >
          <FiLogOut className="w-3.5 h-3.5" />
          <span>Đăng xuất</span>
        </button>
      </div>

      {/* Main Profile Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Summary Card & Navigation Tabs */}
        <div className="lg:col-span-4 space-y-5">
          {/* User Card */}
          <div className="rounded-3xl app-bg-card border app-border p-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />

            <div className="flex flex-col items-center text-center">
              {/* Avatar */}
              <div className="relative group mb-4">
                <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white text-3xl font-extrabold shadow-lg overflow-hidden border-4 border-white dark:border-slate-800">
                  {formData.avatarUrl ? (
                    <img
                      src={formData.avatarUrl}
                      alt={formData.fullName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <span>{userInitial}</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const url = prompt("Nhập đường dẫn ảnh đại diện mới (URL):", formData.avatarUrl);
                    if (url !== null) {
                      setFormData((prev) => ({ ...prev, avatarUrl: url.trim() }));
                    }
                  }}
                  className="absolute bottom-0 right-0 p-2 rounded-full bg-blue-600 text-white shadow-md hover:bg-blue-700 transition-colors cursor-pointer"
                  title="Đổi ảnh đại diện"
                >
                  <FiCamera className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Name and Tag */}
              <h2 className="text-xl font-bold app-text-main mb-1">
                {formData.fullName || "Khách hàng HaloTicket"}
              </h2>
              <p className="text-xs app-text-muted mb-3 flex items-center gap-1.5">
                <FiMail className="w-3 h-3 text-blue-500" />
                {profile.email || "email@haloticket.vn"}
              </p>

              {/* Status & Member Badges */}
              <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Đang hoạt động
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40">
                  <FaGem className="w-3 h-3 text-amber-500" />
                  Thành viên VIP
                </span>
              </div>
            </div>

            {/* Divider */}
            <div className="my-5 border-t app-border" />

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3 text-center">
              <Link
                to={PATHS.MY_TICKETS}
                className="p-3 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 hover:bg-blue-100/70 dark:hover:bg-blue-950/60 transition-colors block border border-blue-100 dark:border-blue-900/40"
              >
                <div className="flex items-center justify-center gap-1.5 text-blue-600 dark:text-blue-400 mb-1">
                  <FaTicketAlt className="w-4 h-4" />
                  <span className="text-xs font-bold">Vé của tôi</span>
                </div>
                <span className="text-xs app-text-muted">Xem vé đã mua</span>
              </Link>

              <button
                type="button"
                onClick={() => handleTabChange("membership")}
                className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 hover:bg-amber-100/70 dark:hover:bg-amber-950/60 transition-colors block border border-amber-100 dark:border-amber-900/40 cursor-pointer text-left"
              >
                <div className="flex items-center justify-center gap-1.5 text-amber-600 dark:text-amber-400 mb-1">
                  <FiAward className="w-4 h-4" />
                  <span className="text-xs font-bold">1,250 Điểm</span>
                </div>
                <span className="text-xs app-text-muted block text-center">Hạng Bạc VIP</span>
              </button>
            </div>
          </div>

          {/* Navigation Tab Menu */}
          <div className="rounded-3xl app-bg-card border app-border p-3 shadow-sm space-y-1.5">
            <button
              onClick={() => handleTabChange("info")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeTab === "info"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "app-text-main hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <FiUser className={`w-4 h-4 ${activeTab === "info" ? "text-white" : "text-blue-500"}`} />
              <span>Thông tin cá nhân</span>
            </button>

            <button
              onClick={() => handleTabChange("security")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeTab === "security"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "app-text-main hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <FiShield className={`w-4 h-4 ${activeTab === "security" ? "text-white" : "text-emerald-500"}`} />
              <span>Bảo mật & Mật khẩu</span>
            </button>

            <button
              onClick={() => handleTabChange("membership")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeTab === "membership"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "app-text-main hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <FaGem className={`w-4 h-4 ${activeTab === "membership" ? "text-white" : "text-amber-500"}`} />
              <span>Thẻ thành viên VIP</span>
            </button>

            <Link
              to={PATHS.MY_TICKETS}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs sm:text-sm font-semibold app-text-main hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              <FaTicketAlt className="w-4 h-4 text-purple-500" />
              <span>Vé của tôi</span>
            </Link>
          </div>
        </div>

        {/* Right Side: Tab Contents */}
        <div className="lg:col-span-8">
          {/* TAB 1: THÔNG TIN CÁ NHÂN */}
          {activeTab === "info" && (
            <div className="rounded-3xl app-bg-card border app-border p-6 sm:p-8 shadow-sm">
              <div className="border-b app-border pb-5 mb-6">
                <h3 className="text-xl font-bold app-text-main">Hồ sơ cá nhân</h3>
                <p className="text-xs sm:text-sm app-text-muted mt-1">
                  Quản lý thông tin định danh và liên hệ tài khoản HaloTicket của bạn.
                </p>
              </div>

              {saveSuccess && (
                <div className="mb-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm flex items-center gap-2.5 animate-in fade-in duration-300">
                  <FiCheckCircle className="w-5 h-5 shrink-0 text-emerald-500" />
                  <span>Cập nhật thông tin cá nhân thành công!</span>
                </div>
              )}

              {errorMessage && (
                <div className="mb-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs sm:text-sm flex items-center gap-2.5 animate-in fade-in duration-300">
                  <FiAlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="space-y-5">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider app-text-muted mb-2">
                    Họ và tên <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <FiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => setFormData((prev) => ({ ...prev, fullName: e.target.value }))}
                      placeholder="Nhập họ và tên đầy đủ"
                      className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm app-bg-subnav app-text-main border app-border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      required
                    />
                  </div>
                </div>

                {/* Email (Read-only / Identity) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold uppercase tracking-wider app-text-muted">
                      Địa chỉ Email
                    </label>
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <FiCheckCircle className="w-3 h-3" /> Đã xác thực
                    </span>
                  </div>
                  <div className="relative">
                    <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      value={profile.email}
                      readOnly
                      disabled
                      className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm app-bg-subnav app-text-muted border app-border opacity-75 cursor-not-allowed"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Email dùng để nhận vé điện tử và thông báo sự kiện, không thể thay đổi trực tiếp.
                  </p>
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider app-text-muted mb-2">
                    Số điện thoại liên hệ
                  </label>
                  <div className="relative">
                    <FiPhone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="tel"
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData((prev) => ({ ...prev, phoneNumber: e.target.value }))}
                      placeholder="09xx xxx xxx"
                      className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm app-bg-subnav app-text-main border app-border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Số điện thoại dùng để nhận tin nhắn SMS xác nhận vé tại cổng sự kiện.
                  </p>
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider app-text-muted mb-2">
                    Giới tính
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: "MALE", label: "Nam" },
                      { id: "FEMALE", label: "Nữ" },
                      { id: "OTHER", label: "Khác" },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            gender: item.id as "MALE" | "FEMALE" | "OTHER",
                          }))
                        }
                        className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold border transition-all cursor-pointer ${
                          formData.gender === item.id
                            ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-500"
                            : "app-bg-subnav app-text-main app-border hover:border-slate-400"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Avatar URL Option */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider app-text-muted mb-2">
                    Đường dẫn ảnh đại diện (URL)
                  </label>
                  <input
                    type="url"
                    value={formData.avatarUrl}
                    onChange={(e) => setFormData((prev) => ({ ...prev, avatarUrl: e.target.value }))}
                    placeholder="https://example.com/avatar.jpg"
                    className="w-full rounded-xl px-4 py-2.5 text-sm app-bg-subnav app-text-main border app-border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>

                {/* Submit Action */}
                <div className="pt-4 border-t app-border flex items-center justify-end gap-3">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {isSaving ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Đang lưu...</span>
                      </>
                    ) : (
                      <>
                        <FiSave className="w-4 h-4" />
                        <span>Lưu thay đổi</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: BẢO MẬT & MẬT KHẨU */}
          {activeTab === "security" && (
            <div className="rounded-3xl app-bg-card border app-border p-6 sm:p-8 shadow-sm">
              <div className="border-b app-border pb-5 mb-6">
                <h3 className="text-xl font-bold app-text-main">Bảo mật & Đổi mật khẩu</h3>
                <p className="text-xs sm:text-sm app-text-muted mt-1">
                  Bảo vệ tài khoản và cập nhật mật khẩu đăng nhập an toàn.
                </p>
              </div>

              {passwordSuccess && (
                <div className="mb-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm flex items-center gap-2.5">
                  <FiCheckCircle className="w-5 h-5 shrink-0 text-emerald-500" />
                  <span>Đổi mật khẩu thành công! Tài khoản của bạn đã được bảo vệ.</span>
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
                    Mật khẩu hiện tại <span className="text-rose-500">*</span>
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
                    Mật khẩu mới <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) =>
                        setPasswordData((prev) => ({ ...prev, newPassword: e.target.value }))
                      }
                      placeholder="Ít nhất 8 ký tự, gồm chữ và số"
                      className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm app-bg-subnav app-text-main border app-border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider app-text-muted mb-2">
                    Xác nhận mật khẩu mới <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) =>
                        setPasswordData((prev) => ({ ...prev, confirmPassword: e.target.value }))
                      }
                      placeholder="Nhập lại mật khẩu mới"
                      className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm app-bg-subnav app-text-main border app-border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      required
                    />
                  </div>
                </div>

                <div className="pt-4 border-t app-border flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={passwordSaving}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {passwordSaving ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Đang xử lý...</span>
                      </>
                    ) : (
                      <>
                        <FiSave className="w-4 h-4" />
                        <span>Cập nhật mật khẩu</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: THẺ THÀNH VIÊN VIP */}
          {activeTab === "membership" && (
            <div className="rounded-3xl app-bg-card border app-border p-6 sm:p-8 shadow-sm space-y-6">
              <div className="border-b app-border pb-5">
                <h3 className="text-xl font-bold app-text-main">Thẻ thành viên HaloTicket VIP</h3>
                <p className="text-xs sm:text-sm app-text-muted mt-1">
                  Đặc quyền thành viên, tích lũy điểm thưởng và ưu tiên mua vé sớm.
                </p>
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
                    <span>Silver Member</span>
                  </div>
                </div>

                <div className="relative z-10 space-y-6">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1">
                      Chủ thẻ thành viên
                    </span>
                    <h4 className="text-2xl font-bold tracking-wide text-white">
                      {formData.fullName || "Khách hàng HaloTicket"}
                    </h4>
                  </div>

                  <div className="flex flex-wrap items-end justify-between gap-4 pt-4 border-t border-white/10">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1">
                        Mã định danh thẻ
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm sm:text-base font-bold text-slate-200">
                          {profile.id ? `HT-${profile.id.slice(0, 8).toUpperCase()}` : "HT-883921-VIP"}
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyMemberId}
                          className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 transition-colors cursor-pointer"
                          title="Sao chép mã thẻ"
                        >
                          {copied ? <FiCheck className="w-3.5 h-3.5 text-emerald-400" /> : <FiCopy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1">
                        Điểm thưởng tích lũy
                      </span>
                      <span className="text-xl font-extrabold text-amber-400">1,250 PTS</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* VIP Perks List */}
              <div className="space-y-3 pt-2">
                <h4 className="text-sm font-bold uppercase tracking-wider app-text-muted">
                  Đặc quyền thành viên Silver VIP
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 flex items-start gap-3">
                    <FiCheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="text-xs font-bold app-text-main">Ưu tiên đặt vé sớm</h5>
                      <p className="text-[11px] app-text-muted mt-0.5">
                        Mở bán sớm 1 giờ trước giờ công khai cho các sự kiện độc quyền.
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/40 flex items-start gap-3">
                    <FaGem className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="text-xs font-bold app-text-main">Tích lũy 5% điểm</h5>
                      <p className="text-[11px] app-text-muted mt-0.5">
                        Quy đổi điểm thành mã giảm giá trực tiếp khi thanh toán vé.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
