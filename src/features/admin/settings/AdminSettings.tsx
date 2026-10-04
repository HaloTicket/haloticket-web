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
import { preferenceIdentity, useAdminPreferences, type AdminPreferences } from "@/utils/adminPreferences";

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
  return <div className="flex items-center justify-between py-3 border-b border-slate-200 dark:border-slate-800 last:border-0">
    <div className="pr-4"><h4 className="text-sm font-bold app-text-main">{label}</h4><p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p></div>
    <button type="button" role="switch" aria-label={label} aria-checked={checked} className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`} onClick={onChange} disabled={disabled}><span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-4' : 'translate-x-1'}`} /></button>
  </div>;
}

function BrowserScope({ copy, future = false }: { copy: Copy; future?: boolean }) {
  return <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">{future
    ? copy("Các lựa chọn này được lưu trên trình duyệt. Tính năng liên quan sẽ áp dụng khi quy trình hỗ trợ; nhật ký và cảnh báo bắt buộc trên máy chủ vẫn hoạt động.", "These choices are saved in this browser. Related workflows will apply them when supported; mandatory server logs and alerts continue to run.")
    : copy("Các lựa chọn này chỉ áp dụng trong trình duyệt này; không thay đổi dữ liệu hoặc quyền trên máy chủ.", "These choices apply only in this browser; they do not change server data or permissions.")}</p>;
}

function AppearanceSection({ copy }: { copy: Copy }) {
  const { theme, setTheme } = useTheme();
  const { i18n } = useTranslation();
  return <div className="space-y-6">
    <div className="mb-4">
      <h3 className="text-sm font-bold app-text-main">{copy("Chủ đề giao diện", "Theme")}</h3>
      <p className="text-xs text-slate-500 dark:text-slate-400">{copy("Chọn giao diện hiển thị phù hợp với môi trường làm việc của bạn.", "Choose the appearance that suits your workspace.")}</p>
    </div>
    <div className="grid grid-cols-3 gap-4" role="group" aria-label={copy("Chủ đề giao diện", "Theme")}>
      {(["light", "dark", "system"] as const).map((value) => {
        const Icon = value === "light" ? LuSun : value === "dark" ? LuMoon : LuMonitor;
        const label = value === "light" ? copy("Sáng", "Light") : value === "dark" ? copy("Tối", "Dark") : copy("Hệ thống", "System");
        const isSelected = theme === value;
        return <button key={value} type="button" className={`flex flex-col items-center justify-center p-5 rounded-lg shadow-xs border transition-all min-h-9 ${isSelected ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 ring-1 ring-blue-600/20" : "border-slate-200 dark:border-slate-800 app-text-main hover:border-blue-400 dark:hover:border-blue-500"}`} aria-pressed={isSelected} onClick={() => setTheme(value)}>
          <Icon className="w-7 h-7 mb-3" aria-hidden="true" />
          <span className="text-sm font-bold flex items-center gap-1.5">{label} {isSelected && <LuCheck className="w-4 h-4" aria-hidden="true" />}</span>
        </button>;
      })}
    </div>
    <div className="mb-4 mt-8">
      <h3 className="text-sm font-bold app-text-main">{copy("Ngôn ngữ hiển thị", "Display language")}</h3>
    </div>
    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
      <div>
        <h4 className="text-sm font-bold app-text-main">{copy("Ngôn ngữ giao diện", "Interface language")}</h4>
        <p className="text-xs text-slate-500 dark:text-slate-400">{copy("Chọn ngôn ngữ sử dụng trên bảng quản trị.", "Choose the language for the admin portal.")}</p>
      </div>
      <select aria-label={copy("Ngôn ngữ hiển thị", "Display language")} value={i18n.resolvedLanguage === "en" ? "en" : "vi"} onChange={(event) => void setLanguage(event.target.value === "en" ? "en" : "vi")} className="px-4 min-h-9 rounded-md border app-border bg-slate-100 dark:bg-slate-900 app-text-main text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer">
        <option value="vi">Tiếng Việt</option>
        <option value="en">English</option>
      </select>
    </div>
  </div>;
}

function PrivacySection({ copy, preferences, update, disabled }: PreferenceProps) {
  return <div className="space-y-6">
    <div className="mb-4">
      <h3 className="text-sm font-bold app-text-main flex items-center gap-2"><LuLock className="w-4 h-4" aria-hidden="true" />{copy("Quyền riêng tư & Nhật ký hệ thống", "Privacy and system logs")}</h3>
      <p className="text-xs text-slate-500 dark:text-slate-400">{copy("Quản lý cách hiển thị thông tin trong khu vực quản trị.", "Control how information appears in the admin portal.")}</p>
    </div>
    <BrowserScope copy={copy} future />
    <div className="bg-slate-50 dark:bg-slate-800/30 rounded-lg shadow-xs px-5 border app-border">
      <SwitchRow label={copy("Ghi nhật ký hoạt động quản trị", "Admin activity log")} description={copy("Bản xem trước tùy chọn nhật ký; nhật ký bắt buộc trên máy chủ luôn được ghi.", "Preview preference for activity logs; mandatory server logs are always recorded.")} checked={preferences.activityLogPreview} onChange={() => update("activityLogPreview", !preferences.activityLogPreview)} disabled={disabled} />
      <SwitchRow label={copy("Ẩn email cá nhân với người dùng", "Hide personal email from users")} description={copy("Che email trong menu tài khoản và trang cài đặt trên trình duyệt này; thông báo công khai chưa sử dụng tùy chọn này.", "Masks email in the account menu and settings on this browser; public messages do not yet use this choice.")} checked={preferences.hideEmail} onChange={() => update("hideEmail", !preferences.hideEmail)} disabled={disabled} />
    </div>
  </div>;
}

function NotificationsSection({ copy, preferences, update, disabled }: PreferenceProps) {
  return <div className="space-y-6">
    <div className="mb-4">
      <h3 className="text-sm font-bold app-text-main flex items-center gap-2"><LuBell className="w-4 h-4" aria-hidden="true" />{copy("Cài đặt thông báo quản trị", "Admin notifications")}</h3>
      <p className="text-xs text-slate-500 dark:text-slate-400">{copy("Chọn các sự kiện bạn muốn nhận thông báo tức thời.", "Choose the events for instant notifications.")}</p>
    </div>
    <BrowserScope copy={copy} future />
    <div className="bg-slate-50 dark:bg-slate-800/30 rounded-lg shadow-xs px-5 border app-border mb-6">
      <SwitchRow label={copy("Sự kiện mới cần kiểm duyệt", "Events awaiting review")} description={copy("Tùy chọn xem trước cho thông báo khi có sự kiện mới cần duyệt.", "Preview preference for new events awaiting review.")} checked={preferences.pendingEventNotifications} onChange={() => update("pendingEventNotifications", !preferences.pendingEventNotifications)} disabled={disabled} />
      <SwitchRow label={copy("Khiếu nại & Tranh chấp vé", "Complaints and ticket disputes")} description={copy("Tùy chọn xem trước cho khiếu nại và tranh chấp vé.", "Preview preference for complaints and ticket disputes.")} checked={preferences.disputeNotifications} onChange={() => update("disputeNotifications", !preferences.disputeNotifications)} disabled={disabled} />
      <SwitchRow label={copy("Cảnh báo lỗi hệ thống", "System error alerts")} description={copy("Tùy chọn xem trước; cảnh báo quan trọng vẫn hiển thị.", "Preview preference; critical alerts still appear.")} checked={preferences.systemAlertNotifications} onChange={() => update("systemAlertNotifications", !preferences.systemAlertNotifications)} disabled={disabled} />
    </div>
    <div className="bg-slate-50 dark:bg-slate-800/30 rounded-lg shadow-xs px-5 border app-border">
      <SwitchRow label={copy("Thông báo tức thời", "Instant notifications")} description={copy("Hiện thông báo nổi cho sự kiện mới. Lịch sử thông báo, lỗi và xác nhận thao tác vẫn hiển thị.", "Show background toasts for new events. Notification history, errors and action confirmations remain available.")} checked={preferences.instantNotifications} onChange={() => update("instantNotifications", !preferences.instantNotifications)} disabled={disabled} />
    </div>
  </div>;
}

function MessagesSection({ copy, preferences, update, disabled }: PreferenceProps) {
  return <div className="space-y-6">
    <div className="mb-4">
      <h3 className="text-sm font-bold app-text-main flex items-center gap-2"><LuMessageSquare className="w-4 h-4" aria-hidden="true" />{copy("Tin nhắn & Soạn thảo", "Messages and composing")}</h3>
    </div>
    <BrowserScope copy={copy} future />
    <div className="bg-slate-50 dark:bg-slate-800/30 rounded-lg shadow-xs px-5 border app-border">
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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-8">
        <aside className="w-full md:w-64 lg:w-72 shrink-0 space-y-4">
          <h2 className="text-lg font-bold app-text-main px-1">{copy("Cài đặt hệ thống", "System Settings")}</h2>
          <nav className="space-y-1" aria-label={copy("Mục cài đặt", "Settings sections")}>
            {sections.map((item) => (
              <NavLink
                key={item.id}
                to={PATHS.ADMIN_SETTINGS_SECTION(item.id)}
                className={({ isActive }) => `flex items-center gap-3 min-h-9 px-3 py-2 rounded-md text-sm font-medium transition-all ${isActive ? 'bg-blue-600 text-white shadow-xs font-bold' : 'app-text-muted hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:app-text-main'}`}
                aria-current={active === item.id ? "page" : undefined}
              >
                <item.icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{copy(item.vi, item.en)}</span>
              </NavLink>
            ))}
          </nav>
        </aside>
        
        <main className="flex-1 min-w-0 border app-border rounded-lg shadow-xs app-bg-card p-6">
          <h1 className="text-xl font-extrabold app-text-main border-b border-slate-200 dark:border-slate-800 pb-4 mb-6">{copy(heading.vi, heading.en)}</h1>
          {error && (
            <p role="alert" className="mb-6 p-3 rounded-md bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-sm font-medium border border-rose-200 dark:border-rose-800">
              {en
                ? error.startsWith("Cài đặt đã")
                  ? "Saved settings are invalid. Defaults are in use; choose again to save."
                  : "This browser could not save settings. Check storage permissions and try again."
                : error}
            </p>
          )}
          
          <div className="w-full">
            {active === "profile" && <ProfileSettingsSection profile={profile} hideEmail={preferences.hideEmail} />}
            {active === "account-security" && <AccountSecuritySettingsSection />}
            {active === "appearance" && <AppearanceSection copy={copy} />}
            {active === "privacy" && <PrivacySection {...preferenceProps} />}
            {active === "notifications" && <NotificationsSection {...preferenceProps} />}
            {active === "messages" && <MessagesSection {...preferenceProps} />}
          </div>
        </main>
      </div>
    </div>
  );
}
