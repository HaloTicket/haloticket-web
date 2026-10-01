import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { FiCheckCircle, FiLock, FiRefreshCw, FiShield } from "react-icons/fi";
import { useTranslation } from "react-i18next";

import { ekycApi } from "@/services/ekycApi";
import { EKYC_STATUS_LABELS, type EkycStatusResponse } from "@/types/ekyc";
import { PATHS } from "@/routes/paths";

export default function AccountSecuritySettingsSection() {
  const { i18n } = useTranslation();
  const en = i18n.resolvedLanguage === "en";
  const copy = (vi: string, english: string) => en ? english : vi;
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
    if (passwords.next !== passwords.confirm) {
      setPasswordNote(copy("Mật khẩu mới và xác nhận chưa khớp.", "New password and confirmation do not match."));
      return;
    }
    setPasswordNote(copy("Không thể đổi mật khẩu tại đây vì dịch vụ tài khoản chưa cung cấp API đổi mật khẩu. Hãy dùng liên kết đặt lại mật khẩu bên dưới.", "Password change is unavailable here because the account service has no change-password API. Use the reset link below."));
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
    ekycApi.getStatus().then((value) => { if (active) setStatus(value); }).catch(() => {
      if (active) setError(en ? "Could not load verification status. Please try again." : "Không thể tải trạng thái xác minh. Vui lòng thử lại.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [en]);

  const verified = status?.status === "APPROVED";
  const detail = (label: string, value?: string | null) => <div className="min-w-0 rounded-xl border app-border app-bg-page p-3"><dt className="text-xs app-text-muted">{label}</dt><dd className="mt-1 break-words font-semibold app-text-main">{value || "—"}</dd></div>;

  return <div className="space-y-7 text-sm">
    <section className="space-y-4">
      <div className="flex items-start gap-3"><FiShield className="mt-0.5 shrink-0 text-lg app-text-brand" /><div><h3 className="font-bold app-text-main">{copy("Xác minh danh tính (eKYC)", "Identity verification (eKYC)")}</h3><p className="app-text-muted">{copy("Trạng thái được lấy trực tiếp từ dịch vụ xác minh HaloTicket.", "Status comes directly from HaloTicket's verification service.")}</p></div></div>
      <div className="rounded-2xl border app-border app-bg-page p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs app-text-muted">{copy("Trạng thái hiện tại", "Current status")}</p><strong className="mt-1 block text-base app-text-main">{loading ? copy("Đang tải…", "Loading…") : status ? (en ? ({ NOT_STARTED: "Not verified", PENDING: "Pending review", APPROVED: "Identity verified", REJECTED: "Verification rejected", REVOKED: "Verification revoked", EXPIRED: "Document expired", REQUIRES_UPDATE: "Update required" } as const)[status.status] : EKYC_STATUS_LABELS[status.status]) : "—"}</strong></div><button type="button" onClick={() => void refresh()} disabled={loading} className="inline-flex min-h-11 items-center gap-2 rounded-xl border app-border app-bg-card px-4 font-semibold app-text-main disabled:opacity-50"><FiRefreshCw />{copy("Làm mới", "Refresh")}</button></div>
        {error && <p role="alert" className="admin-settings-error mt-4">{error}</p>}
        {status?.reasonCode && !verified && <p className="mt-3 text-xs app-text-muted">{copy("Mã lý do", "Reason code")}: {status.reasonCode}</p>}
        {status && <dl className="mt-4 grid gap-3 sm:grid-cols-2">{detail(copy("Họ tên pháp lý", "Legal name"), status.legalName)}{detail(copy("Số giấy tờ (đã che)", "Document number (masked)"), status.documentNumber)}{detail(copy("Ngày sinh", "Birth date"), status.birthDate)}{detail(copy("Ngày hết hạn giấy tờ", "Document expiry"), status.documentExpiresOn)}{detail(copy("Địa chỉ trên giấy tờ", "Document address"), status.address)}{detail(copy("Ngày xác minh", "Verified on"), status.verifiedAt ? new Date(status.verifiedAt).toLocaleDateString(en ? "en-US" : "vi-VN") : null)}</dl>}
        {verified && <p className="mt-4 flex items-center gap-2 text-green-700 dark:text-green-400"><FiCheckCircle />{copy("Danh tính đã được xác minh.", "Identity has been verified.")}</p>}
        {status && !verified && status.status !== "PENDING" && <Link to={`${PATHS.ADMIN_IDENTITY_VERIFICATION}?returnUrl=${encodeURIComponent(PATHS.ADMIN_SETTINGS_SECTION("account-security"))}`} className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-[var(--color-brand-primary)] px-4 font-semibold text-white">{copy("Bắt đầu xác minh", "Start verification")}</Link>}
      </div>
    </section>

    <section className="space-y-4 border-t app-border pt-6"><div className="flex items-start gap-3"><FiLock className="mt-0.5 shrink-0 text-lg app-text-brand" /><div><h3 className="font-bold app-text-main">{copy("Thay đổi mật khẩu", "Change password")}</h3><p className="app-text-muted">{copy("Dùng mật khẩu mạnh gồm chữ hoa, chữ thường, số và ký tự đặc biệt.", "Use a strong password with upper and lower case letters, numbers and symbols.")}</p></div></div><form onSubmit={submitPassword} className="space-y-3.5 rounded-2xl border app-border app-bg-card p-4 sm:p-5">{[["current", copy("Mật khẩu hiện tại", "Current password")], ["next", copy("Mật khẩu mới", "New password")], ["confirm", copy("Xác nhận mật khẩu mới", "Confirm new password")]].map(([key, label]) => <label key={key} className="grid gap-1.5 font-medium app-text-main">{label}<input type="password" autoComplete={key === "current" ? "current-password" : "new-password"} value={passwords[key as keyof typeof passwords]} onChange={(event) => setPasswords({ ...passwords, [key]: event.target.value })} className="min-h-11 w-full rounded-xl border app-border app-bg-page px-3 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-primary)]" /></label>)}<p className="text-xs app-text-muted">{copy("Dịch vụ tài khoản hiện chưa hỗ trợ đổi mật khẩu trực tiếp. Biểu mẫu này chỉ kiểm tra dữ liệu; mật khẩu không được gửi đi.", "Direct password changes are not yet supported. This form only checks entries; passwords are not sent.")}</p>{passwordNote && <p role="status" className="rounded-xl border app-border app-bg-page p-3 app-text-main">{passwordNote}</p>}<div className="flex flex-wrap items-center justify-end gap-3"><Link to={PATHS.FORGOT_PASSWORD} className="inline-flex min-h-11 items-center rounded-xl border app-border px-4 font-semibold app-text-brand">{copy("Đặt lại qua email", "Reset by email")}</Link><button type="submit" className="min-h-11 rounded-xl bg-[var(--color-brand-primary)] px-4 font-semibold text-white">{copy("Đổi mật khẩu", "Change password")}</button></div></form></section>

    <section className="rounded-2xl border app-border app-bg-card p-4 sm:p-5"><h3 className="font-bold app-text-main">{copy("Bảo mật đăng nhập SSO", "SSO sign-in security")}</h3><p className="mt-2 app-text-muted">{copy("Phiên đăng nhập được quản lý bởi Keycloak. HaloTicket chuyển hướng đến nhà cung cấp danh tính để xác thực và dùng mã thông báo cho các yêu cầu được bảo vệ.", "Keycloak manages sign-in sessions. HaloTicket redirects to the identity provider for authentication and uses tokens for protected requests.")}</p></section>

  </div>;
}
