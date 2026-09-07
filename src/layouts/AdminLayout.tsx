import React, { useState, useEffect, useRef, useCallback } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { PATHS } from "@/routes/paths";
import { useTheme } from "@/hooks/useTheme";
import { getKeycloakSession } from "@/services/keycloakSession";
import { getCachedUserProfile, userApi } from "@/services/userApi";
import type { UserProfile, NotificationItem } from "@/types";
import { useNotificationSocket } from "@/hooks/useNotificationSocket";
import { eventApi } from "@/services/eventApi";
import { NotificationDropdown } from "@/components/notifications/NotificationDropdown";
import { NotificationToast } from "@/components/notifications/NotificationToast";

import {
  FiGrid,
  FiCheckSquare,
  FiShield,
  FiTrendingUp,
  FiUsers,
  FiSliders,
  FiDollarSign,
  FiActivity,
  FiSun,
  FiMoon,
  FiMenu,
  FiX,
  FiChevronLeft,
  FiChevronRight,
  FiHome,
  FiClock,
  FiLogOut,
  FiSettings,
  FiUserCheck,
  FiLayout,
  FiMapPin
} from "react-icons/fi";

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  badge?: number | string;
  badgeColor?: string;
}

interface NavGroup {
  groupTitle: string;
  items: NavItem[];
}

export const AdminLayout: React.FC = () => {
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const { notifications, unreadCount, markAsRead, markAllAsRead, latestToast, clearToast } = useNotificationSocket("ADMIN");

  const [pendingEventsCount, setPendingEventsCount] = useState<number>(0);

  const fetchPendingCount = useCallback(async () => {
    try {
      const data = await eventApi.getApprovalEvents("PENDING");
      if (Array.isArray(data)) {
        setPendingEventsCount(data.length);
      }
    } catch (err) {
      console.warn("Failed to fetch pending approval count", err);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchPendingCount();
    }, 0);
    window.addEventListener("approval-events-updated", fetchPendingCount);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("approval-events-updated", fetchPendingCount);
    };
  }, [fetchPendingCount, notifications.length]);

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const [userProfile, setUserProfile] = useState<UserProfile | null>(() =>
    getCachedUserProfile()
  );

  // live time clock state
  const [currentTime, setCurrentTime] = useState("");

  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkAuth = () => {
      const authed = getKeycloakSession().isAuthenticated();
      if (authed) {
        setUserProfile(getCachedUserProfile());
        userApi
          .getProfile()
          .then((data) => {
            if (data) setUserProfile(data);
          })
          .catch(() => { });
      } else {
        setUserProfile(null);
      }
    };

    const handleProfileUpdate = () => {
      setUserProfile(getCachedUserProfile());
    };

    const handleSessionExpired = () => {
      getKeycloakSession().logout();
      navigate(`${PATHS.LOGIN}?session_expired=true`, { replace: true });
    };

    checkAuth();
    window.addEventListener("storage", checkAuth);
    window.addEventListener("auth-changed", checkAuth);
    window.addEventListener("user-updated", handleProfileUpdate);
    window.addEventListener("session-expired", handleSessionExpired);
    return () => {
      window.removeEventListener("storage", checkAuth);
      window.removeEventListener("auth-changed", checkAuth);
      window.removeEventListener("user-updated", handleProfileUpdate);
      window.removeEventListener("session-expired", handleSessionExpired);
    };
  }, [navigate]);

  const handleNotificationClick = async (n: NotificationItem) => {
    await markAsRead(n.id);
    clearToast();
    let targetPath = PATHS.ADMIN_EVENTS_APPROVAL;
    if (n.message) {
      const match = n.message.match(/EV_[a-zA-Z0-9_-]+/);
      if (match) {
        targetPath = `${PATHS.ADMIN_EVENTS_APPROVAL}?eventId=${match[0]}`;
      }
    }
    navigate(targetPath);
  };


  const handleLogout = async () => {
    setShowProfileMenu(false);
    await getKeycloakSession().logout();
    window.dispatchEvent(new Event("user-updated"));
    window.dispatchEvent(new Event("auth-changed"));
    navigate(PATHS.LOGIN, { replace: true });
  };

  const userInitial = (
    userProfile?.fullName?.[0] ||
    userProfile?.email?.[0] ||
    "A"
  ).toUpperCase();

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString("vi-VN", { hour12: false });
      const dateStr = now.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      });
      setCurrentTime(`${timeStr} - ${dateStr}`);
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // close profile dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navGroups: NavGroup[] = [
    {
      groupTitle: "TỔNG QUAN",
      items: [
        {
          label: "Bảng điều khiển",
          path: PATHS.ADMIN_DASHBOARD,
          icon: <FiGrid className="w-4 h-4 shrink-0" />
        }
      ]
    },
    {
      groupTitle: "KIỂM DUYỆT & BẢO MẬT",
      items: [
        {
          label: "Kiểm duyệt sự kiện",
          path: PATHS.ADMIN_EVENTS_APPROVAL,
          icon: <FiCheckSquare className="w-4 h-4 shrink-0" />,
          badge: pendingEventsCount > 0 ? pendingEventsCount : undefined,
          badgeColor: "bg-rose-500 text-white font-bold"
        },
        {
          label: "Kiểm duyệt eKYC",
          path: PATHS.ADMIN_EKYC_APPROVAL,
          icon: <FiShield className="w-4 h-4 shrink-0" />,
          badge: 5,
          badgeColor: "bg-rose-500 text-white font-bold"
        }
      ]
    },
    {
      groupTitle: "QUẢN LÝ THỊ TRƯỜNG",
      items: [
        {
          label: "Vé Resale & Giá trần",
          path: PATHS.ADMIN_RESALE_PRICE_CAP,
          icon: <FiTrendingUp className="w-4 h-4 shrink-0" />
        },
        {
          label: "Cấu hình Trang chủ & Ads",
          path: PATHS.ADMIN_HOMEPAGE_CONFIG,
          icon: <FiLayout className="w-4 h-4 shrink-0" />
        },
        {
          label: "Quản lý Địa điểm",
          path: PATHS.ADMIN_VENUES_MANAGEMENT,
          icon: <FiMapPin className="w-4 h-4 shrink-0" />
        }
      ]
    },
    {
      groupTitle: "QUẢN TRỊ NGUYÊN TẮC",
      items: [
        {
          label: "Người dùng & Phân quyền",
          path: PATHS.ADMIN_USERS_PERMISSIONS,
          icon: <FiUsers className="w-4 h-4 shrink-0" />
        },
        {
          label: "Danh mục & Cấu hình",
          path: PATHS.ADMIN_CATEGORIES_CONFIG,
          icon: <FiSliders className="w-4 h-4 shrink-0" />
        }
      ]
    },
    {
      groupTitle: "GIÁM SÁT VẬN HÀNH",
      items: [
        {
          label: "Thanh toán & Escrow",
          path: PATHS.ADMIN_PAYMENTS_MONITORING,
          icon: <FiDollarSign className="w-4 h-4 shrink-0" />
        },
        {
          label: "Trạng thái Hệ thống",
          path: PATHS.ADMIN_SYSTEM_HEALTH,
          icon: <FiActivity className="w-4 h-4 shrink-0" />,
          badge: "99.9%",
          badgeColor: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 font-bold border border-emerald-300/80 dark:border-emerald-800"
        }
      ]
    }
  ];

  const getSectionTitle = () => {
    switch (location.pathname) {
      case PATHS.ADMIN_DASHBOARD:
        return { title: "Tổng quan Hệ thống Admin", category: "Bảng điều khiển trung tâm" };
      case PATHS.ADMIN_EVENTS_APPROVAL:
        return { title: "Kiểm duyệt Yêu cầu Sự kiện", category: "Phê duyệt nội dung & Giấy phép" };
      case PATHS.ADMIN_EKYC_APPROVAL:
        return { title: "Kiểm duyệt eKYC Ban tổ chức", category: "Xác thực danh tính & Đối soát hồ sơ" };
      case PATHS.ADMIN_RESALE_PRICE_CAP:
        return { title: "Quản lý Bán vé lại & Giá trần", category: "Kiểm soát giá bán lại & Chống vé cơ hội" };
      case PATHS.ADMIN_HOMEPAGE_CONFIG:
        return { title: "Cấu hình Giao diện Trang chủ & Quảng cáo", category: "Homepage CMS & Ad Placement Manager" };
      case PATHS.ADMIN_VENUES_MANAGEMENT:
        return { title: "Quản lý Địa điểm Tổ chức Sự kiện", category: "Xác minh & Quản lý địa điểm hệ thống" };
      case PATHS.ADMIN_USERS_PERMISSIONS:
        return { title: "Quản lý Người dùng & Phân quyền", category: "Phân quyền vai trò hệ thống (RBAC)" };
      case PATHS.ADMIN_CATEGORIES_CONFIG:
        return { title: "Quản lý Danh mục & Cấu hình", category: "Cấu hình hệ thống & Thể loại sự kiện" };
      case PATHS.ADMIN_PAYMENTS_MONITORING:
        return { title: "Giám sát Thanh toán & Chuyển nhượng", category: "Nhật ký giao dịch Escrow & Payout" };
      case PATHS.ADMIN_SYSTEM_HEALTH:
        return { title: "Giám sát Trạng thái Microservices", category: "Hạ tầng kỹ thuật & Sức khỏe dịch vụ" };
      default:
        return { title: "Admin Portal", category: "Quản trị hệ thống HaloTicket" };
    }
  };

  const currentSection = getSectionTitle();

  return (
    <div className="min-h-screen flex app-bg-page transition-colors duration-200 font-sans antialiased">
      {/* Sidebar for Desktop & Mobile Drawer */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen app-bg-card border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between p-3 transition-all duration-300 ${isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          } ${isCollapsed ? "lg:w-16" : "lg:w-60"} w-60`}
      >
        <div className="space-y-4 flex-1 flex flex-col min-h-0">
          {/* Logo Branding */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
            <Link to={PATHS.ADMIN_DASHBOARD} className="flex items-center gap-2.5 overflow-hidden group px-0.5">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-600 flex items-center justify-center text-white font-black shadow-md shrink-0 border border-blue-400/20 group-hover:scale-105 transition-transform">
                <span className="text-sm font-black tracking-tighter text-white">HT</span>
              </div>
              {!isCollapsed && (
                <div className="truncate">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black tracking-wider text-blue-600 dark:text-blue-400 block leading-tight">
                      HALOTICKET
                    </span>
                    <span className="text-[9px] font-extrabold px-1 py-0.2 rounded bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      ADMIN
                    </span>
                  </div>
                  <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 block leading-tight mt-0.5">
                    System Management
                  </span>
                </div>
              )}
            </Link>

            {/* Mobile close button */}
            <button
              type="button"
              onClick={() => setIsMobileOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <FiX className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Items grouped into sub-branches */}
          <nav className="space-y-3.5 flex-1 overflow-y-auto overflow-x-hidden no-scrollbar pr-0.5">
            {navGroups.map((group, idx) => (
              <div key={idx} className="space-y-1">
                {!isCollapsed ? (
                  <h4 className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                    {group.groupTitle}
                  </h4>
                ) : (
                  <div className="h-px bg-slate-200 dark:bg-slate-800 my-1.5 mx-1" />
                )}

                {group.items.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <div key={item.path} className="relative group">
                      <Link
                        to={item.path}
                        onClick={() => setIsMobileOpen(false)}
                        className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs font-medium transition-all duration-150 cursor-pointer relative ${isActive
                          ? "bg-blue-600 text-white shadow-xs font-semibold"
                          : "app-text-main hover:bg-slate-100 dark:hover:bg-slate-800/80"
                          } ${isCollapsed ? "justify-center px-0" : ""}`}
                      >
                        <span className={`shrink-0 ${isActive ? "text-white" : "text-blue-600 dark:text-blue-400"}`}>
                          {item.icon}
                        </span>

                        {!isCollapsed && <span className="truncate flex-1">{item.label}</span>}

                        {/* Badges logic */}
                        {item.badge !== undefined && (
                          <>
                            {!isCollapsed ? (
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${item.badgeColor || "bg-rose-500 text-white"
                                  }`}
                              >
                                {item.badge}
                              </span>
                            ) : (
                              // Collapsed mini badge indicator (Clean red circle without dark borders)
                              typeof item.badge === "number" ? (
                                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center shadow-xs">
                                  {item.badge}
                                </span>
                              ) : (
                                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                              )
                            )}
                          </>
                        )}
                      </Link>

                      {/* Tooltip on Hover for Collapsed Mode */}
                      {isCollapsed && (
                        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[11px] font-medium rounded-md shadow-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-50">
                          {item.label}
                          {item.badge !== undefined && (
                            <span className="ml-1.5 font-bold opacity-80">({item.badge})</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* Return to Main Site Button */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 shrink-0">
            <div className="relative group">
              <Link
                to={PATHS.HOME}
                className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs font-medium app-text-muted hover:app-text-main hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all ${isCollapsed ? "justify-center px-0" : ""
                  }`}
              >
                <FiHome className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                {!isCollapsed && <span className="truncate">Về HaloTicket Client</span>}
              </Link>
              {isCollapsed && (
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[11px] font-medium rounded-md shadow-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-50">
                  Về HaloTicket Client
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Collapse Toggle Button for Desktop */}
        <div className="hidden lg:flex items-center justify-between pt-2.5 border-t border-slate-200 dark:border-slate-800 shrink-0">
          {!isCollapsed && (
            <div className="flex items-center gap-1.5 px-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Online</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 app-bg-card app-text-main hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-all mx-auto"
            title={isCollapsed ? "Mở rộng Sidebar" : "Thu gọn Sidebar"}
          >
            {isCollapsed ? <FiChevronRight className="w-3.5 h-3.5" /> : <FiChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>
      </aside>

      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-xs lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top App Bar Header */}
        <header className="sticky top-0 z-30 app-bg-header border-b border-slate-200 dark:border-slate-800 backdrop-blur-md px-4 md:px-6 py-2.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setIsMobileOpen(true)}
              className="lg:hidden p-1.5 rounded-md border border-slate-200 dark:border-slate-700 app-bg-card app-text-main cursor-pointer"
            >
              <FiMenu className="w-4 h-4" />
            </button>

            <div className="min-w-0">
              <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 block leading-tight">
                {currentSection.category}
              </span>
              <h1 className="text-sm md:text-base font-bold app-text-main tracking-tight truncate">
                {currentSection.title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* Live System Time Display */}
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-md app-bg-card border border-slate-200 dark:border-slate-800 text-xs font-mono font-medium app-text-muted">
              <FiClock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>{currentTime}</span>
            </div>

            {/* Dark Mode Switcher Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-md app-bg-card app-text-main border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              title={isDark ? "Chuyển sang Chế độ Sáng" : "Chuyển sang Chế độ Tối"}
            >
              {isDark ? <FiSun className="w-4 h-4 text-amber-400" /> : <FiMoon className="w-4 h-4" />}
            </button>

            {/* Notifications Bell Dropdown */}
            <NotificationDropdown
              notifications={notifications}
              unreadCount={unreadCount}
              onMarkAllAsRead={markAllAsRead}
              onNotificationClick={handleNotificationClick}
              viewAllLink={PATHS.ADMIN_EVENTS_APPROVAL}
              viewAllText="Xem trang Kiểm duyệt Sự kiện →"
              titleText="Thông báo hệ thống"
            />

            {/* Admin Profile Dropdown Menu */}
            <div className="relative pl-2 border-l border-slate-200 dark:border-slate-800" ref={profileRef}>
              <button
                type="button"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2 hover:opacity-90 transition-opacity cursor-pointer text-left"
              >
                <div className="w-8 h-8 rounded-md bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                  {userInitial}
                </div>
                <div className="hidden sm:block">
                  <span className="text-xs font-bold app-text-main block leading-tight truncate max-w-32">
                    {userProfile?.fullName || "Admin System"}
                  </span>
                  <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400 block leading-tight">
                    Super Administrator
                  </span>
                </div>
              </button>

              {/* Profile Dropdown Panel */}
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-56 app-bg-card border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl p-1.5 space-y-1 z-50">
                  <div className="p-2 border-b border-slate-200 dark:border-slate-800 space-y-0.5">
                    <p className="text-xs font-bold app-text-main truncate">
                      {userProfile?.fullName || "Admin System"}
                    </p>
                    <p className="text-[11px] app-text-muted truncate">
                      {userProfile?.email || "admin@haloticket.com"}
                    </p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-[10px] font-semibold border border-blue-200 dark:border-blue-800">
                      Toàn quyền quản trị
                    </span>
                  </div>

                  <Link
                    to={PATHS.ADMIN_USERS_PERMISSIONS}
                    onClick={() => setShowProfileMenu(false)}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium app-text-main hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <FiUserCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span>Quản lý phân quyền</span>
                  </Link>

                  <Link
                    to={PATHS.ADMIN_CATEGORIES_CONFIG}
                    onClick={() => setShowProfileMenu(false)}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium app-text-main hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <FiSettings className="w-3.5 h-3.5 text-blue-600" />
                    <span>Cấu hình hệ thống</span>
                  </Link>

                  <div className="pt-1 border-t border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                    >
                      <FiLogOut className="w-3.5 h-3.5" />
                      <span>Đăng xuất Quản trị</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic Admin View Content Outlet */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Realtime Toast Popup Banner for Admin - Root Level */}
      <NotificationToast
        toast={latestToast}
        onToastClick={handleNotificationClick}
        onClose={clearToast}
        actionText="Nhấn để kiểm duyệt ngay →"
        accentColor="blue"
      />
    </div>
  );
};

export default AdminLayout;


