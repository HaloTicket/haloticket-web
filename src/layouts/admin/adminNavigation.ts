import { FiAlertTriangle, FiBarChart2, FiCalendar, FiCheckSquare, FiCreditCard, FiDollarSign, FiGrid, FiImage, FiLayout, FiMapPin, FiMessageSquare, FiRepeat, FiSettings, FiShield, FiSliders, FiTag, FiTrendingUp, FiUser, FiUsers, FiZap } from "react-icons/fi";
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
    { path: PATHS.ADMIN_CUSTOMERS, label: "Khách hàng", english: "Customers", icon: FiUser, description: "Hồ sơ khách hàng, lịch sử đơn hàng và hỗ trợ." },
    { path: PATHS.ADMIN_ORGANIZERS, label: "Nhà tổ chức", english: "Organizers", icon: FiUsers, description: "Hồ sơ nhà tổ chức, xác minh và sự kiện đã tổ chức." },
    { path: PATHS.ADMIN_ADMINISTRATORS, label: "Quản trị viên", english: "Administrators", icon: FiShield, description: "Tài khoản quản trị và phạm vi phân quyền." },
  ] },
  { id: "finance", path: PATHS.ADMIN_FINANCE, label: "Quản lý tài chính", english: "Finance management", icon: FiDollarSign, description: "Thanh toán, hoàn tiền và đối soát cho nhà tổ chức.", items: [
    { path: PATHS.ADMIN_PAYMENT_TRANSACTIONS, label: "Giao dịch thanh toán", english: "Payment transactions", icon: FiCreditCard, description: "Tra cứu giao dịch, phương thức và trạng thái thanh toán." },
    { path: PATHS.ADMIN_REFUNDS, label: "Hoàn tiền", english: "Refunds", icon: FiRepeat, description: "Tiếp nhận, xem xét và theo dõi yêu cầu hoàn tiền." },
    { path: PATHS.ADMIN_ORGANIZER_SETTLEMENTS, label: "Đối soát & chi trả", english: "Settlements & payouts", icon: FiDollarSign, description: "Đối chiếu doanh thu, phí và khoản chi trả theo kỳ." },
  ] },
  { id: "market", path: PATHS.ADMIN_TICKET_MARKET, label: "Quản lý thị trường vé", english: "Ticket marketplace", icon: FiTag, description: "Vé bán lại, chính sách giá và tranh chấp giao dịch.", items: [
    { path: PATHS.ADMIN_RESALE_TICKETS, label: "Vé bán lại (Resale)", english: "Resale tickets", icon: FiRepeat, description: "Theo dõi vé niêm yết và trạng thái giao dịch bán lại." },
    { path: PATHS.ADMIN_PRICE_POLICY, label: "Chính sách giá trần", english: "Price cap policy", icon: FiTrendingUp, description: "Thiết lập giới hạn giá và xem cách tính theo hạng vé." },
    { path: PATHS.ADMIN_TRANSACTION_DISPUTES, label: "Khiếu nại giao dịch", english: "Transaction disputes", icon: FiMessageSquare, description: "Đối chiếu bằng chứng và theo dõi xử lý tranh chấp." },
  ] },
  { id: "content", path: PATHS.ADMIN_CONTENT, label: "Quản lý nội dung", english: "Content management", icon: FiLayout, description: "Tổ chức nội dung hiển thị trên nền tảng HaloTicket.", items: [
    { path: PATHS.ADMIN_HOMEPAGE_CONTENT, label: "Nội dung trang chủ", english: "Homepage content", icon: FiLayout, description: "Sắp xếp các khối nội dung và xem trước trang chủ." },
    { path: PATHS.ADMIN_EVENT_CATEGORIES, label: "Danh mục sự kiện", english: "Event categories", icon: FiGrid, description: "Quản lý cấu trúc danh mục và nhóm sự kiện." },
    { path: PATHS.ADMIN_ADVERTISING_BANNERS, label: "Quảng cáo & banner", english: "Advertising & banners", icon: FiImage, description: "Thiết lập vị trí hiển thị, lịch chạy và liên kết quảng cáo." },
  ] },
  { id: "ai", path: PATHS.ADMIN_AI, label: "AI hỗ trợ quản trị", english: "AI administration support", icon: FiZap, description: "Tra cứu, phát hiện bất thường và đề xuất dựa trên dữ liệu.", items: [
    { path: PATHS.ADMIN_AI_ASSISTANT, label: "Trợ lý AI", english: "AI assistant", icon: FiMessageSquare, description: "Đặt câu hỏi với ngữ cảnh, nguồn dữ liệu và đề xuất xử lý." },
    { path: PATHS.ADMIN_AI_ANOMALIES, label: "Phát hiện bất thường", english: "Anomaly detection", icon: FiAlertTriangle, description: "Xem dấu hiệu bất thường và bằng chứng cần kiểm tra." },
    { path: PATHS.ADMIN_AI_ANALYTICS, label: "Phân tích & đề xuất", english: "Analysis & recommendations", icon: FiBarChart2, description: "Phân tích câu hỏi quản trị và xem gợi ý có nguồn đối chiếu." },
  ] },
  { id: "system", path: PATHS.ADMIN_SYSTEM_SETTINGS, label: "Cài đặt hệ thống", english: "System settings", icon: FiSettings, description: "Cấu hình vận hành, tích hợp và các quy tắc nền tảng.", items: [
    { path: PATHS.ADMIN_SYSTEM_SETTINGS, label: "Cài đặt hệ thống", english: "System settings", icon: FiSliders, description: "Thiết lập chung, quyền, thông báo, tích hợp và nhật ký." },
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
