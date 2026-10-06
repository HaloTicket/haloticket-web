import { FiActivity, FiBarChart2, FiCalendar, FiCheckSquare, FiDollarSign, FiGrid, FiLayout, FiMapPin, FiSettings, FiSliders, FiTag, FiUsers, FiZap } from "react-icons/fi";
import type { IconType } from "react-icons";
import { PATHS } from "@/routes/paths";

export interface AdminNavItem { path: string; label: string; english: string; icon: IconType; description: string; }
export interface AdminNavGroup { id: string; path: string; label: string; english: string; icon: IconType; description: string; items: AdminNavItem[]; }

export const adminNavGroups: AdminNavGroup[] = [
  { id: "overview", path: PATHS.ADMIN_DASHBOARD, label: "Tổng quan hệ thống", english: "System overview", icon: FiGrid, description: "Theo dõi hoạt động và các công việc cần xử lý.", items: [
    { path: PATHS.ADMIN_DASHBOARD, label: "Tổng quan hệ thống", english: "System overview", icon: FiGrid, description: "Dữ liệu tổng quan từ hệ thống." },
  ] },
  { id: "events", path: PATHS.ADMIN_EVENT_MANAGEMENT, label: "Quản lý sự kiện", english: "Event management", icon: FiCalendar, description: "Kiểm duyệt, địa điểm và kết quả tổ chức sự kiện.", items: [
    { path: PATHS.ADMIN_EVENTS_APPROVAL, label: "Kiểm duyệt sự kiện", english: "Event moderation", icon: FiCheckSquare, description: "Xem hồ sơ, duyệt hoặc yêu cầu sửa sự kiện." },
    { path: PATHS.ADMIN_VENUES_MANAGEMENT, label: "Quản lý địa điểm", english: "Venue management", icon: FiMapPin, description: "Quản lý thông tin, sức chứa và xác minh địa điểm." },
    { path: PATHS.ADMIN_EVENT_REPORTS, label: "Báo cáo & thống kê", english: "Reports & statistics", icon: FiBarChart2, description: "So sánh doanh thu, đơn thanh toán và vé bán theo sự kiện." },
  ] },
  { id: "users", path: PATHS.ADMIN_USER_MANAGEMENT, label: "Quản lý người dùng", english: "User management", icon: FiUsers, description: "Tra cứu tài khoản theo vai trò và trạng thái.", items: [
    { path: PATHS.ADMIN_USER_MANAGEMENT, label: "Quản lý người dùng", english: "User management", icon: FiUsers, description: "Quản lý tất cả người dùng trên hệ thống." },
  ] },
  { id: "finance", path: PATHS.ADMIN_FINANCE, label: "Quản lý tài chính", english: "Finance management", icon: FiDollarSign, description: "Thanh toán, hoàn tiền và đối soát cho nhà tổ chức.", items: [
    { path: PATHS.ADMIN_FINANCE, label: "Quản lý tài chính", english: "Finance management", icon: FiDollarSign, description: "Quản lý tất cả giao dịch, hoàn tiền và đối soát." },
  ] },
  { id: "market", path: PATHS.ADMIN_TICKET_MARKET, label: "Vé bán lại & Giá trần", english: "Resale & Price cap", icon: FiTag, description: "Vé bán lại và chính sách giá trần.", items: [
    { path: PATHS.ADMIN_TICKET_MARKET, label: "Vé bán lại & Giá trần", english: "Resale tickets & Price cap", icon: FiTag, description: "Quản lý vé bán lại và chính sách giá trần." },
  ] },
  { id: "content", path: PATHS.ADMIN_CONTENT, label: "Quản lý nội dung", english: "Content management", icon: FiLayout, description: "Tổ chức nội dung hiển thị trên nền tảng HaloTicket.", items: [
    { path: PATHS.ADMIN_HOMEPAGE_CONTENT, label: "Nội dung & Ads", english: "Content & Advertising", icon: FiLayout, description: "Quản lý nội dung trang chủ và banner." },
    { path: PATHS.ADMIN_EVENT_CATEGORIES, label: "Danh mục và cấu hình", english: "Event categories", icon: FiGrid, description: "Quản lý cấu trúc danh mục và nhóm sự kiện." },
  ] },
  { id: "ai", path: PATHS.ADMIN_AI, label: "AI hỗ trợ quản trị", english: "AI administration support", icon: FiZap, description: "Tra cứu, phát hiện bất thường và đề xuất dựa trên dữ liệu.", items: [
    { path: PATHS.ADMIN_AI_ANALYTICS, label: "Phân tích & đề xuất", english: "Analysis & recommendations", icon: FiBarChart2, description: "Phân tích câu hỏi quản trị và xem gợi ý có nguồn đối chiếu." },
  ] },
  { id: "monitoring", path: PATHS.ADMIN_SYSTEM_MONITORING, label: "Giám sát hệ thống", english: "System monitoring", icon: FiActivity, description: "Theo dõi tình trạng microservices, hiệu năng hạ tầng và nhật ký kiểm toán.", items: [
    { path: PATHS.ADMIN_SYSTEM_MONITORING, label: "Giám sát hệ thống", english: "System monitoring", icon: FiActivity, description: "Giám sát toàn bộ hệ thống và Audit logs." },
  ] },
  { id: "system", path: PATHS.ADMIN_SYSTEM_SETTINGS, label: "Cài đặt", english: "Settings", icon: FiSettings, description: "Cấu hình vận hành, tích hợp và các quy tắc nền tảng.", items: [
    { path: PATHS.ADMIN_SYSTEM_SETTINGS, label: "Cài đặt", english: "Settings", icon: FiSliders, description: "Thiết lập chung, quyền, thông báo, tích hợp và nhật ký." },
  ] },
];

export function resolveAdminNavigation(pathname: string) {
  for (const group of adminNavGroups) {
    if (group.items.length > 1 && pathname === group.path) return { group, item: { path: group.path, label: group.label, english: group.english, icon: group.icon, description: group.description }, eventId: undefined, isGroup: true };
    const item = group.items.find(({ path }) => pathname === path || ([PATHS.ADMIN_EVENTS_APPROVAL, PATHS.ADMIN_EVENT_REPORTS].includes(path) && pathname.startsWith(`${path}/`)));
    if (!item) continue;
    const rawId = [PATHS.ADMIN_EVENTS_APPROVAL, PATHS.ADMIN_EVENT_REPORTS].includes(item.path) && pathname.startsWith(`${item.path}/`) ? pathname.slice(item.path.length + 1).split("/")[0] : undefined;
    let eventId = rawId;
    if (rawId) { try { eventId = decodeURIComponent(rawId); } catch { /* Preserve malformed URL text. */ } }
    return { group, item, eventId, isGroup: false };
  }
  return null;
}
