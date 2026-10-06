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
import { preferenceIdentity, useAdminPreferences } from "@/utils/adminPreferences";
import { PATHS } from "@/routes/paths";
import { resolveAdminNavigation } from "@/features/admin/components/AdminSidebar";
import type { NotificationItem, UserProfile } from "@/types";

interface AdminHeaderProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  isDark: boolean;
  toggleTheme: () => void;
  userProfile: UserProfile | null;
  notifications: NotificationItem[];
  unreadCount: number;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  showProfileMenu: boolean;
  onToggleProfileMenu: () => void;
  onCloseProfileMenu: () => void;
  onMobileOpen: () => void;
  mobileMenuButtonRef: React.RefObject<HTMLButtonElement | null>;
  onMarkAllAsRead: () => Promise<void> | void;
  onNotificationClick: (item: NotificationItem) => void;
  onLogout: () => void;
}

export function AdminHeader({ collapsed, onToggleCollapse, isDark, toggleTheme, userProfile, notifications, unreadCount, loading, error, onRetry, showProfileMenu, onToggleProfileMenu, onCloseProfileMenu, onMobileOpen, mobileMenuButtonRef, onMarkAllAsRead, onNotificationClick, onLogout }: AdminHeaderProps) {
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
  const activeNavigation = resolveAdminNavigation(pathname);

  useEffect(() => {
    if (!showProfileMenu) return;
    const closeOutside = (event: MouseEvent) => { if (!profileRef.current?.contains(event.target as Node)) onCloseProfileMenu(); };
    const closeEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onCloseProfileMenu(); };
    document.addEventListener("mousedown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    return () => { document.removeEventListener("mousedown", closeOutside); document.removeEventListener("keydown", closeEscape); };
  }, [showProfileMenu, onCloseProfileMenu]);

  return <header className="sticky top-0 z-30 flex items-center justify-between h-[68px] px-6 app-bg-card border-b app-border shadow-sm">
    <div className="flex items-center gap-4">
      <button type="button" className="hidden lg:flex items-center justify-center w-10 h-10 rounded-full app-text-muted hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" aria-label={collapsed ? label("Mở rộng thanh bên", "Expand sidebar") : label("Thu gọn thanh bên", "Collapse sidebar")} title={collapsed ? label("Mở rộng thanh bên", "Expand sidebar") : label("Thu gọn thanh bên", "Collapse sidebar")} aria-expanded={!collapsed} onClick={onToggleCollapse}>{collapsed ? <FiChevronsRight size={20} /> : <FiChevronsLeft size={20} />}</button>
      <button ref={mobileMenuButtonRef} type="button" className="flex lg:hidden items-center justify-center w-10 h-10 rounded-full app-text-muted hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" aria-label={label("Mở menu", "Open menu")} onClick={onMobileOpen}><FiMenu size={20} /></button>
      
      {activeNavigation && (
        <h1 className="hidden md:block text-base lg:text-lg font-black app-text-main truncate max-w-[200px] lg:max-w-[400px]">
          {label(activeNavigation.item.label, activeNavigation.item.english)}
        </h1>
      )}
      <form role="search" className="relative hidden md:flex items-center max-w-[320px] w-full bg-slate-100 dark:bg-slate-800/50 rounded-full px-4 h-10 app-text-muted focus-within:ring-2 focus-within:ring-primary transition-all" key={`${pathname}${search}`} onSubmit={(event) => {
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
        <input type="search" name="admin-event-search" defaultValue={searchValue} aria-label={label("Tìm sự kiện cần kiểm duyệt", "Search events for moderation")} placeholder={label("Tìm sự kiện cần kiểm duyệt...", "Search events for moderation...")} className="bg-transparent border-none outline-none w-full ml-2 text-sm app-text-main placeholder:app-text-muted" />
      </form>
    </div>
    <div className="flex items-center gap-3">
      <LanguageSwitcher />
      <button type="button" className="flex items-center justify-center w-10 h-10 rounded-full app-text-muted hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={toggleTheme} aria-label={isDark ? label("Chuyển sang Chế độ Sáng", "Switch to light mode") : label("Chuyển sang Chế độ Tối", "Switch to dark mode")} title={isDark ? label("Chuyển sang Chế độ Sáng", "Switch to light mode") : label("Chuyển sang Chế độ Tối", "Switch to dark mode")}>{isDark ? <FiSun size={20} /> : <FiMoon size={20} />}</button>
      <div className="relative z-50"><NotificationDropdown notifications={notifications} unreadCount={unreadCount} onMarkAllAsRead={onMarkAllAsRead} onNotificationClick={onNotificationClick} loading={loading} error={error} onRetry={onRetry} viewAllLink={PATHS.ADMIN_NOTIFICATIONS} viewAllText={label("Xem tất cả thông báo", "View all notifications")} titleText={label("Thông báo hệ thống", "System notifications")} /></div>
      <div className="relative" ref={profileRef}>
        <button
          type="button"
          className="flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 rounded-full pr-3 transition-colors"
          onClick={onToggleProfileMenu}
          aria-expanded={showProfileMenu}
          aria-haspopup="menu"
          aria-label={label("Tài khoản quản trị", "Admin account")}
        >
          <div className="relative">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-sm">{userInitial}</span>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 border-2 app-border-card" aria-hidden="true" />
          </div>
          <span className="hidden md:block text-sm font-semibold app-text-main max-w-[120px] truncate">{safeName}</span>
          {showProfileMenu ? (
            <LuChevronUp className="hidden md:block app-text-muted w-4 h-4" aria-hidden="true" />
          ) : (
            <LuChevronDown className="hidden md:block app-text-muted w-4 h-4" aria-hidden="true" />
          )}
        </button>

        {showProfileMenu && (
          <div className="absolute right-0 top-full mt-2 w-64 app-bg-card rounded-xl shadow-lg border app-border p-2 z-50 animate-in fade-in zoom-in duration-200" role="menu">
            {/* Top Admin Info Card */}
            <div className="flex items-center justify-between bg-blue-600/10 rounded-lg p-3 mb-2">
              <div className="flex items-center gap-2 text-blue-600 font-bold text-xs">
                <LuShieldCheck size={16} />
                <span>
                  {label("QUẢN TRỊ VIÊN", "ADMINISTRATOR")}
                </span>
              </div>
              <Link
                to={PATHS.ADMIN_SETTINGS_SECTION("profile")}
                onClick={onCloseProfileMenu}
                className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
              >
                <span>{label("Hồ sơ", "Profile")}</span>
                <LuArrowRight size={14} />
              </Link>
            </div>

            {/* Menu Navigation Links */}
            <nav className="flex flex-col gap-1">
              <Link
                to={PATHS.ADMIN_DASHBOARD}
                onClick={onCloseProfileMenu}
                className="group flex items-center justify-between w-full p-2.5 rounded-lg text-sm app-text-main hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <LuLayoutGrid size={18} className="app-text-muted" />
                  <span>{label("Bảng điều khiển", "Dashboard")}</span>
                </div>
                <LuChevronRight className="w-4 h-4 app-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>

              <div className="px-2 pt-2 pb-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                {label("TIỆN ÍCH QUẢN TRỊ", "ADMIN UTILITIES")}
              </div>

              <Link
                to={PATHS.ADMIN_EVENTS_APPROVAL}
                onClick={onCloseProfileMenu}
                className="group flex items-center justify-between w-full p-2.5 rounded-lg text-sm app-text-main hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <LuTicket size={18} className="app-text-muted" />
                  <span>{label("Kiểm duyệt sự kiện", "Events approval")}</span>
                </div>
                <LuChevronRight className="w-4 h-4 app-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>

              <Link
                to={PATHS.ADMIN_EKYC_APPROVAL}
                onClick={onCloseProfileMenu}
                className="group flex items-center justify-between w-full p-2.5 rounded-lg text-sm app-text-main hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <LuUserCheck size={18} className="app-text-muted" />
                  <span>{label("Duyệt hồ sơ eKYC", "eKYC approval")}</span>
                </div>
                <LuChevronRight className="w-4 h-4 app-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>

              <Link
                to={PATHS.ADMIN_RESALE_PRICE_CAP}
                onClick={onCloseProfileMenu}
                className="group flex items-center justify-between w-full p-2.5 rounded-lg text-sm app-text-main hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <LuTag size={18} className="app-text-muted" />
                  <span>{label("Quản lý vé bán lại", "Resale price cap")}</span>
                </div>
                <LuChevronRight className="w-4 h-4 app-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>

              <Link
                to={PATHS.ADMIN_USERS_PERMISSIONS}
                onClick={onCloseProfileMenu}
                className="group flex items-center justify-between w-full p-2.5 rounded-lg text-sm app-text-main hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <LuUsers size={18} className="app-text-muted" />
                  <span>{label("Người dùng & phân quyền", "Users & permissions")}</span>
                </div>
                <LuChevronRight className="w-4 h-4 app-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>

              <div className="h-px app-bg-border my-1 mx-2" />

              <Link
                to={PATHS.ADMIN_SETTINGS_SECTION("profile")}
                onClick={onCloseProfileMenu}
                className="group flex items-center justify-between w-full p-2.5 rounded-lg text-sm app-text-main hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <LuSettings size={18} className="app-text-muted" />
                  <span>{label("Cài đặt", "Settings")}</span>
                </div>
                <LuChevronRight className="w-4 h-4 app-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>

              <button
                type="button"
                onClick={() => {
                  onCloseProfileMenu();
                  onLogout();
                }}
                className="group flex items-center justify-between w-full p-2.5 rounded-lg text-sm font-semibold text-rose-600 dark:text-rose-500 hover:bg-rose-500/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <LuLogOut size={18} className="text-rose-600 dark:text-rose-500" />
                  <span>{label("Đăng xuất", "Log out")}</span>
                </div>
                <LuChevronRight className="w-4 h-4 text-rose-600/50 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            </nav>
          </div>
        )}
      </div>
    </div>
  </header>;
}
