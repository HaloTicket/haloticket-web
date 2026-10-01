import { FiActivity, FiCalendar, FiCheckSquare, FiDollarSign, FiGrid, FiLayout, FiMapPin, FiSliders, FiTrendingUp, FiUsers } from "react-icons/fi";
import type { IconType } from "react-icons";

import { PATHS } from "@/routes/paths";

export interface AdminNavItem {
  path: string;
  label: string;
  english: string;
  icon: IconType;
  available?: boolean;
}

export interface AdminNavGroup {
  id: string;
  label: string;
  english: string;
  icon?: IconType;
  items: AdminNavItem[];
}

export const adminNavGroups: AdminNavGroup[] = [
  { id: "overview", label: "TỔNG QUAN", english: "OVERVIEW", items: [
    { path: PATHS.ADMIN_DASHBOARD, label: "Tổng quan", english: "Overview", icon: FiGrid },
  ] },
  { id: "events", label: "QUẢN LÝ SỰ KIỆN", english: "EVENT MANAGEMENT", icon: FiCalendar, items: [
    { path: PATHS.ADMIN_EVENTS_APPROVAL, label: "Kiểm duyệt sự kiện", english: "Event moderation", icon: FiCheckSquare },
    { path: PATHS.ADMIN_VENUES_MANAGEMENT, label: "Quản lý địa điểm", english: "Venue management", icon: FiMapPin },
  ] },
  { id: "operations", label: "VẬN HÀNH", english: "OPERATIONS", items: [
    { path: PATHS.ADMIN_USERS_PERMISSIONS, label: "Người dùng & phân quyền", english: "Users & permissions", icon: FiUsers, available: false },
    { path: PATHS.ADMIN_SYSTEM_HEALTH, label: "Trạng thái hệ thống", english: "System status", icon: FiActivity, available: false },
  ] },
  { id: "market", label: "THỊ TRƯỜNG & GIAO DỊCH", english: "MARKET & TRANSACTIONS", items: [
    { path: PATHS.ADMIN_RESALE_PRICE_CAP, label: "Vé Resale & giá trần", english: "Resale tickets & price cap", icon: FiTrendingUp, available: false },
    { path: PATHS.ADMIN_PAYMENTS_MONITORING, label: "Thanh toán & Escrow", english: "Payments & escrow", icon: FiDollarSign, available: false },
  ] },
  { id: "content", label: "NỘI DUNG & CẤU HÌNH", english: "CONTENT & SETTINGS", items: [
    { path: PATHS.ADMIN_HOMEPAGE_CONFIG, label: "Cấu hình trang chủ & Ads", english: "Homepage & ads", icon: FiLayout, available: false },
    { path: PATHS.ADMIN_CATEGORIES_CONFIG, label: "Danh mục & cấu hình", english: "Categories & configuration", icon: FiSliders, available: false },
  ] },
];

export function resolveAdminNavigation(pathname: string) {
  for (const group of adminNavGroups) {
    const item = group.items.find(({ path }) => pathname === path || (path === PATHS.ADMIN_EVENTS_APPROVAL && pathname.startsWith(`${path}/`)));
    if (item) {
      const rawId = item.path === PATHS.ADMIN_EVENTS_APPROVAL && pathname.startsWith(`${item.path}/`) ? pathname.slice(item.path.length + 1).split("/")[0] : undefined;
      let eventId = rawId;
      if (rawId) {
        try { eventId = decodeURIComponent(rawId); } catch { /* Keep malformed URL text visible. */ }
      }
      return { group, item, eventId };
    }
  }
  return null;
}
