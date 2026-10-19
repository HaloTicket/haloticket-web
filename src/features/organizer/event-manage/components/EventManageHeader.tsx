import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { PATHS } from "@/routes/paths";
import { useTheme } from "@/hooks/useTheme";
import { getKeycloakSession } from "@/services/keycloakSession";
import { getCachedUserProfile, userApi } from "@/services/userApi";
import type { UserProfile } from "@/types";
import { useNotificationSocket } from "@/hooks/useNotificationSocket";
import { NotificationDropdown } from "@/components/notifications/NotificationDropdown";
import { NotificationToast } from "@/components/notifications/NotificationToast";
import {
  FiMenu,
  FiSun,
  FiMoon,
  FiChevronDown,
  FiExternalLink
} from "react-icons/fi";
import {
  LuTicket,
  LuGem,
  LuCalendarDays,
  LuChartColumn,
  LuBuilding2,
  LuLogOut,
  LuUser
} from "react-icons/lu";

import type { NotificationItem } from "@/types";

interface EventManageHeaderProps {
  eventData?: {
    title?: string;
    [key: string]: unknown;
  } | null;
  onOpenSidebar: () => void;
}

export const EventManageHeader: React.FC<EventManageHeaderProps> = ({
  eventData,
  onOpenSidebar
}) => {
  const { t } = useTranslation();
  const { eventId } = useParams<{ eventId: string }>();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [isAccountOpen, setIsAccountOpen] = useState(false);

  const [isAuthenticated, setIsAuthenticated] = useState(() =>
    getKeycloakSession().isAuthenticated()
  );
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() =>
    getCachedUserProfile()
  );

  const accountDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkAuth = () => {
      const authed = getKeycloakSession().isAuthenticated();
      setIsAuthenticated(authed);
      if (authed) {
        setUserProfile(getCachedUserProfile());
        userApi
          .getProfile()
          .then((data) => {
            if (data) setUserProfile(data);
          })
          .catch(() => {});
      } else {
        setUserProfile(null);
      }
    };

    const handleProfileUpdate = () => {
      setUserProfile(getCachedUserProfile());
    };

    checkAuth();
    window.addEventListener("user-updated", handleProfileUpdate);
    return () => {
      window.removeEventListener("user-updated", handleProfileUpdate);
    };
  }, []);

  const userTargetIds = [userProfile?.keycloakId, userProfile?.id].filter(Boolean) as string[];
  const { notifications, unreadCount, markAsRead, markAllAsRead, latestToast, clearToast } = useNotificationSocket(userTargetIds.length ? userTargetIds : "ORGANIZER");

  const handleNotificationClick = async (n: NotificationItem) => {
    await markAsRead(n.id);
    clearToast();
    if (n.type === "GIFT_INVITATION") {
      const sagaId = n.message.match(/Mã lời mời: ([a-f0-9-]{36})/i)?.[1];
      if (sagaId) {
        navigate(`${PATHS.GIFT_ACCEPT}?sagaId=${encodeURIComponent(sagaId)}`);
        return;
      }
    }
    if (n.type === "PAYOUT_APPROVED" || n.type === "PAYOUT_REQUESTED") {
      navigate(PATHS.REPORTS);
      return;
    }
    if (n.type === "EVENT_APPROVED" || n.type === "EVENT_UPDATE_APPROVED" || n.type === "EVENT_REJECTED") {
      navigate(PATHS.MY_EVENTS);
      return;
    }
    if (n.type === "TICKETS_ISSUED" || n.type === "TICKET_ISSUED" || n.type === "RESALE_LISTING_ACTIVATED" || n.type === "RESALE_LISTING_FAILED") {
      navigate(PATHS.MY_TICKETS);
      return;
    }
    navigate(PATHS.MY_EVENTS);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        accountDropdownRef.current &&
        !accountDropdownRef.current.contains(event.target as Node)
      ) {
        setIsAccountOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await getKeycloakSession().logout();
    setIsAuthenticated(false);
    setUserProfile(null);
    setIsAccountOpen(false);
    window.dispatchEvent(new Event("user-updated"));
    window.dispatchEvent(new Event("auth-changed"));
    navigate(PATHS.HOME, { replace: true });
  };

  const userInitial = (
    userProfile?.fullName?.[0] ||
    userProfile?.email?.[0] ||
    "M"
  ).toUpperCase();

  const isAdmin =
    userProfile?.roles?.some(
      (r) => r.toUpperCase() === "ADMIN" || r.toUpperCase() === "ROLE_ADMIN"
    ) || false;

  // dynamic header title based on current tab route path
  const getHeaderTitle = () => {
    const p = location.pathname;
    if (p.endsWith("/overview")) return t("Phân tích & Báo cáo sự kiện");
    if (p.endsWith("/orders")) return t("Danh sách đơn hàng");
    if (p.endsWith("/checkin")) return t("Check-in soát vé");
    if (p.endsWith("/members")) return t("Thành viên Ban tổ chức");
    if (p.endsWith("/vouchers")) return t("Mã giảm giá (Voucher)");
    if (p.endsWith("/seating")) return t("Sơ đồ ghế & Khán phòng");
    if (p.endsWith("/transfers")) return t("Chuyển nhượng vé");
    if (p.endsWith("/edit")) return t("Chỉnh sửa thông tin sự kiện");
    return eventData?.title || t("Quản trị sự kiện");
  };

  return (
    <>
      <NotificationToast
        toast={latestToast}
        onToastClick={handleNotificationClick}
        onClose={clearToast}
        actionText={t("Nhấn để xem chi tiết →")}
        accentColor="blue"
      />

      <header className="sticky top-0 z-30 app-bg-header border-b app-border backdrop-blur-md px-4 md:px-8 py-3.5 flex items-center justify-between gap-4">
        {/* Left Side Header Title */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenSidebar}
            className="lg:hidden p-2 rounded-xl app-bg-card border app-border app-text-main cursor-pointer"
          > 
            <FiMenu className="w-5 h-5" />
          </button>
          <div className="space-y-0.5">
            <h1 className="text-base md:text-lg font-black app-text-main tracking-tight flex items-center gap-2">
              {getHeaderTitle()}
            </h1>
            {eventData?.title && (
              <p className="text-[11px] app-text-muted font-medium line-clamp-1">
                {t("Sự kiện:")} <span className="font-bold text-blue-600 dark:text-blue-400">{eventData.title}</span>
              </p>
            )}
          </div>
        </div>

        {/* Right Side Header Controls */}
        <div className="flex items-center gap-3">
          {/* Public Web View CTA */}
          {eventId && (
            <Link
              to={`/events/${eventId}`}
              target="_blank"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 hover:bg-blue-100 transition-all"
            >
              <FiExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t("Xem trên Web")}</span>
            </Link>
          )}

          {/* Dark Mode Switcher */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-xl app-bg-card app-text-main border app-border hover:opacity-80 transition-all cursor-pointer"
            title={isDark ? t("Chuyển sang Chế độ Sáng") : t("Chuyển sang Chế độ Tối")}
          >
            {isDark ? <FiSun className="w-4 h-4 text-amber-400" /> : <FiMoon className="w-4 h-4" />}
          </button>

          {/* Notification Bell Dropdown */}
          <NotificationDropdown
            notifications={notifications}
            unreadCount={unreadCount}
            onMarkAllAsRead={markAllAsRead}
            onNotificationClick={handleNotificationClick}
            viewAllLink="/organizer/my-events"
            viewAllText={t("Xem danh sách Sự kiện →")}
            titleText={t("Thông báo Ban tổ chức")}
          />

          {/* User Profile Account Dropdown */}
          {isAuthenticated ? (
            <div ref={accountDropdownRef} className="relative group py-1">
              <button
                type="button"
                onClick={() => setIsAccountOpen((prev) => !prev)}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-all shadow-sm cursor-pointer active:scale-95"
                aria-expanded={isAccountOpen}
                aria-haspopup="menu"
              >
                <span className="w-5 h-5 rounded-full bg-white/20 text-white flex items-center justify-center font-bold text-[10px]">
                  {userInitial}
                </span>
                <span className="hidden sm:inline">
                  {userProfile?.fullName || t("Tài khoản")}
                </span>
                <FiChevronDown
                  className={`w-3.5 h-3.5 opacity-80 transition-transform duration-200 ${
                    isAccountOpen ? "rotate-180" : "group-hover:rotate-180"
                  }`}
                />
              </button>

              {/* Account Dropdown Menu */}
              <div
                className={`absolute right-0 top-full pt-2 w-56 transition-all duration-200 z-50 origin-top-right ${
                  isAccountOpen
                    ? "opacity-100 pointer-events-auto translate-y-0 scale-100"
                    : "opacity-0 pointer-events-none -translate-y-1 scale-95 group-hover:opacity-100 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:scale-100"
                }`}
                role="menu"
              >
                <div className="app-bg-card border app-border rounded-2xl p-2 shadow-2xl space-y-1 app-text-main animate-in zoom-in-95">
                  <div className="px-3 py-1.5 text-[10px] font-bold app-text-muted uppercase tracking-wider">
                    {t("Cá nhân")}
                  </div>

                  <Link
                    to={PATHS.MY_TICKETS}
                    onClick={() => setIsAccountOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition-colors"
                  >
                    <LuTicket className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{t("Vé của tôi")}</span>
                  </Link>

                  <Link
                    to={PATHS.PROFILE}
                    onClick={() => setIsAccountOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition-colors"
                  >
                    <LuUser className="w-4 h-4 text-blue-500 shrink-0" />
                    <span>{t("Thông tin cá nhân")}</span>
                  </Link>

                  <Link
                    to="/profile?tab=membership"
                    onClick={() => setIsAccountOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition-colors w-full text-left cursor-pointer"
                  >
                    <LuGem className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>{t("Thẻ thành viên")}</span>
                  </Link>

                  <div className="my-1 border-t app-border" />

                  <div className="px-3 py-1.5 text-[10px] font-bold app-text-muted uppercase tracking-wider">
                    {t("Ban Tổ Chức")}
                  </div>

                  <Link
                    to={PATHS.MY_EVENTS}
                    onClick={() => setIsAccountOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition-colors"
                  >
                    <LuCalendarDays className="w-4 h-4 text-blue-500 shrink-0" />
                    <span>{t("Quản lý sự kiện")}</span>
                  </Link>

                  <Link
                    to={PATHS.REPORTS}
                    onClick={() => setIsAccountOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition-colors"
                  >
                    <LuChartColumn className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span>{t("Doanh thu & Đối soát")}</span>
                  </Link>

                  <Link
                    to={PATHS.TERMS}
                    onClick={() => setIsAccountOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition-colors"
                  >
                    <LuBuilding2 className="w-4 h-4 text-purple-500 shrink-0" />
                    <span>{t("Hồ sơ Ban tổ chức")}</span>
                  </Link>

                  {isAdmin && (
                    <Link
                      to={PATHS.ADMIN_DASHBOARD}
                      onClick={() => setIsAccountOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-950/40 text-purple-600 dark:text-purple-400 text-xs font-bold transition-colors"
                    >
                      <LuBuilding2 className="w-4 h-4 text-purple-600 shrink-0" />
                      <span>{t("Trang Quản trị Admin")}</span>
                    </Link>
                  )}

                  <div className="my-1 border-t app-border" />

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-rose-500/10 text-rose-600 text-xs font-medium transition-colors w-full text-left cursor-pointer"
                  >
                    <LuLogOut className="w-4 h-4 shrink-0" />
                    <span>{t("Đăng xuất")}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <Link
              to={PATHS.LOGIN}
              className="text-xs font-bold text-blue-600 hover:underline px-2 py-1"
            >
              {t("Đăng nhập")}
            </Link>
          )}
        </div>
      </header>

      {/* Realtime Toast Popup Banner for Event Manager */}
      <NotificationToast
        toast={latestToast}
        onToastClick={handleNotificationClick}
        onClose={clearToast}
        actionText={t("Nhấn để xem chi tiết →")}
        accentColor="blue"
      />
    </>
  );
};

export default EventManageHeader;
