import { useCallback, useEffect, useRef, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { NotificationToast } from "@/components/notifications/NotificationToast";
import { preferenceIdentity, useAdminPreferences } from "@/features/admin/settings/adminPreferences";
import { useTheme } from "@/hooks/useTheme";
import { useNotificationSocket } from "@/hooks/useNotificationSocket";
import { PATHS } from "@/routes/paths";
import { eventApi } from "@/services/eventApi";
import { getKeycloakSession } from "@/services/keycloakSession";
import { getCachedUserProfile, userApi } from "@/services/userApi";
import type { NotificationItem, UserProfile } from "@/types";
import { AdminHeader } from "./admin/AdminHeader";
import { AdminBreadcrumb } from "./admin/AdminBreadcrumb";
import { AdminSidebar } from "./admin/AdminSidebar";
import "./admin/admin.css";

export function AdminLayout() {
  const { t, i18n } = useTranslation();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead, latestToast, clearToast } = useNotificationSocket("ADMIN");
  const [pendingEventsCount, setPendingEventsCount] = useState<number | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => getCachedUserProfile());
  const { preferences } = useAdminPreferences(preferenceIdentity(userProfile));
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const wasMobileOpen = useRef(false);
  const label = (vi: string, en: string) => t(vi, { defaultValue: i18n.language.startsWith("en") ? en : vi });

  const fetchPendingCount = useCallback(async () => {
    try {
      const data = await eventApi.getApprovalEvents("PENDING");
      setPendingEventsCount(Array.isArray(data) ? data.length : null);
    } catch {
      setPendingEventsCount(null);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void fetchPendingCount(); }, 0);
    window.addEventListener("approval-events-updated", fetchPendingCount);
    return () => { window.clearTimeout(timer); window.removeEventListener("approval-events-updated", fetchPendingCount); };
  }, [fetchPendingCount, notifications.length]);

  useEffect(() => {
    const checkAuth = () => {
      if (getKeycloakSession().isAuthenticated()) {
        setUserProfile(getCachedUserProfile());
        userApi.getProfile().then((data) => { if (data) setUserProfile(data); }).catch(() => {});
      } else setUserProfile(null);
    };
    const handleProfileUpdate = () => setUserProfile(getCachedUserProfile());
    checkAuth();
    window.addEventListener("storage", checkAuth);
    window.addEventListener("auth-changed", checkAuth);
    window.addEventListener("user-updated", handleProfileUpdate);
    return () => {
      window.removeEventListener("storage", checkAuth);
      window.removeEventListener("auth-changed", checkAuth);
      window.removeEventListener("user-updated", handleProfileUpdate);
    };
  }, []);

  useEffect(() => {
    if (!isMobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [isMobileOpen]);

  useEffect(() => {
    if (wasMobileOpen.current && !isMobileOpen) mobileMenuButtonRef.current?.focus();
    wasMobileOpen.current = isMobileOpen;
  }, [isMobileOpen]);

  const closeMobile = useCallback(() => {
    setIsMobileOpen(false);
  }, []);

  const handleNotificationClick = async (notification: NotificationItem) => {
    await markAsRead(notification.id);
    clearToast();
    let targetPath = PATHS.ADMIN_EVENTS_APPROVAL;
    const eventId = notification.message?.match(/EV_[a-zA-Z0-9_-]+/)?.[0];
    if (eventId) targetPath = `${PATHS.ADMIN_EVENTS_APPROVAL}?eventId=${encodeURIComponent(eventId)}`;
    navigate(targetPath);
  };

  const handleLogout = async () => {
    setShowProfileMenu(false);
    await getKeycloakSession().logout();
    window.dispatchEvent(new Event("user-updated"));
    window.dispatchEvent(new Event("auth-changed"));
    navigate(PATHS.LOGIN, { replace: true });
  };

  return <div className={`admin-shell ${isCollapsed ? "is-collapsed" : ""}`}>
    <AdminSidebar collapsed={isCollapsed} mobileOpen={isMobileOpen} pendingEventsCount={pendingEventsCount} onMobileClose={closeMobile} onExpand={() => setIsCollapsed(false)} onToggleCollapse={() => setIsCollapsed((value) => !value)} />
    <div className="admin-workspace" inert={isMobileOpen}>
      <AdminHeader collapsed={isCollapsed} onToggleCollapse={() => setIsCollapsed((value) => !value)} isDark={isDark} toggleTheme={toggleTheme} userProfile={userProfile} notifications={notifications} unreadCount={unreadCount} showProfileMenu={showProfileMenu} onToggleProfileMenu={() => setShowProfileMenu((value) => !value)} onCloseProfileMenu={() => setShowProfileMenu(false)} onMobileOpen={() => setIsMobileOpen(true)} mobileMenuButtonRef={mobileMenuButtonRef} onMarkAllAsRead={markAllAsRead} onNotificationClick={handleNotificationClick} onLogout={handleLogout} />
      <main className="admin-main"><AdminBreadcrumb /><Outlet /></main>
    </div>
    <NotificationToast toast={latestToast} onToastClick={handleNotificationClick} onClose={clearToast} actionText={label("Nhấn để kiểm duyệt ngay →", "Review now →")} accentColor="blue" enabled={preferences.instantNotifications} />
  </div>;
}

export default AdminLayout;
