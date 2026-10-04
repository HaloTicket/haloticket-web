import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { FiChevronDown, FiChevronLeft, FiChevronRight, FiSettings, FiX } from "react-icons/fi";
import { useTranslation } from "react-i18next";

import { PATHS } from "@/routes/paths";
import { adminNavGroups, resolveAdminNavigation } from "../adminNavigation";

interface AdminSidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  pendingEventsCount: number | null;
  onMobileClose: () => void;
  onExpand: (groupId: string) => void;
  onToggleCollapse: () => void;
}

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
  const label = (vi: string, en: string) => t(vi, { defaultValue: i18n.language.startsWith("en") ? en : vi });
  const showLabels = !collapsed || mobileOpen;

  useEffect(() => {
    if (!mobileOpen) return;
    const sidebar = sidebarRef.current;
    const focusClose = () => {
      if (sidebar && getComputedStyle(sidebar).visibility === "visible") closeRef.current?.focus();
    };
    const frame = requestAnimationFrame(focusClose);
    const handleTransitionEnd = (event: TransitionEvent) => {
      if (event.target === sidebar && event.propertyName === "visibility") focusClose();
    };
    sidebar?.addEventListener("transitionend", handleTransitionEnd);
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
        <Link to={PATHS.ADMIN_DASHBOARD} onClick={onMobileClose} className="flex items-center gap-3 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded" aria-label="HaloTicket Admin">
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 text-white font-bold text-sm shrink-0" aria-hidden="true">HT</span>
          {showLabels && <span className="flex flex-col text-sm leading-tight app-text-main truncate"><strong>HALOTICKET</strong><small className="text-[10px] app-text-muted font-bold tracking-wider">ADMIN</small></span>}
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
