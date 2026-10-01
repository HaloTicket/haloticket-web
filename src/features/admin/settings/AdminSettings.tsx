import { useEffect, useState } from "react";
import { FiBell, FiEye, FiMoon, FiUser } from "react-icons/fi";
import { useTranslation } from "react-i18next";

import { useTheme } from "@/hooks/useTheme";
import { setLanguage } from "@/i18n";
import { getCachedUserProfile } from "@/services/userApi";
import type { UserProfile } from "@/types";
import { preferenceIdentity, useAdminPreferences } from "./adminPreferences";
import "./adminSettings.css";

type Section = "profile" | "appearance" | "privacy" | "notifications";

export default function AdminSettings() {
  const { i18n } = useTranslation();
  const en = i18n.resolvedLanguage === "en";
  const copy = (vi: string, english: string) => en ? english : vi;
  const [section, setSection] = useState<Section>("profile");
  const [profile, setProfile] = useState<UserProfile | null>(getCachedUserProfile);
  const { theme, setTheme } = useTheme();
  const identity = preferenceIdentity(profile);
  const { preferences, error, update } = useAdminPreferences(identity);

  useEffect(() => {
    const refresh = () => setProfile(getCachedUserProfile());
    window.addEventListener("user-updated", refresh);
    window.addEventListener("auth-changed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("user-updated", refresh);
      window.removeEventListener("auth-changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const sections = [
    { id: "profile", icon: FiUser, vi: "Hồ sơ", en: "Profile" },
    { id: "appearance", icon: FiMoon, vi: "Giao diện", en: "Appearance" },
    { id: "privacy", icon: FiEye, vi: "Quyền riêng tư", en: "Privacy" },
    { id: "notifications", icon: FiBell, vi: "Thông báo", en: "Notifications" },
  ] as const;
  const active = sections.find((item) => item.id === section)!;
  const safeName = profile?.fullName && (!preferences.hideEmail || !profile.fullName.includes("@")) ? profile.fullName : copy("Tài khoản quản trị", "Admin account");

  return <section className="admin-settings">
    <div className="admin-settings-heading">
      <h1>{copy("Cài đặt tài khoản", "Account settings")}</h1>
      <p>{copy("Điều chỉnh cách HaloTicket hiển thị trên trình duyệt này.", "Choose how HaloTicket appears in this browser.")}</p>
    </div>
    <div className="admin-settings-shell">
      <nav className="admin-settings-nav" aria-label={copy("Mục cài đặt", "Settings sections")}>
        {sections.map((item) => <button key={item.id} type="button" className={section === item.id ? "is-active" : ""} aria-current={section === item.id ? "page" : undefined} onClick={() => setSection(item.id)}>
          <item.icon aria-hidden="true" />{copy(item.vi, item.en)}
        </button>)}
      </nav>
      <div className="admin-settings-content">
        <div className="admin-settings-section-heading"><h2>{copy(active.vi, active.en)}</h2></div>
        {error && <p role="alert" className="admin-settings-error">{en ? (error.startsWith("Cài đặt đã") ? "Saved settings are invalid. Defaults are in use; choose again to save." : "This browser could not save settings. Check storage permissions and try again.") : error}</p>}
        {section === "profile" && <div className="admin-settings-stack">
          <p className="admin-settings-intro">{copy("Thông tin tài khoản hiện tại. Hồ sơ được quản lý bởi dịch vụ tài khoản HaloTicket.", "Your current account details are managed by HaloTicket's account service.")}</p>
          <div className="admin-settings-identity"><span className="admin-settings-avatar">{safeName[0]?.toUpperCase()}</span><div><strong>{safeName}</strong><small>{copy("Tài khoản quản trị", "Admin account")}</small></div></div>
          <div className="admin-settings-field"><span>{copy("Họ tên", "Name")}</span><strong>{safeName}</strong></div>
          <div className="admin-settings-field"><span>Email</span><strong>{preferences.hideEmail ? "••••••" : profile?.email || "—"}</strong></div>
          <div className="admin-settings-field"><span>{copy("Số điện thoại", "Phone")}</span><strong>{profile?.phoneNumber || "—"}</strong></div>
          {!profile && <p className="admin-settings-intro">{copy("Chưa có thông tin tài khoản trong phiên này.", "No account details are available in this session.")}</p>}
        </div>}
        {section === "appearance" && <div className="admin-settings-stack">
          <div><h3>{copy("Chủ đề giao diện", "Theme")}</h3><p className="admin-settings-intro">{copy("Áp dụng ngay cho toàn bộ HaloTicket.", "Applies immediately throughout HaloTicket.")}</p></div>
          <div className="admin-settings-options" role="group" aria-label={copy("Chủ đề giao diện", "Theme")}>{(["light", "dark", "system"] as const).map((value) => <button key={value} type="button" className={theme === value ? "is-selected" : ""} aria-pressed={theme === value} onClick={() => setTheme(value)}>{value === "light" ? copy("Sáng", "Light") : value === "dark" ? copy("Tối", "Dark") : copy("Hệ thống", "System")}</button>)}</div>
          <div className="admin-settings-row"><div><h3>{copy("Ngôn ngữ hiển thị", "Display language")}</h3><p>{copy("Áp dụng cho giao diện hiện tại.", "Applies to the current interface.")}</p></div><select aria-label={copy("Ngôn ngữ hiển thị", "Display language")} value={en ? "en" : "vi"} onChange={(event) => void setLanguage(event.target.value === "en" ? "en" : "vi")}><option value="vi">Tiếng Việt</option><option value="en">English</option></select></div>
        </div>}
        {section === "privacy" && <div className="admin-settings-stack">
          <p className="admin-settings-intro">{copy("Tùy chọn hiển thị trong trình duyệt này; không thay đổi dữ liệu tài khoản hoặc quyền truy cập.", "A display preference in this browser; it does not change account data or access permissions.")}</p>
          <div className="admin-settings-row"><div><h3>{copy("Ẩn email trong giao diện quản trị", "Hide email in admin interface")}</h3><p>{copy("Che email trong menu tài khoản và trang cài đặt.", "Masks your email in the account menu and settings page.")}</p></div><button type="button" role="switch" aria-label={copy("Ẩn email trong giao diện quản trị", "Hide email in admin interface")} aria-checked={preferences.hideEmail} className="admin-settings-switch" onClick={() => update("hideEmail", !preferences.hideEmail)} disabled={!identity}><span /></button></div>
        </div>}
        {section === "notifications" && <div className="admin-settings-stack">
          <p className="admin-settings-intro">{copy("Tùy chọn hiển thị trong trình duyệt này. Thông báo vẫn có trong danh sách thông báo.", "A display preference in this browser. Notifications remain in the notification list.")}</p>
          <div className="admin-settings-row"><div><h3>{copy("Thông báo tức thời", "Instant notifications")}</h3><p>{copy("Hiện thông báo nổi cho sự kiện mới trong khu vực quản trị. Lỗi và xác nhận thao tác vẫn hiển thị.", "Show background notification toasts for new admin events. Action results and errors still appear.")}</p></div><button type="button" role="switch" aria-label={copy("Thông báo tức thời", "Instant notifications")} aria-checked={preferences.instantNotifications} className="admin-settings-switch" onClick={() => update("instantNotifications", !preferences.instantNotifications)} disabled={!identity}><span /></button></div>
        </div>}
      </div>
    </div>
  </section>;
}
