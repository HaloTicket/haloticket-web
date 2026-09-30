import { FiActivity, FiCheckSquare, FiDollarSign, FiGrid, FiLayout, FiMapPin, FiShield, FiSliders, FiTrendingUp, FiUsers } from "react-icons/fi";
import type { IconType } from "react-icons";

import { PATHS } from "@/routes/paths";

export interface AdminNavItem {
  path: string;
  label: string;
  english: string;
  icon: IconType;
}

export interface AdminNavGroup {
  id: string;
  label: string;
  english: string;
  items: AdminNavItem[];
}

export const adminNavGroups: AdminNavGroup[] = [
  { id: "overview", label: "TỔNG QUAN", english: "OVERVIEW", items: [
    { path: PATHS.ADMIN_DASHBOARD, label: "Bảng điều khiển", english: "Dashboard", icon: FiGrid },
  ] },
  { id: "moderation", label: "KIỂM DUYỆT", english: "MODERATION", items: [
    { path: PATHS.ADMIN_EVENTS_APPROVAL, label: "Kiểm duyệt sự kiện", english: "Event moderation", icon: FiCheckSquare },
    { path: PATHS.ADMIN_EKYC_APPROVAL, label: "Kiểm duyệt eKYC", english: "eKYC moderation", icon: FiShield },
  ] },
  { id: "management", label: "QUẢN LÝ", english: "MANAGEMENT", items: [
    { path: PATHS.ADMIN_VENUES_MANAGEMENT, label: "Quản lý Địa điểm", english: "Venue management", icon: FiMapPin },
    { path: PATHS.ADMIN_USERS_PERMISSIONS, label: "Người dùng & Phân quyền", english: "Users & permissions", icon: FiUsers },
  ] },
  { id: "market", label: "THỊ TRƯỜNG & GIAO DỊCH", english: "MARKET & TRANSACTIONS", items: [
    { path: PATHS.ADMIN_RESALE_PRICE_CAP, label: "Vé Resale & Giá trần", english: "Resale tickets & price cap", icon: FiTrendingUp },
    { path: PATHS.ADMIN_PAYMENTS_MONITORING, label: "Thanh toán & Escrow", english: "Payments & escrow", icon: FiDollarSign },
  ] },
  { id: "content", label: "NỘI DUNG & CẤU HÌNH", english: "CONTENT & SETTINGS", items: [
    { path: PATHS.ADMIN_HOMEPAGE_CONFIG, label: "Cấu hình Trang chủ & Ads", english: "Homepage & ads", icon: FiLayout },
    { path: PATHS.ADMIN_CATEGORIES_CONFIG, label: "Danh mục & Cấu hình", english: "Categories & configuration", icon: FiSliders },
  ] },
  { id: "operations", label: "VẬN HÀNH", english: "OPERATIONS", items: [
    { path: PATHS.ADMIN_SYSTEM_HEALTH, label: "Trạng thái Hệ thống", english: "System status", icon: FiActivity },
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
