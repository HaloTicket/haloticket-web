import React, { useState, useEffect, useRef, useCallback } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { PATHS } from "@/routes/paths";
import { useTheme } from "@/hooks/useTheme";
import { getKeycloakSession } from "@/services/keycloakSession";
import { getCachedUserProfile, userApi } from "@/services/userApi";
import type { UserProfile, NotificationItem } from "@/types";
import { useNotificationSocket } from "@/hooks/useNotificationSocket";
import { eventApi } from "@/services/eventApi";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";
import { NotificationDropdown } from "@/components/notifications/NotificationDropdown";
import { NotificationToast } from "@/components/notifications/NotificationToast";
import { adminNavGroups, resolveAdminNavigation } from "@/features/admin/adminNavigation";
import { aiApi } from "@/services/aiApi";
import AdminAiAssistant from "@/features/admin/AdminAiAssistant";
import {
  FiSun,
  FiMoon,
  FiMenu,
  FiX,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiLogOut,
  FiSettings,
  FiUserCheck,
  FiMessageSquare,
  FiZap,
  FiEdit3,
} from "react-icons/fi";

export const AdminLayout: React.FC = () => {
  const { t: translate } = useTranslation();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const { notifications, unreadCount, markAsRead, markAllAsRead, latestToast, clearToast } = useNotificationSocket("ADMIN");

  const [pendingEventsCount, setPendingEventsCount] = useState<number>(0);
  const [pendingUpdatesCount, setPendingUpdatesCount] = useState<number>(0);

  const fetchPendingCount = useCallback(async () => {
    try {
      const data = await eventApi.getApprovalEvents("PENDING");
      if (Array.isArray(data)) {
        setPendingEventsCount(data.length);
      }
      const updateData = await eventApi.getApprovalEvents("UPDATE_PENDING");
      if (Array.isArray(updateData)) {
        setPendingUpdatesCount(updateData.length);
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
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);
  const [aiDrawerPrompt, setAiDrawerPrompt] = useState("");
  const [systemUptime, setSystemUptime] = useState<string | null>(null);
  const [textSelection, setTextSelection] = useState<{ text: string; x: number; y: number } | null>(null);

  const [userProfile, setUserProfile] = useState<UserProfile | null>(() =>
    getCachedUserProfile()
  );

  // live time clock state
  const [currentTime, setCurrentTime] = useState("");

  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseUp = () => {
      setTimeout(() => {
        const activeSelection = window.getSelection();
        if (activeSelection && activeSelection.toString().trim().length > 10) {
          const range = activeSelection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          setTextSelection({
            text: activeSelection.toString().trim(),
            x: rect.left + rect.width / 2,
            y: rect.top - 10
          });
        } else {
          setTextSelection(null);
        }
      }, 10);
    };

    const handleMouseDown = (e: MouseEvent) => {
      if ((e.target as Element).closest('#ai-selection-popover')) return;
      setTextSelection(null);
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousedown', handleMouseDown);
    
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

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

    checkAuth();
    window.addEventListener("storage", checkAuth);
    window.addEventListener("auth-changed", checkAuth);
    window.addEventListener("user-updated", handleProfileUpdate);
    return () => {
      window.removeEventListener("storage", checkAuth);
      window.removeEventListener("auth-changed", checkAuth);
      window.removeEventListener("user-updated", handleProfileUpdate);
    };
  }, [navigate]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    const fetchHealth = async () => {
      try {
        const data = await aiApi.getSystemHealth();
        if (Array.isArray(data) && data.length > 0) {
          const upCount = data.filter((s: any) => s.status === "UP").length;
          setSystemUptime(((upCount / data.length) * 100).toFixed(1) + "%");
        }
      } catch (e) {
        // fail silently
      }
    };
    
    if (userProfile?.roles?.includes("ADMIN")) {
      fetchHealth();
      interval = setInterval(fetchHealth, 60000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [userProfile?.roles]);

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

  const navGroups = adminNavGroups.map((group) => ({
    groupTitle: translate(group.label),
    items: group.items.map((item) => {
      const Icon = item.icon;
      let badge: string | number | undefined;
      let collapsedBadge: string | number | undefined;
      let badgeColor = "bg-rose-500 text-white font-bold";

      if (item.path === PATHS.ADMIN_EVENTS_APPROVAL && (pendingEventsCount > 0 || pendingUpdatesCount > 0)) {
        badge = pendingEventsCount + pendingUpdatesCount;
        collapsedBadge = pendingEventsCount + pendingUpdatesCount;
        badgeColor = "bg-rose-500 text-white font-bold";
      } else if (item.path === PATHS.ADMIN_SYSTEM_MONITORING && systemUptime) {
        badge = systemUptime;
        collapsedBadge = systemUptime.replace("%", "");
        badgeColor = "bg-emerald-500 text-white font-bold";
      }

      return {
        label: translate(item.label),
        path: item.path,
        icon: <Icon className="w-4 h-4 shrink-0" />,
        badge,
        collapsedBadge,
        badgeColor
      };
    })
  }));

  const getSectionTitle = () => {
    const nav = resolveAdminNavigation(location.pathname);
    if (nav) {
      return { title: translate(nav.item.label), category: translate(nav.group.label) };
    }
    return { title: translate("Admin Portal"), category: translate("Quản trị hệ thống HaloTicket") };
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
                              item.collapsedBadge !== undefined ? (
                                <span className={`absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full text-white text-[9px] font-bold flex items-center justify-center shadow-xs ${item.badgeColor?.includes('emerald') ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                                  {item.collapsedBadge}
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
            title={isCollapsed ? translate("Mở rộng Sidebar") : translate("Thu gọn Sidebar")}
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

            {/* Language Switcher */}
            <LanguageSwitcher />

            {/* Dark Mode Switcher Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-md app-bg-card app-text-main border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              title={isDark ? translate("Chuyển sang Chế độ Sáng") : translate("Chuyển sang Chế độ Tối")}
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
              viewAllText={translate("Xem trang Kiểm duyệt Sự kiện →")}
              titleText={translate("Thông báo hệ thống")}
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
                      {translate("Toàn quyền quản trị")}
                    </span>
                  </div>

                  <Link
                    to={PATHS.ADMIN_USERS_PERMISSIONS}
                    onClick={() => setShowProfileMenu(false)}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium app-text-main hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <FiUserCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span>{translate("Quản lý phân quyền")}</span>
                  </Link>

                  <Link
                    to={PATHS.ADMIN_CATEGORIES_CONFIG}
                    onClick={() => setShowProfileMenu(false)}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium app-text-main hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <FiSettings className="w-3.5 h-3.5 text-blue-600" />
                    <span>{translate("Cấu hình hệ thống")}</span>
                  </Link>

                  <div className="pt-1 border-t border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                    >
                      <FiLogOut className="w-3.5 h-3.5" />
                      <span>{translate("Đăng xuất Quản trị")}</span>
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
        actionText={translate("Nhấn để kiểm duyệt ngay →")}
        accentColor="blue"
      />

      {/* AI Text Selection Popover */}
      {textSelection && (
        <div 
          id="ai-selection-popover"
          className="fixed z-[100] animate-in fade-in zoom-in-95 duration-200"
          style={{ left: textSelection.x, top: textSelection.y, transform: 'translate(-50%, -100%)' }}
        >
          <button
            onClick={() => {
              setAiDrawerPrompt(`Hãy soạn thảo một email phản hồi chuyên nghiệp, lịch sự và giải quyết vấn đề cho nội dung khiếu nại/yêu cầu sau:\n\n"${textSelection.text}"`);
              setIsAiDrawerOpen(true);
              setTextSelection(null);
              window.getSelection()?.removeAllRanges();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[11px] font-bold rounded-lg shadow-xl hover:shadow-2xl hover:scale-105 transition-all"
          >
            <FiEdit3 className="w-3.5 h-3.5" />
            Nhờ AI soạn trả lời
          </button>
          <div className="w-2 h-2 bg-indigo-600 rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2"></div>
        </div>
      )}

      {/* Floating AI Action Button */}
      <button
        onClick={() => setIsAiDrawerOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-full flex items-center justify-center text-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgb(59,130,246,0.3)] hover:scale-105 transition-all duration-300 group"
      >
        <FiMessageSquare className="w-6 h-6 group-hover:scale-110 transition-transform" />
      </button>

      {/* AI Assistant Drawer */}
      {isAiDrawerOpen && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <div 
            className="absolute inset-0 bg-slate-950/20 backdrop-blur-sm" 
            onClick={() => setIsAiDrawerOpen(false)}
          />
          <div className="relative w-full max-w-sm md:max-w-md h-full app-bg-card shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between p-3 border-b app-border app-bg-subnav">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm">
                  <FiZap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold app-text-main">Halo AI Assistant</h3>
                  <p className="text-[10px] font-medium app-text-muted">Luôn sẵn sàng hỗ trợ bạn</p>
                </div>
              </div>
              <button 
                onClick={() => setIsAiDrawerOpen(false)}
                className="p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 app-text-main transition-colors"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <AdminAiAssistant isDrawer={true} initialPrompt={aiDrawerPrompt} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLayout;


