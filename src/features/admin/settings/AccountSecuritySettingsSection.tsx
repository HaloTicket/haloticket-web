import { useEffect, useState, type FormEvent } from "react";
import { LuBadgeCheck, LuCheck, LuLock, LuRefreshCw, LuShield, LuShieldCheck } from "react-icons/lu";
import { useTranslation } from "react-i18next";
import { ekycApi } from "@/services/ekycApi";
import { userApi } from "@/services/userApi";
import type { EkycStatusResponse } from "@/types/ekyc";
import EkycVerification from "@/features/ekyc/EkycVerification";

export default function AccountSecuritySettingsSection() {
  const { i18n } = useTranslation();
  const en = i18n.resolvedLanguage === "en";
  const copy = (vi: string, english: string) => (en ? english : vi);
  const [status, setStatus] = useState<EkycStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [passwordNote, setPasswordNote] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [showKyc, setShowKyc] = useState(false);
  const [updating, setUpdating] = useState(false);

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!passwords.current || !passwords.next || !passwords.confirm) {
      setPasswordNote(copy("Vui lòng nhập đủ ba trường mật khẩu.", "Please complete all three password fields."));
      return;
    }
    if (passwords.next.length < 8) {
      setPasswordNote(copy("Mật khẩu mới phải có tối thiểu 8 ký tự.", "New password must be at least 8 characters."));
      return;
    }
    if (passwords.next !== passwords.confirm) {
      setPasswordNote(copy("Xác nhận mật khẩu mới không trùng khớp.", "New password and confirmation do not match."));
      return;
    }
    setPasswordNote("");
    setPasswordSuccess("");
    setUpdating(true);
    try {
      await userApi.changePassword({ currentPassword: passwords.current, newPassword: passwords.next });
      setPasswordSuccess(copy("Đổi mật khẩu thành công.", "Password changed successfully."));
      setPasswords({ current: "", next: "", confirm: "" });
    } catch (err: any) {
      setPasswordNote(err?.response?.data?.message || copy("Không thể đổi mật khẩu. Vui lòng kiểm tra lại mật khẩu hiện tại.", "Failed to change password. Please check your current password."));
    } finally {
      setUpdating(false);
    }
  }

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      setStatus(await ekycApi.getStatus());
    } catch {
      setError(copy("Không thể tải trạng thái xác minh. Vui lòng thử lại.", "Could not load verification status. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    ekycApi
      .getStatus()
      .then((value) => {
        if (active) setStatus(value);
      })
      .catch(() => {
        if (active)
          setError(en ? "Could not load verification status. Please try again." : "Không thể tải trạng thái xác minh. Vui lòng thử lại.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [en]);

  const verified = status?.status === "APPROVED";
  const detail = (label: string, value?: string | null) => (
    <div className="min-w-0 rounded-lg border border-border/60 bg-card p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words font-semibold text-foreground">{value || "—"}</dd>
    </div>
  );

  if (showKyc) {
    return (
      <div className="animate-in fade-in-50 duration-200">
        <div className="mb-4">
          <button onClick={() => setShowKyc(false)} className="text-sm text-blue-600 dark:text-blue-400 font-semibold inline-flex items-center gap-1 hover:underline">
            ← {copy("Quay lại", "Back")}
          </button>
        </div>
        <EkycVerification />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* 1. KYC Section */}
      <div className="space-y-2">
        <h3 className="text-[13px] font-bold app-text-main flex items-center gap-1.5">
          <LuBadgeCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>{copy("Xác minh danh tính (KYC)", "Identity verification (KYC)")}</span>
          <span className="text-[10px] font-bold uppercase tracking-wide text-amber-700 bg-amber-500/15 border border-amber-500/25 px-1.5 py-0.5 rounded-md dark:text-amber-300">
            {copy("Tùy chọn", "Optional")}
          </span>
        </h3>
        <p className="text-[11px] app-text-muted">
          {copy(
            "Tài khoản Admin được coi là đã xác minh danh tính (không bắt buộc Didit). Bạn vẫn có thể chạy KYC nếu muốn đồng bộ CCCD thật.",
            "Admin accounts are considered identity-verified (optional). You can still run KYC to link legal citizen ID."
          )}
        </p>

        <div
          className={`rounded-lg border p-4 sm:p-5 space-y-3 shadow-xs admin-kyc-card ${
            verified
              ? "text-emerald-600 bg-emerald-500/10 border-emerald-500/20 is-verified"
              : "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20"
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-md app-bg-card border app-border shrink-0">
              <LuBadgeCheck
                className={`w-5 h-5 ${
                  verified ? "text-emerald-600 dark:text-emerald-400" : "text-blue-600 dark:text-blue-400"
                }`}
              />
            </div>
            <div className="min-w-0 space-y-1">
              <div className="text-[13px] font-bold app-text-main">
                {verified
                  ? copy("Danh tính đã được xác minh", "Identity verified")
                  : copy("Xác minh danh tính", "Identity verification")}
              </div>
              <p className="text-[11px] app-text-muted leading-relaxed">
                {verified
                  ? copy(
                      "Hồ sơ eKYC của bạn đã được xác nhận thành công.",
                      "Your eKYC profile has been successfully verified."
                    )
                  : copy(
                      "Xác minh CCCD + khuôn mặt để tăng độ tin cậy khi giao dịch trên HaloTicket.",
                      "Verify CCCD + face to enhance trust when transacting on HaloTicket."
                    )}
              </p>
              {verified && status?.verifiedAt && (
                <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                  {copy("Xác minh lúc ", "Verified on ")}
                  {new Date(status.verifiedAt).toLocaleDateString(en ? "en-US" : "vi-VN")}
                </p>
              )}
            </div>
          </div>

          {error && <p role="alert" className="text-xs text-destructive">{error}</p>}

          {verified && status && (
            <dl className="mt-3 grid gap-2.5 sm:grid-cols-2 pt-2 border-t border-emerald-500/20">
              {detail(copy("Họ tên pháp lý", "Legal name"), status.legalName)}
              {detail(copy("Số giấy tờ (đã che)", "Document number (masked)"), status.documentNumber)}
              {detail(copy("Ngày sinh", "Birth date"), status.birthDate)}
              {detail(copy("Ngày hết hạn giấy tờ", "Document expiry"), status.documentExpiresOn)}
              {detail(copy("Địa chỉ trên giấy tờ", "Document address"), status.address)}
            </dl>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            {!verified && (
              <button
                type="button"
                onClick={() => setShowKyc(true)}
                className="h-9 px-4 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer inline-flex items-center gap-1.5 transition-all"
              >
                <LuShieldCheck className="w-3.5 h-3.5" />
                <span>{copy("Xác minh ngay", "Verify now")}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={loading}
              className="h-9 px-3 rounded-md border app-border app-bg-card text-xs font-semibold hover:bg-slate-50 dark:hover:bg-[#1E1E20] app-text-main cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-60 transition-colors"
            >
              <LuRefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>{copy("Làm mới", "Refresh")}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Password Change Section */}
      <div className="space-y-2">
        <h3 className="text-[13px] font-bold app-text-main flex items-center gap-1.5">
          <LuLock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>{copy("Thay đổi mật khẩu", "Change password")}</span>
        </h3>
        <p className="text-[11px] app-text-muted">
          {copy(
            "Để bảo vệ tài khoản quản trị, hãy sử dụng mật khẩu mạnh bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt.",
            "To protect your admin account, use a strong password with uppercase, lowercase, numbers, and special characters."
          )}
        </p>

        <form
          onSubmit={submitPassword}
          className="app-bg-card rounded-lg border app-border p-5 sm:p-6 space-y-4 shadow-xs admin-password-card"
        >
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold app-text-main">
              {copy("Mật khẩu hiện tại", "Current password")}
            </label>
            <input
              type="password"
              autoComplete="current-password"
              value={passwords.current}
              onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
              placeholder={copy("Nhập mật khẩu hiện tại", "Enter current password")}
              className="w-full min-h-9 px-3.5 bg-slate-50 dark:bg-[#1E1E20] focus:bg-white dark:focus:bg-[#171719] rounded-md border app-border focus:border-blue-500 text-[11px] sm:text-xs app-text-main outline-none transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold app-text-main">
              {copy("Mật khẩu mới", "New password")}
            </label>
            <input
              type="password"
              autoComplete="new-password"
              value={passwords.next}
              onChange={(e) => setPasswords({ ...passwords, next: e.target.value })}
              placeholder={copy("Tối thiểu 8 ký tự", "Minimum 8 characters")}
              className="w-full min-h-9 px-3.5 bg-slate-50 dark:bg-[#1E1E20] focus:bg-white dark:focus:bg-[#171719] rounded-md border app-border focus:border-blue-500 text-[11px] sm:text-xs app-text-main outline-none transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold app-text-main">
              {copy("Xác nhận mật khẩu mới", "Confirm new password")}
            </label>
            <input
              type="password"
              autoComplete="new-password"
              value={passwords.confirm}
              onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
              placeholder={copy("Nhập lại mật khẩu mới", "Re-enter new password")}
              className="w-full min-h-9 px-3.5 bg-slate-50 dark:bg-[#1E1E20] focus:bg-white dark:focus:bg-[#171719] rounded-md border app-border focus:border-blue-500 text-[11px] sm:text-xs app-text-main outline-none transition-all"
            />
          </div>

          {passwordNote && (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-3 text-xs text-red-600 dark:text-red-400 font-medium">
              {passwordNote}
            </p>
          )}

          {passwordSuccess && (
            <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800 p-3 text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
              <LuCheck className="w-4 h-4 shrink-0" />
              <span>{passwordSuccess}</span>
            </p>
          )}

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={updating}
              className="admin-password-submit inline-flex items-center gap-2 px-6 py-2 min-h-9 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              <LuCheck className="w-4 h-4" />
              <span>{updating ? copy("Đang xử lý...", "Processing...") : copy("Cập nhật mật khẩu", "Update password")}</span>
            </button>
          </div>
        </form>
      </div>

      {/* 3. SSO Security Box */}
      <div className="app-bg-card rounded-lg border app-border p-6 space-y-3 shadow-xs">
        <h4 className="text-[11px] font-bold app-text-main uppercase tracking-wider flex items-center gap-2">
          <LuShield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>{copy("Bảo mật đăng nhập SSO", "SSO sign-in security")}</span>
        </h4>
        <p className="text-[11px] app-text-muted leading-relaxed">
          {copy(
            "Tài khoản quản trị viên được bảo vệ bằng Keycloak Identity Provider với mã hóa PKCE S256 và xác thực token JWT đa lớp.",
            "Admin accounts are secured with Keycloak Identity Provider using PKCE S256 encryption and multi-layer JWT token verification."
          )}
        </p>
      </div>
    </div>
  );
}
