import { useEffect, useState } from "react";
import {
  LuBell,
  LuCheck,
  LuLock,
  LuMessageSquare,
  LuMonitor,
  LuMoon,
  LuPaintbrush,
  LuShield,
  LuSun,
  LuUser,
} from "react-icons/lu";
import { Navigate, NavLink, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { useTheme } from "@/hooks/useTheme";
import { setLanguage } from "@/i18n";
import { PATHS } from "@/routes/paths";
import { getCachedUserProfile } from "@/services/userApi";
import type { UserProfile } from "@/types";
import AccountSecuritySettingsSection from "./AccountSecuritySettingsSection";
import ProfileSettingsSection from "./ProfileSettingsSection";
import { preferenceIdentity, useAdminPreferences, type AdminPreferences } from "./adminPreferences";
import "./adminSettings.css";

const sections = [
  { id: "profile", icon: LuUser, vi: "Thông tin cá nhân", en: "Personal information" },
  { id: "account-security", icon: LuShield, vi: "Tài khoản và bảo mật", en: "Account and security" },
  { id: "appearance", icon: LuPaintbrush, vi: "Giao diện", en: "Appearance" },
  { id: "privacy", icon: LuLock, vi: "Quyền riêng tư", en: "Privacy" },
  { id: "notifications", icon: LuBell, vi: "Thông báo", en: "Notifications" },
  { id: "messages", icon: LuMessageSquare, vi: "Tin nhắn", en: "Messages" },
] as const;

type Section = typeof sections[number]["id"];
type Copy = (vi: string, en: string) => string;
type PreferenceProps = {
  copy: Copy;
  preferences: AdminPreferences;
  update: (key: keyof AdminPreferences, value: boolean) => void;
  disabled: boolean;
};

function SwitchRow({ label, description, checked, onChange, disabled }: {
  label: string; description: string; checked: boolean; onChange: () => void; disabled: boolean;
}) {
  return <div className="admin-settings-row">
    <div><h4>{label}</h4><p>{description}</p></div>
    <button type="button" role="switch" aria-label={label} aria-checked={checked} className="admin-settings-switch" onClick={onChange} disabled={disabled}><span /></button>
  </div>;
}

function BrowserScope({ copy, future = false }: { copy: Copy; future?: boolean }) {
  return <p className="admin-settings-scope">{future
    ? copy("Các lựa chọn này được lưu trên trình duyệt. Tính năng liên quan sẽ áp dụng khi quy trình hỗ trợ; nhật ký và cảnh báo bắt buộc trên máy chủ vẫn hoạt động.", "These choices are saved in this browser. Related workflows will apply them when supported; mandatory server logs and alerts continue to run.")
    : copy("Các lựa chọn này chỉ áp dụng trong trình duyệt này; không thay đổi dữ liệu hoặc quyền trên máy chủ.", "These choices apply only in this browser; they do not change server data or permissions.")}</p>;
}

function AppearanceSection({ copy }: { copy: Copy }) {
  const { theme, setTheme } = useTheme();
  const { i18n } = useTranslation();
  return <div className="admin-settings-stack">
    <div className="admin-settings-block-heading"><h3>{copy("Chủ đề giao diện", "Theme")}</h3><p>{copy("Chọn giao diện hiển thị phù hợp với môi trường làm việc của bạn.", "Choose the appearance that suits your workspace.")}</p></div>
    <div className="admin-settings-themes" role="group" aria-label={copy("Chủ đề giao diện", "Theme")}>
      {(["light", "dark", "system"] as const).map((value) => {
        const Icon = value === "light" ? LuSun : value === "dark" ? LuMoon : LuMonitor;
        const label = value === "light" ? copy("Sáng", "Light") : value === "dark" ? copy("Tối", "Dark") : copy("Hệ thống", "System");
        return <button key={value} type="button" className={`admin-settings-theme admin-settings-theme-${value}${theme === value ? " is-selected" : ""}`} aria-pressed={theme === value} onClick={() => setTheme(value)}>
          <span className="admin-settings-theme-preview" aria-hidden="true"><i /><i /><i /></span>
          <span className="admin-settings-theme-label"><Icon aria-hidden="true" />{label}<span className="admin-settings-theme-check">{theme === value && <LuCheck aria-hidden="true" />}</span></span>
        </button>;
      })}
    </div>
    <div className="admin-settings-block-heading"><h3>{copy("Ngôn ngữ hiển thị", "Display language")}</h3></div>
    <div className="admin-settings-card admin-settings-language"><div><h4>{copy("Ngôn ngữ giao diện", "Interface language")}</h4><p>{copy("Chọn ngôn ngữ sử dụng trên bảng quản trị.", "Choose the language for the admin portal.")}</p></div><select aria-label={copy("Ngôn ngữ hiển thị", "Display language")} value={i18n.resolvedLanguage === "en" ? "en" : "vi"} onChange={(event) => void setLanguage(event.target.value === "en" ? "en" : "vi")}><option value="vi">Tiếng Việt</option><option value="en">English</option></select></div>
  </div>;
}

function PrivacySection({ copy, preferences, update, disabled }: PreferenceProps) {
  return <div className="admin-settings-stack">
    <div className="admin-settings-block-heading"><h3><LuLock aria-hidden="true" />{copy("Quyền riêng tư & Nhật ký hệ thống", "Privacy and system logs")}</h3><p>{copy("Quản lý cách hiển thị thông tin trong khu vực quản trị.", "Control how information appears in the admin portal.")}</p></div>
    <BrowserScope copy={copy} future />
    <div className="admin-settings-card">
      <SwitchRow label={copy("Ghi nhật ký hoạt động quản trị", "Admin activity log")} description={copy("Bản xem trước tùy chọn nhật ký; nhật ký bắt buộc trên máy chủ luôn được ghi.", "Preview preference for activity logs; mandatory server logs are always recorded.")} checked={preferences.activityLogPreview} onChange={() => update("activityLogPreview", !preferences.activityLogPreview)} disabled={disabled} />
      <SwitchRow label={copy("Ẩn email cá nhân với người dùng", "Hide personal email from users")} description={copy("Che email trong menu tài khoản và trang cài đặt trên trình duyệt này; thông báo công khai chưa sử dụng tùy chọn này.", "Masks email in the account menu and settings on this browser; public messages do not yet use this choice.")} checked={preferences.hideEmail} onChange={() => update("hideEmail", !preferences.hideEmail)} disabled={disabled} />
    </div>
  </div>;
}

function NotificationsSection({ copy, preferences, update, disabled }: PreferenceProps) {
  return <div className="admin-settings-stack">
    <div className="admin-settings-block-heading"><h3><LuBell aria-hidden="true" />{copy("Cài đặt thông báo quản trị", "Admin notifications")}</h3><p>{copy("Chọn các sự kiện bạn muốn nhận thông báo tức thời.", "Choose the events for instant notifications.")}</p></div>
    <BrowserScope copy={copy} future />
    <div className="admin-settings-card">
      <SwitchRow label={copy("Sự kiện mới cần kiểm duyệt", "Events awaiting review")} description={copy("Tùy chọn xem trước cho thông báo khi có sự kiện mới cần duyệt.", "Preview preference for new events awaiting review.")} checked={preferences.pendingEventNotifications} onChange={() => update("pendingEventNotifications", !preferences.pendingEventNotifications)} disabled={disabled} />
      <SwitchRow label={copy("Khiếu nại & Tranh chấp vé", "Complaints and ticket disputes")} description={copy("Tùy chọn xem trước cho khiếu nại và tranh chấp vé.", "Preview preference for complaints and ticket disputes.")} checked={preferences.disputeNotifications} onChange={() => update("disputeNotifications", !preferences.disputeNotifications)} disabled={disabled} />
      <SwitchRow label={copy("Cảnh báo lỗi hệ thống", "System error alerts")} description={copy("Tùy chọn xem trước; cảnh báo quan trọng vẫn hiển thị.", "Preview preference; critical alerts still appear.")} checked={preferences.systemAlertNotifications} onChange={() => update("systemAlertNotifications", !preferences.systemAlertNotifications)} disabled={disabled} />
    </div>
    <div className="admin-settings-card">
      <SwitchRow label={copy("Thông báo tức thời", "Instant notifications")} description={copy("Hiện thông báo nổi cho sự kiện mới. Lịch sử thông báo, lỗi và xác nhận thao tác vẫn hiển thị.", "Show background toasts for new events. Notification history, errors and action confirmations remain available.")} checked={preferences.instantNotifications} onChange={() => update("instantNotifications", !preferences.instantNotifications)} disabled={disabled} />
    </div>
  </div>;
}

function MessagesSection({ copy, preferences, update, disabled }: PreferenceProps) {
  return <div className="admin-settings-stack admin-settings-messages">
    <div className="admin-settings-block-heading"><h3><LuMessageSquare aria-hidden="true" />{copy("Tin nhắn & Soạn thảo", "Messages and composing")}</h3></div>
    <BrowserScope copy={copy} future />
    <div className="admin-settings-card">
      <SwitchRow label={copy("Tự động kiểm tra chính tả khi soạn thảo", "Check spelling while composing")} description={copy("Tùy chọn xem trước cho trình soạn thảo tin nhắn.", "Preview preference for a future message composer.")} checked={preferences.spellCheck} onChange={() => update("spellCheck", !preferences.spellCheck)} disabled={disabled} />
      <SwitchRow label={copy("Tối ưu dung lượng hình ảnh khi gửi", "Optimize images before sending")} description={copy("Tùy chọn xem trước cho hình ảnh đính kèm tin nhắn.", "Preview preference for message image attachments.")} checked={preferences.compressImages} onChange={() => update("compressImages", !preferences.compressImages)} disabled={disabled} />
      <SwitchRow label={copy("Tự động trả lời khi vắng mặt", "Automatic away reply")} description={copy("Tùy chọn xem trước; tin nhắn tự động chưa được gửi.", "Preview preference; automatic replies are not sent yet.")} checked={preferences.autoReply} onChange={() => update("autoReply", !preferences.autoReply)} disabled={disabled} />
    </div>
  </div>;
}

export default function AdminSettings() {
  const { section } = useParams<{ section: string }>();
  const { i18n } = useTranslation();
  const en = i18n.resolvedLanguage === "en";
  const copy: Copy = (vi, english) => en ? english : vi;
  const [profile, setProfile] = useState<UserProfile | null>(getCachedUserProfile);
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

  if (!sections.some((item) => item.id === section)) return <Navigate to={PATHS.ADMIN_SETTINGS_SECTION("profile")} replace />;
  const active = section as Section;
  const heading = sections.find((item) => item.id === active)!;
  const preferenceProps = { copy, preferences, update, disabled: !identity };

  return (
    <div className="admin-settings-container">
      <section className="admin-settings">
        <div className="admin-settings-shell">
          <aside className="admin-settings-nav">
            <h2>{copy("Cài đặt", "Settings")}</h2>
            <nav aria-label={copy("Mục cài đặt", "Settings sections")}>
              {sections.map((item) => (
                <NavLink
                  key={item.id}
                  to={PATHS.ADMIN_SETTINGS_SECTION(item.id)}
                  className={({ isActive }) => (isActive ? "is-active" : "")}
                  aria-current={active === item.id ? "page" : undefined}
                >
                  <item.icon aria-hidden="true" />
                  <span>{copy(item.vi, item.en)}</span>
                </NavLink>
              ))}
            </nav>
          </aside>
          <main className="admin-settings-content">
            <h1 className="admin-settings-content-title">{copy(heading.vi, heading.en)}</h1>
            {error && (
              <p role="alert" className="admin-settings-error">
                {en
                  ? error.startsWith("Cài đặt đã")
                    ? "Saved settings are invalid. Defaults are in use; choose again to save."
                    : "This browser could not save settings. Check storage permissions and try again."
                  : error}
              </p>
            )}
            {active === "profile" && <ProfileSettingsSection profile={profile} hideEmail={preferences.hideEmail} />}
            {active === "account-security" && <AccountSecuritySettingsSection />}
            {active === "appearance" && <AppearanceSection copy={copy} />}
            {active === "privacy" && <PrivacySection {...preferenceProps} />}
            {active === "notifications" && <NotificationsSection {...preferenceProps} />}
            {active === "messages" && <MessagesSection {...preferenceProps} />}
          </main>
        </div>
      </section>
    </div>
  );
}
