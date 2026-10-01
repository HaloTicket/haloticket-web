import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { LuBadgeCheck, LuCheck, LuLock, LuRefreshCw, LuShield, LuShieldCheck } from "react-icons/lu";
import { useTranslation } from "react-i18next";

import { ekycApi } from "@/services/ekycApi";
import type { EkycStatusResponse } from "@/types/ekyc";
import { PATHS } from "@/routes/paths";

export default function AccountSecuritySettingsSection() {
  const { i18n } = useTranslation();
  const en = i18n.resolvedLanguage === "en";
  const copy = (vi: string, english: string) => (en ? english : vi);
  const [status, setStatus] = useState<EkycStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [passwordNote, setPasswordNote] = useState("");

  function submitPassword(event: FormEvent<HTMLFormElement>) {
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
    setPasswordNote(
      copy(
        "Không thể đổi mật khẩu tại đây vì dịch vụ tài khoản chưa cung cấp API đổi mật khẩu trực tiếp. Vui lòng sử dụng cổng quản lý tài khoản Keycloak.",
        "Password change is unavailable here because the account service has no change-password API. Please use Keycloak account portal."
      )
    );
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
    <div className="min-w-0 rounded-xl border border-border/60 bg-card p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words font-semibold text-foreground">{value || "—"}</dd>
    </div>
  );

  return (
    <div className="space-y-6 max-w-2xl animate-in fade-in-50 duration-200">
      {/* 1. KYC Section */}
      <div className="space-y-2">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
          <LuBadgeCheck className="w-4 h-4 text-primary" />
          <span>{copy("Xác minh danh tính (KYC)", "Identity verification (KYC)")}</span>
          <span className="text-[10px] font-bold uppercase tracking-wide text-amber-700 bg-amber-500/15 border border-amber-500/25 px-1.5 py-0.5 rounded-md dark:text-amber-300">
            {copy("Tùy chọn", "Optional")}
          </span>
        </h3>
        <p className="text-xs text-muted-foreground">
          {copy(
            "Tài khoản Admin được coi là đã xác minh danh tính (không bắt buộc Didit). Bạn vẫn có thể chạy KYC nếu muốn đồng bộ CCCD thật.",
            "Admin accounts are considered identity-verified (optional). You can still run KYC to link legal citizen ID."
          )}
        </p>

        <div
          className={`rounded-2xl border p-4 sm:p-5 space-y-3 shadow-2xs admin-kyc-card ${
            verified
              ? "text-emerald-600 bg-emerald-500/10 border-emerald-500/20 is-verified"
              : "text-primary bg-primary/10 border-primary/20"
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-card/80 border border-border/60 shrink-0">
              <LuBadgeCheck
                className={`w-5 h-5 ${
                  verified ? "text-emerald-600 dark:text-emerald-400" : "text-primary"
                }`}
              />
            </div>
            <div className="min-w-0 space-y-1">
              <div className="text-sm font-bold text-foreground">
                {verified
                  ? copy("Danh tính đã được xác minh", "Identity verified")
                  : copy("Xác minh danh tính", "Identity verification")}
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
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
              <Link
                to={`${PATHS.ADMIN_IDENTITY_VERIFICATION}?returnUrl=${encodeURIComponent(
                  PATHS.ADMIN_SETTINGS_SECTION("account-security")
                )}`}
                className="h-9 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:bg-primary/90 cursor-pointer inline-flex items-center gap-1.5 transition-all"
              >
                <LuShieldCheck className="w-3.5 h-3.5" />
                <span>{copy("Xác minh ngay", "Verify now")}</span>
              </Link>
            )}
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={loading}
              className="h-9 px-3 rounded-xl border border-border bg-card text-xs font-semibold hover:bg-muted cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-60 transition-colors"
            >
              <LuRefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>{copy("Làm mới", "Refresh")}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Password Change Section */}
      <div className="space-y-2">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
          <LuLock className="w-4 h-4 text-primary" />
          <span>{copy("Thay đổi mật khẩu", "Change password")}</span>
        </h3>
        <p className="text-xs text-muted-foreground">
          {copy(
            "Để bảo vệ tài khoản quản trị, hãy sử dụng mật khẩu mạnh bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt.",
            "To protect your admin account, use a strong password with uppercase, lowercase, numbers, and special characters."
          )}
        </p>

        <form
          onSubmit={submitPassword}
          className="bg-card rounded-3xl border border-border p-5 sm:p-6 space-y-4 shadow-2xs admin-password-card"
        >
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-foreground">
              {copy("Mật khẩu hiện tại", "Current password")}
            </label>
            <input
              type="password"
              autoComplete="current-password"
              value={passwords.current}
              onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
              placeholder={copy("Nhập mật khẩu hiện tại", "Enter current password")}
              className="w-full h-10 px-3.5 bg-muted/40 focus:bg-card rounded-xl border border-border focus:border-primary text-xs sm:text-sm text-foreground outline-none transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-foreground">
              {copy("Mật khẩu mới", "New password")}
            </label>
            <input
              type="password"
              autoComplete="new-password"
              value={passwords.next}
              onChange={(e) => setPasswords({ ...passwords, next: e.target.value })}
              placeholder={copy("Tối thiểu 8 ký tự", "Minimum 8 characters")}
              className="w-full h-10 px-3.5 bg-muted/40 focus:bg-card rounded-xl border border-border focus:border-primary text-xs sm:text-sm text-foreground outline-none transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-foreground">
              {copy("Xác nhận mật khẩu mới", "Confirm new password")}
            </label>
            <input
              type="password"
              autoComplete="new-password"
              value={passwords.confirm}
              onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
              placeholder={copy("Nhập lại mật khẩu mới", "Re-enter new password")}
              className="w-full h-10 px-3.5 bg-muted/40 focus:bg-card rounded-xl border border-border focus:border-primary text-xs sm:text-sm text-foreground outline-none transition-all"
            />
          </div>

          {passwordNote && (
            <p role="status" className="rounded-xl border border-border/80 bg-muted/20 p-3 text-xs text-foreground">
              {passwordNote}
            </p>
          )}

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="admin-password-submit inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-primary hover:bg-primary/90 text-white text-xs font-bold transition-all shadow-md shadow-primary/25 cursor-pointer disabled:opacity-50"
            >
              <LuCheck className="w-4 h-4" />
              <span>{copy("Cập nhật mật khẩu", "Update password")}</span>
            </button>
          </div>
        </form>
      </div>

      {/* 3. SSO Security Box */}
      <div className="bg-card rounded-3xl border border-border p-6 space-y-3 shadow-2xs">
        <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
          <LuShield className="w-4 h-4 text-primary" />
          <span>{copy("Bảo mật đăng nhập SSO", "SSO sign-in security")}</span>
        </h4>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {copy(
            "Tài khoản quản trị viên được bảo vệ bằng Keycloak Identity Provider với mã hóa PKCE S256 và xác thực token JWT đa lớp.",
            "Admin accounts are secured with Keycloak Identity Provider using PKCE S256 encryption and multi-layer JWT token verification."
          )}
        </p>
      </div>
    </div>
  );
}
