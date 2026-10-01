import { useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FiChevronsLeft, FiChevronsRight, FiMenu, FiMoon, FiSearch, FiSun } from "react-icons/fi";
import {
  LuArrowRight,
  LuChevronDown,
  LuChevronRight,
  LuChevronUp,
  LuLayoutGrid,
  LuLogOut,
  LuSettings,
  LuShieldCheck,
  LuTag,
  LuTicket,
  LuUserCheck,
  LuUsers,
} from "react-icons/lu";
import { useTranslation } from "react-i18next";

import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";
import { NotificationDropdown } from "@/components/notifications/NotificationDropdown";
import { preferenceIdentity, useAdminPreferences } from "@/features/admin/settings/adminPreferences";
import { PATHS } from "@/routes/paths";
import type { NotificationItem, UserProfile } from "@/types";

interface AdminHeaderProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
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

export function AdminHeader({ collapsed, onToggleCollapse, isDark, toggleTheme, userProfile, notifications, unreadCount, showProfileMenu, onToggleProfileMenu, onCloseProfileMenu, onMobileOpen, mobileMenuButtonRef, onMarkAllAsRead, onNotificationClick, onLogout }: AdminHeaderProps) {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const profileRef = useRef<HTMLDivElement>(null);
  const label = (vi: string, en: string) => t(vi, { defaultValue: i18n.language.startsWith("en") ? en : vi });
  const { preferences } = useAdminPreferences(preferenceIdentity(userProfile));
  const safeName = userProfile?.fullName && (!preferences.hideEmail || !userProfile.fullName.includes("@")) ? userProfile.fullName : label("Tài khoản", "Account");
  const userInitial = (safeName[0] || "A").toUpperCase();
  const onApprovalPage = pathname === PATHS.ADMIN_EVENTS_APPROVAL;
  const searchValue = onApprovalPage ? new URLSearchParams(search).get("q") ?? "" : "";

  useEffect(() => {
    if (!showProfileMenu) return;
    const closeOutside = (event: MouseEvent) => { if (!profileRef.current?.contains(event.target as Node)) onCloseProfileMenu(); };
    const closeEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onCloseProfileMenu(); };
    document.addEventListener("mousedown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    return () => { document.removeEventListener("mousedown", closeOutside); document.removeEventListener("keydown", closeEscape); };
  }, [showProfileMenu, onCloseProfileMenu]);

  return <header className="admin-header">
    <div className="admin-header-leading">
      <button type="button" className="admin-sidebar-toggle admin-icon-button" aria-label={collapsed ? label("Mở rộng thanh bên", "Expand sidebar") : label("Thu gọn thanh bên", "Collapse sidebar")} title={collapsed ? label("Mở rộng thanh bên", "Expand sidebar") : label("Thu gọn thanh bên", "Collapse sidebar")} aria-expanded={!collapsed} onClick={onToggleCollapse}>{collapsed ? <FiChevronsRight /> : <FiChevronsLeft />}</button>
      <button ref={mobileMenuButtonRef} type="button" className="admin-mobile-menu admin-icon-button" aria-label={label("Mở menu", "Open menu")} onClick={onMobileOpen}><FiMenu /></button>
      <form role="search" className="admin-header-search" key={`${pathname}${search}`} onSubmit={(event) => {
        event.preventDefault();
        const input = event.currentTarget.elements.namedItem("admin-event-search") as HTMLInputElement;
        const params = onApprovalPage ? new URLSearchParams(search) : new URLSearchParams();
        const query = input.value.trim();
        if (!onApprovalPage && query) params.set("status", "ALL");
        if (query) params.set("q", query); else params.delete("q");
        params.delete("page");
        navigate(`${PATHS.ADMIN_EVENTS_APPROVAL}${params.size ? `?${params}` : ""}`);
      }}>
        <FiSearch aria-hidden="true" />
        <input type="search" name="admin-event-search" defaultValue={searchValue} aria-label={label("Tìm sự kiện cần kiểm duyệt", "Search events for moderation")} placeholder={label("Tìm sự kiện cần kiểm duyệt...", "Search events for moderation...")} />
      </form>
    </div>
    <div className="admin-header-actions">
      <LanguageSwitcher />
      <button type="button" className="admin-icon-button" onClick={toggleTheme} aria-label={isDark ? label("Chuyển sang Chế độ Sáng", "Switch to light mode") : label("Chuyển sang Chế độ Tối", "Switch to dark mode")} title={isDark ? label("Chuyển sang Chế độ Sáng", "Switch to light mode") : label("Chuyển sang Chế độ Tối", "Switch to dark mode")}>{isDark ? <FiSun /> : <FiMoon />}</button>
      <div className="admin-notifications"><NotificationDropdown notifications={notifications} unreadCount={unreadCount} onMarkAllAsRead={onMarkAllAsRead} onNotificationClick={onNotificationClick} viewAllLink={PATHS.ADMIN_EVENTS_APPROVAL} viewAllText={label("Xem trang Kiểm duyệt Sự kiện →", "View event moderation →")} titleText={label("Thông báo hệ thống", "System notifications")} /></div>
      <div className="admin-profile" ref={profileRef}>
        <button
          type="button"
          className="admin-profile-trigger"
          onClick={onToggleProfileMenu}
          aria-expanded={showProfileMenu}
          aria-haspopup="menu"
          aria-label={label("Tài khoản quản trị", "Admin account")}
        >
          <div className="admin-profile-avatar-wrap">
            <span className="admin-profile-avatar">{userInitial}</span>
            <span className="admin-profile-status-dot" aria-hidden="true" />
          </div>
          <span className="admin-profile-name">{safeName}</span>
          {showProfileMenu ? (
            <LuChevronUp className="admin-profile-chevron" aria-hidden="true" />
          ) : (
            <LuChevronDown className="admin-profile-chevron" aria-hidden="true" />
          )}
        </button>

        {showProfileMenu && (
          <div className="admin-profile-menu" role="menu">
            {/* Top Admin Info Card */}
            <div className="admin-profile-badge-card">
              <div className="admin-profile-badge-left">
                <LuShieldCheck className="admin-profile-badge-icon" />
                <span className="admin-profile-badge-text">
                  {label("QUẢN TRỊ VIÊN", "ADMINISTRATOR")}
                </span>
              </div>
              <Link
                to={PATHS.ADMIN_SETTINGS_SECTION("profile")}
                onClick={onCloseProfileMenu}
                className="admin-profile-badge-link"
              >
                <span>{label("Hồ sơ", "Profile")}</span>
                <LuArrowRight className="admin-profile-badge-arrow" />
              </Link>
            </div>

            {/* Menu Navigation Links */}
            <nav className="admin-profile-nav">
              <Link
                to={PATHS.ADMIN_DASHBOARD}
                onClick={onCloseProfileMenu}
                className="admin-profile-nav-item"
              >
                <div className="admin-profile-nav-item-left">
                  <LuLayoutGrid className="admin-profile-nav-icon" />
                  <span>{label("Bảng điều khiển", "Dashboard")}</span>
                </div>
                <LuChevronRight className="admin-profile-item-arrow" />
              </Link>

              <div className="admin-profile-section-title">
                {label("TIỆN ÍCH QUẢN TRỊ", "ADMIN UTILITIES")}
              </div>

              <Link
                to={PATHS.ADMIN_EVENTS_APPROVAL}
                onClick={onCloseProfileMenu}
                className="admin-profile-nav-item"
              >
                <div className="admin-profile-nav-item-left">
                  <LuTicket className="admin-profile-nav-icon" />
                  <span>{label("Kiểm duyệt sự kiện", "Events approval")}</span>
                </div>
                <LuChevronRight className="admin-profile-item-arrow" />
              </Link>

              <Link
                to={PATHS.ADMIN_EKYC_APPROVAL}
                onClick={onCloseProfileMenu}
                className="admin-profile-nav-item"
              >
                <div className="admin-profile-nav-item-left">
                  <LuUserCheck className="admin-profile-nav-icon" />
                  <span>{label("Duyệt hồ sơ eKYC", "eKYC approval")}</span>
                </div>
                <LuChevronRight className="admin-profile-item-arrow" />
              </Link>

              <Link
                to={PATHS.ADMIN_RESALE_PRICE_CAP}
                onClick={onCloseProfileMenu}
                className="admin-profile-nav-item"
              >
                <div className="admin-profile-nav-item-left">
                  <LuTag className="admin-profile-nav-icon" />
                  <span>{label("Quản lý vé bán lại", "Resale price cap")}</span>
                </div>
                <LuChevronRight className="admin-profile-item-arrow" />
              </Link>

              <Link
                to={PATHS.ADMIN_USERS_PERMISSIONS}
                onClick={onCloseProfileMenu}
                className="admin-profile-nav-item"
              >
                <div className="admin-profile-nav-item-left">
                  <LuUsers className="admin-profile-nav-icon" />
                  <span>{label("Người dùng & phân quyền", "Users & permissions")}</span>
                </div>
                <LuChevronRight className="admin-profile-item-arrow" />
              </Link>

              <div className="admin-profile-divider" />

              <Link
                to={PATHS.ADMIN_SETTINGS_SECTION("profile")}
                onClick={onCloseProfileMenu}
                className="admin-profile-nav-item"
              >
                <div className="admin-profile-nav-item-left">
                  <LuSettings className="admin-profile-nav-icon" />
                  <span>{label("Cài đặt", "Settings")}</span>
                </div>
                <LuChevronRight className="admin-profile-item-arrow" />
              </Link>

              <button
                type="button"
                onClick={() => {
                  onCloseProfileMenu();
                  onLogout();
                }}
                className="admin-profile-nav-item admin-profile-nav-logout"
              >
                <div className="admin-profile-nav-item-left">
                  <LuLogOut className="admin-profile-nav-icon text-rose-500" />
                  <span>{label("Đăng xuất", "Log out")}</span>
                </div>
                <LuChevronRight className="admin-profile-item-arrow" />
              </button>
            </nav>
          </div>
        )}
      </div>
    </div>
  </header>;
}
