/* Siêu dữ liệu điều hướng được dùng chung cho bố cục quản trị và các trang con. */
/* eslint-disable react-refresh/only-export-components */
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { FiChevronDown, FiChevronLeft, FiChevronRight, FiSettings, FiX, FiActivity, FiBarChart2, FiBell, FiCalendar, FiCheckSquare, FiDollarSign, FiGrid, FiShield, FiLayout, FiMapPin, FiSliders, FiUsers, FiZap } from "react-icons/fi";
import type { IconType } from "react-icons";
import { useTranslation } from "react-i18next";

import { PATHS } from "@/routes/paths";
import { BrandLogo } from "@/components/common/BrandLogo";

/** Một mục điều hướng quản trị: đường dẫn, nhãn tiếng Việt và tiếng Anh, biểu tượng, mô tả. */
export interface AdminNavItem { path: string; label: string; english: string; icon: IconType; description: string; }
/** Một nhóm điều hướng quản trị gồm các mục con. */
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
  { id: "finance", path: PATHS.ADMIN_FINANCE, label: "Tài chính & Rút tiền", english: "Finance & Payouts", icon: FiDollarSign, description: "Thanh toán, hoàn tiền và chi trả cho nhà tổ chức.", items: [
    { path: PATHS.ADMIN_FINANCE, label: "Quản lý tài chính", english: "Finance management", icon: FiDollarSign, description: "Quản lý giao dịch, hoàn tiền và yêu cầu rút tiền." },
    { path: PATHS.ADMIN_RECONCILIATION, label: "Đối soát đơn hàng", english: "Order reconciliation", icon: FiShield, description: "Thanh toán cần xử lý tay, đơn thiếu vé và lệch kho." },
  ] },
  { id: "content", path: PATHS.ADMIN_CONTENT, label: "Quản lý nội dung", english: "Content management", icon: FiLayout, description: "Tổ chức nội dung hiển thị trên nền tảng HaloTicket.", items: [
    { path: PATHS.ADMIN_HOMEPAGE_CONTENT, label: "Nội dung & Ads", english: "Content & Advertising", icon: FiLayout, description: "Quản lý nội dung trang chủ và banner." },
    { path: PATHS.ADMIN_EVENT_CATEGORIES, label: "Danh mục sự kiện", english: "Event categories", icon: FiGrid, description: "Thêm, sắp xếp, ẩn hiện các danh mục sự kiện." },
  ] },
  { id: "ai", path: PATHS.ADMIN_AI, label: "AI hỗ trợ quản trị", english: "AI administration support", icon: FiZap, description: "Tra cứu, phát hiện bất thường và đề xuất dựa trên dữ liệu.", items: [
    { path: PATHS.ADMIN_AI_ANALYTICS, label: "Phân tích & đề xuất", english: "Analysis & recommendations", icon: FiBarChart2, description: "Phân tích câu hỏi quản trị và xem gợi ý có nguồn đối chiếu." },
  ] },
  { id: "monitoring", path: PATHS.ADMIN_SYSTEM_MONITORING, label: "Giám sát hệ thống", english: "System monitoring", icon: FiActivity, description: "Theo dõi tình trạng microservices, hiệu năng hạ tầng và nhật ký kiểm toán.", items: [
    { path: PATHS.ADMIN_SYSTEM_MONITORING, label: "Giám sát hệ thống", english: "System monitoring", icon: FiActivity, description: "Giám sát toàn bộ hệ thống và Audit logs." },
    { path: PATHS.ADMIN_NOTIFICATIONS, label: "Thông báo hệ thống", english: "System notifications", icon: FiBell, description: "Xem hộp thư và gửi thông báo trong HaloTicket." },
  ] },
  { id: "system", path: PATHS.ADMIN_SYSTEM_SETTINGS, label: "Cài đặt", english: "Settings", icon: FiSettings, description: "Cấu hình vận hành, tích hợp và các quy tắc nền tảng.", items: [
    { path: PATHS.ADMIN_SYSTEM_SETTINGS, label: "Cài đặt", english: "Settings", icon: FiSliders, description: "Thiết lập chung, quyền, thông báo, tích hợp và nhật ký." },
  ] },
];

/** Tìm mục điều hướng ứng với đường dẫn hiện tại, kèm mã sự kiện nếu đang ở trang chi tiết duyệt sự kiện hoặc báo cáo; trả về `null` nếu không khớp. */
export function resolveAdminNavigation(pathname: string) {
  for (const group of adminNavGroups) {
    if (group.items.length > 1 && pathname === group.path) return { group, item: { path: group.path, label: group.label, english: group.english, icon: group.icon, description: group.description }, eventId: undefined, isGroup: true };
    const item = group.items.find(({ path }) => pathname === path || ([PATHS.ADMIN_EVENTS_APPROVAL, PATHS.ADMIN_EVENT_REPORTS].includes(path) && pathname.startsWith(`${path}/`)));
    if (!item) continue;
    const rawId = [PATHS.ADMIN_EVENTS_APPROVAL, PATHS.ADMIN_EVENT_REPORTS].includes(item.path) && pathname.startsWith(`${item.path}/`) ? pathname.slice(item.path.length + 1).split("/")[0] : undefined;
    let eventId = rawId;
    if (rawId) { try { eventId = decodeURIComponent(rawId); } catch { /* Giữ nguyên chuỗi URL bị lỗi định dạng. */ } }
    return { group, item, eventId, isGroup: false };
  }
  return null;
}

/** Props của thanh bên quản trị: trạng thái thu gọn, mở trên di động, số sự kiện chờ duyệt và các callback. */
interface AdminSidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  pendingEventsCount: number | null;
  onMobileClose: () => void;
  onExpand: (groupId: string) => void;
  onToggleCollapse: () => void;
}

/** Thanh bên điều hướng quản trị theo nhóm, có thu gọn, ngăn kéo trên di động và bẫy tiêu điểm bàn phím khi ngăn kéo mở. */
export function AdminSidebar({ collapsed, mobileOpen, pendingEventsCount, onMobileClose, onExpand, onToggleCollapse }: AdminSidebarProps) {
  const { pathname } = useLocation();
  const { t, i18n } = useTranslation();
  const activeNavigation = resolveAdminNavigation(pathname);
  const activeGroup = activeNavigation?.group.id;
  const activePath = activeNavigation?.item.path;
  const [openGroups, setOpenGroups] = useState<string[]>(() => activeGroup ? [activeGroup] : []);
  const [closedActiveGroup, setClosedActiveGroup] = useState<{ path: string; id: string } | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  /** Chọn chuỗi tiếng Việt hoặc tiếng Anh theo ngôn ngữ hiện tại. */
  const label = (vi: string, en: string) => t(vi, { defaultValue: i18n.language.startsWith("en") ? en : vi });
  const showLabels = !collapsed || mobileOpen;

  useEffect(() => {
    if (!mobileOpen) return;
    const sidebar = sidebarRef.current;
    /** Đưa tiêu điểm vào nút đóng khi thanh bên đã hiện. */
    const focusClose = () => {
      if (sidebar && getComputedStyle(sidebar).visibility === "visible") closeRef.current?.focus();
    };
    const frame = requestAnimationFrame(focusClose);
    /** Đưa tiêu điểm vào nút đóng khi hiệu ứng ẩn hiện kết thúc. */
    const handleTransitionEnd = (event: TransitionEvent) => {
      if (event.target === sidebar && event.propertyName === "visibility") focusClose();
    };
    sidebar?.addEventListener("transitionend", handleTransitionEnd);
    /** Đóng ngăn kéo bằng Escape và giữ phím Tab xoay vòng trong thanh bên. */
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { onMobileClose(); return; }
      if (event.key !== "Tab") return;
      const elements = Array.from(sidebarRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? []).filter((element) => !element.closest("[hidden]") && getComputedStyle(element).display !== "none" && getComputedStyle(element).visibility !== "hidden");
      if (!elements.length) return;
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (!sidebar?.contains(document.activeElement)) { event.preventDefault(); (event.shiftKey ? last : first).focus(); return; }
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => { cancelAnimationFrame(frame); sidebar?.removeEventListener("transitionend", handleTransitionEnd); document.removeEventListener("keydown", handleKeyDown); };
  }, [mobileOpen, onMobileClose]);

  return <>
    <aside ref={sidebarRef} className={`fixed lg:sticky top-0 z-50 lg:z-40 flex flex-col min-h-screen app-bg-card border-r app-border transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${mobileOpen ? 'translate-x-0 w-[280px]' : '-translate-x-full lg:translate-x-0'} ${!mobileOpen && collapsed ? 'lg:w-20' : (!mobileOpen ? 'lg:w-64' : '')}`} role={mobileOpen ? "dialog" : undefined} aria-modal={mobileOpen ? "true" : undefined} aria-label={label("Điều hướng quản trị", "Admin navigation")}>
      <div className="flex items-center justify-between h-[68px] px-6 border-b app-border shrink-0">
        <Link to={PATHS.ADMIN_DASHBOARD} onClick={onMobileClose} className={`flex overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded group ${showLabels ? "flex-col items-start gap-1 min-w-0" : "items-center justify-center w-full"}`} aria-label="HaloTicket Admin">
          {showLabels ? (
            <>
              <BrandLogo className="h-8 w-[120px] shrink-0 transition-opacity group-hover:opacity-90" />
              <span className="ml-0.5 text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 leading-none">
                ADMIN
              </span>
            </>
          ) : (
            <BrandLogo variant="mark" className="h-8 w-10 shrink-0 transition-transform group-hover:scale-105" />
          )}
        </Link>
        <button ref={closeRef} type="button" className="flex lg:hidden items-center justify-center w-8 h-8 rounded-full app-text-muted hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" aria-label={label("Đóng menu", "Close menu")} onClick={onMobileClose}><FiX size={20} /></button>
      </div>
      <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-2" aria-label={label("Các mục quản trị", "Admin sections")}>
        {adminNavGroups.filter((group) => group.id !== "system").map((group) => {
          const singleItem = group.items.length === 1;
          const isOpen = !singleItem && showLabels && (openGroups.includes(group.id) || (group.id === activeGroup && !(closedActiveGroup?.path === pathname && closedActiveGroup.id === group.id)));
          const isActive = group.id === activeGroup;
          const GroupIcon = group.icon ?? group.items[0].icon;
          return <div key={group.id} className="space-y-1">
            {singleItem ? <Link to={group.items[0].path} onClick={onMobileClose} className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? "text-blue-600 bg-blue-600/10" : "app-text-muted hover:app-text-main hover:bg-slate-100 dark:hover:bg-slate-800"}`} aria-current={isActive ? "page" : undefined} title={label(group.items[0].label, group.items[0].english)} aria-label={label(group.items[0].label, group.items[0].english)}>
              <GroupIcon size={18} aria-hidden="true" />{showLabels && <span>{label(group.items[0].label, group.items[0].english)}</span>}
            </Link> : <button type="button" className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? "text-blue-600 bg-blue-600/10" : "app-text-muted hover:app-text-main hover:bg-slate-100 dark:hover:bg-slate-800"}`} aria-label={label(group.label, group.english)} aria-expanded={isOpen} aria-controls={`admin-group-${group.id}`} title={label(group.label, group.english)} onClick={() => {
              setOpenGroups((ids) => isOpen ? ids.filter((id) => id !== group.id) : [...ids, group.id]);
              if (group.id === activeGroup) setClosedActiveGroup(isOpen ? { path: pathname, id: group.id } : null);
              if (collapsed && !mobileOpen) onExpand(group.id);
            }}>
              <GroupIcon size={18} aria-hidden="true" />
              {showLabels && <><span>{label(group.label, group.english)}</span><FiChevronDown className={`ml-auto w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} aria-hidden="true" /></>}
            </button>}
            {!singleItem && <div id={`admin-group-${group.id}`} className="mt-1 space-y-1 overflow-hidden" hidden={!isOpen}>
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = activePath === item.path;
                return <Link key={item.path} to={item.path} onClick={onMobileClose} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${showLabels ? "ml-8" : ""} ${active ? "text-blue-600 font-semibold bg-blue-50 dark:bg-blue-900/20" : "app-text-muted hover:app-text-main hover:bg-slate-50 dark:hover:bg-slate-800/50"}`} aria-current={active ? "page" : undefined}>
                  <Icon size={16} aria-hidden="true" /><span>{label(item.label, item.english)}</span>
                  {item.path === PATHS.ADMIN_EVENTS_APPROVAL && pendingEventsCount !== null && pendingEventsCount > 0 && <span className="ml-auto flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-blue-600 text-[10px] font-bold text-white" aria-label={label(`${pendingEventsCount} sự kiện chờ duyệt`, `${pendingEventsCount} pending events`)}>{pendingEventsCount}</span>}
                </Link>;
              })}
            </div>}
          </div>;
        })}
      </nav>
      <div className="p-4 border-t app-border shrink-0 flex flex-col gap-2">
        <Link
          to={PATHS.ADMIN_SETTINGS_SECTION("profile")}
          onClick={onMobileClose}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${pathname === PATHS.ADMIN_SETTINGS || pathname.startsWith(`${PATHS.ADMIN_SETTINGS}/`) ? "text-blue-600 bg-blue-600/10" : "app-text-muted hover:app-text-main hover:bg-slate-100 dark:hover:bg-slate-800"}`}
          aria-current={pathname === PATHS.ADMIN_SETTINGS || pathname.startsWith(`${PATHS.ADMIN_SETTINGS}/`) ? "page" : undefined}
          title={label("Cài đặt", "Settings")}
          aria-label={label("Cài đặt", "Settings")}
        >
          <FiSettings size={18} aria-hidden="true" />
          {showLabels && <span>{label("Cài đặt", "Settings")}</span>}
        </Link>
        <div className="h-px app-bg-border my-1" />
        <button
          type="button"
          className="hidden lg:flex items-center gap-3 px-3 py-2 rounded-lg text-sm app-text-muted hover:app-text-main hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          onClick={onToggleCollapse}
          title={collapsed ? label("Mở rộng thanh bên", "Expand sidebar") : label("Thu gọn thanh bên", "Collapse sidebar")}
          aria-label={collapsed ? label("Mở rộng thanh bên", "Expand sidebar") : label("Thu gọn thanh bên", "Collapse sidebar")}
        >
          {collapsed ? <FiChevronRight size={18} /> : <FiChevronLeft size={18} />}
          {showLabels && <span>{label("Thu gọn thanh bên", "Collapse sidebar")}</span>}
        </button>
      </div>
    </aside>
    {mobileOpen && <button type="button" className="fixed inset-0 z-40 bg-black/50 lg:hidden backdrop-blur-sm transition-opacity" aria-label={label("Đóng menu", "Close menu")} onClick={onMobileClose} />}
  </>;
}
