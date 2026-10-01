import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { FiChevronDown, FiChevronLeft, FiChevronRight, FiHome, FiSettings, FiX } from "react-icons/fi";
import { useTranslation } from "react-i18next";

import { PATHS } from "@/routes/paths";
import { adminNavGroups, resolveAdminNavigation } from "./adminNavigation";

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
    <aside ref={sidebarRef} className={`admin-sidebar ${collapsed ? "is-collapsed" : ""} ${mobileOpen ? "is-mobile-open" : ""}`} role={mobileOpen ? "dialog" : undefined} aria-modal={mobileOpen ? "true" : undefined} aria-label={label("Điều hướng quản trị", "Admin navigation")}>
      <div className="admin-sidebar-brand">
        <Link to={PATHS.ADMIN_DASHBOARD} onClick={onMobileClose} className="admin-brand-link" aria-label="HaloTicket Admin">
          <span className="admin-brand-mark" aria-hidden="true">HT</span>
          {showLabels && <span className="admin-brand-copy"><strong>HALOTICKET</strong><small>ADMIN</small></span>}
        </Link>
        <button ref={closeRef} type="button" className="admin-mobile-close admin-icon-button" aria-label={label("Đóng menu", "Close menu")} onClick={onMobileClose}><FiX /></button>
      </div>
      <nav className="admin-sidebar-nav" aria-label={label("Các mục quản trị", "Admin sections")}>
        {adminNavGroups.filter((group) => group.id !== "system").map((group) => {
          const singleItem = group.items.length === 1;
          const isOpen = !singleItem && showLabels && (openGroups.includes(group.id) || (group.id === activeGroup && !(closedActiveGroup?.path === pathname && closedActiveGroup.id === group.id)));
          const isActive = group.id === activeGroup;
          const GroupIcon = group.icon ?? group.items[0].icon;
          return <div key={group.id} className="admin-nav-group">
            {singleItem ? <Link to={group.items[0].path} onClick={onMobileClose} className={`admin-nav-group-button ${isActive ? "is-active" : ""}`} aria-current={isActive ? "page" : undefined} title={label(group.items[0].label, group.items[0].english)} aria-label={label(group.items[0].label, group.items[0].english)}>
              <GroupIcon aria-hidden="true" />{showLabels && <span>{label(group.items[0].label, group.items[0].english)}</span>}
            </Link> : <button type="button" className={`admin-nav-group-button ${isActive ? "is-active" : ""}`} aria-label={label(group.label, group.english)} aria-expanded={isOpen} aria-controls={`admin-group-${group.id}`} title={label(group.label, group.english)} onClick={() => {
              setOpenGroups((ids) => isOpen ? ids.filter((id) => id !== group.id) : [...ids, group.id]);
              if (group.id === activeGroup) setClosedActiveGroup(isOpen ? { path: pathname, id: group.id } : null);
              if (collapsed && !mobileOpen) onExpand(group.id);
            }}>
              <GroupIcon aria-hidden="true" />
              {showLabels && <><span>{label(group.label, group.english)}</span><FiChevronDown className={`admin-group-chevron ${isOpen ? "is-open" : ""}`} aria-hidden="true" /></>}
            </button>}
            {!singleItem && <div id={`admin-group-${group.id}`} className="admin-nav-items" hidden={!isOpen}>
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = activePath === item.path;
                return <Link key={item.path} to={item.path} onClick={onMobileClose} className={`admin-nav-link ${active ? "is-active" : ""}`} aria-current={active ? "page" : undefined}>
                  <Icon aria-hidden="true" /><span>{label(item.label, item.english)}</span>
                  {item.path === PATHS.ADMIN_EVENTS_APPROVAL && pendingEventsCount !== null && pendingEventsCount > 0 && <span className="admin-nav-count" aria-label={label(`${pendingEventsCount} sự kiện chờ duyệt`, `${pendingEventsCount} pending events`)}>{pendingEventsCount}</span>}
                </Link>;
              })}
            </div>}
          </div>;
        })}
      </nav>
      <div className="admin-sidebar-footer">
        <Link
          to={PATHS.ADMIN_SETTINGS_SECTION("profile")}
          onClick={onMobileClose}
          className={`admin-return-link ${pathname === PATHS.ADMIN_SETTINGS || pathname.startsWith(`${PATHS.ADMIN_SETTINGS}/`) ? "is-active" : ""}`}
          aria-current={pathname === PATHS.ADMIN_SETTINGS || pathname.startsWith(`${PATHS.ADMIN_SETTINGS}/`) ? "page" : undefined}
          title={label("Cài đặt", "Settings")}
          aria-label={label("Cài đặt", "Settings")}
        >
          <FiSettings aria-hidden="true" />
          {showLabels && <span>{label("Cài đặt", "Settings")}</span>}
        </Link>
        <Link to={PATHS.HOME} onClick={onMobileClose} className="admin-return-link" title={label("Về HaloTicket Client", "Back to HaloTicket")}><FiHome aria-hidden="true" />{showLabels && <span>{label("Về HaloTicket Client", "Back to HaloTicket")}</span>}</Link>
        <button type="button" className="admin-collapse-button" onClick={onToggleCollapse} aria-label={collapsed ? label("Mở rộng Sidebar", "Expand sidebar") : label("Thu gọn Sidebar", "Collapse sidebar")}>{collapsed ? <FiChevronRight /> : <FiChevronLeft />}{showLabels && <span>{label("Thu gọn Sidebar", "Collapse sidebar")}</span>}</button>
      </div>
    </aside>
    {mobileOpen && <button type="button" className="admin-sidebar-backdrop" aria-label={label("Đóng menu", "Close menu")} onClick={onMobileClose} />}
  </>;
}
