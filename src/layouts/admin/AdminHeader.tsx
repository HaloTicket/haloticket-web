import { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { FiLogOut, FiMenu, FiMoon, FiSettings, FiSun, FiUserCheck } from "react-icons/fi";
import { useTranslation } from "react-i18next";

import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";
import { NotificationDropdown } from "@/components/notifications/NotificationDropdown";
import { PATHS } from "@/routes/paths";
import type { NotificationItem, UserProfile } from "@/types";
import { AdminBreadcrumb } from "./AdminBreadcrumb";
import { resolveAdminNavigation } from "./adminNavigation";

interface AdminHeaderProps {
  isDark: boolean;
  toggleTheme: () => void;
  userProfile: UserProfile | null;
  notifications: NotificationItem[];
  unreadCount: number;
  showProfileMenu: boolean;
  onToggleProfileMenu: () => void;
  onCloseProfileMenu: () => void;
  onMobileOpen: () => void;
  mobileMenuButtonRef: React.RefObject<HTMLButtonElement | null>;
  onMarkAllAsRead: () => Promise<void> | void;
  onNotificationClick: (item: NotificationItem) => void;
  onLogout: () => void;
}

export function AdminHeader({ isDark, toggleTheme, userProfile, notifications, unreadCount, showProfileMenu, onToggleProfileMenu, onCloseProfileMenu, onMobileOpen, mobileMenuButtonRef, onMarkAllAsRead, onNotificationClick, onLogout }: AdminHeaderProps) {
  const { pathname } = useLocation();
  const { t, i18n } = useTranslation();
  const profileRef = useRef<HTMLDivElement>(null);
  const label = (vi: string, en: string) => t(vi, { defaultValue: i18n.language.startsWith("en") ? en : vi });
  const route = resolveAdminNavigation(pathname);
  const title = route?.eventId ? label("Chi tiết sự kiện", "Event detail") : route ? label(route.item.label, route.item.english) : label("Không tìm thấy trang", "Page not found");
  const userInitial = (userProfile?.fullName?.[0] || userProfile?.email?.[0] || "A").toUpperCase();

  useEffect(() => {
    if (!showProfileMenu) return;
    const closeOutside = (event: MouseEvent) => { if (!profileRef.current?.contains(event.target as Node)) onCloseProfileMenu(); };
    const closeEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onCloseProfileMenu(); };
    document.addEventListener("mousedown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    return () => { document.removeEventListener("mousedown", closeOutside); document.removeEventListener("keydown", closeEscape); };
  }, [showProfileMenu, onCloseProfileMenu]);

  return <header className="admin-header">
    <div className="admin-header-heading">
      <button ref={mobileMenuButtonRef} type="button" className="admin-mobile-menu admin-icon-button" aria-label={label("Mở menu", "Open menu")} onClick={onMobileOpen}><FiMenu /></button>
      <div className="admin-header-title-block"><AdminBreadcrumb /><h1>{title}</h1></div>
    </div>
    <div className="admin-header-actions">
      <LanguageSwitcher />
      <button type="button" className="admin-icon-button" onClick={toggleTheme} aria-label={isDark ? label("Chuyển sang Chế độ Sáng", "Switch to light mode") : label("Chuyển sang Chế độ Tối", "Switch to dark mode")} title={isDark ? label("Chuyển sang Chế độ Sáng", "Switch to light mode") : label("Chuyển sang Chế độ Tối", "Switch to dark mode")}>{isDark ? <FiSun /> : <FiMoon />}</button>
      <NotificationDropdown notifications={notifications} unreadCount={unreadCount} onMarkAllAsRead={onMarkAllAsRead} onNotificationClick={onNotificationClick} viewAllLink={PATHS.ADMIN_EVENTS_APPROVAL} viewAllText={label("Xem trang Kiểm duyệt Sự kiện →", "View event moderation →")} titleText={label("Thông báo hệ thống", "System notifications")} />
      <div className="admin-profile" ref={profileRef}>
        <button type="button" className="admin-profile-trigger" onClick={onToggleProfileMenu} aria-expanded={showProfileMenu} aria-haspopup="menu" aria-label={label("Tài khoản quản trị", "Admin account")}>
          <span className="admin-profile-avatar">{userInitial}</span><span className="admin-profile-name">{userProfile?.fullName || userProfile?.email || label("Tài khoản", "Account")}</span>
        </button>
        {showProfileMenu && <div className="admin-profile-menu" role="menu">
          <div className="admin-profile-summary"><strong>{userProfile?.fullName || label("Tài khoản", "Account")}</strong><small>{userProfile?.email || ""}</small></div>
          <Link role="menuitem" to={PATHS.ADMIN_USERS_PERMISSIONS} onClick={onCloseProfileMenu}><FiUserCheck />{label("Quản lý phân quyền", "Manage permissions")}</Link>
          <Link role="menuitem" to={PATHS.ADMIN_CATEGORIES_CONFIG} onClick={onCloseProfileMenu}><FiSettings />{label("Cấu hình hệ thống", "System settings")}</Link>
          <button role="menuitem" type="button" onClick={onLogout}><FiLogOut />{label("Đăng xuất Quản trị", "Sign out")}</button>
        </div>}
      </div>
    </div>
  </header>;
}
