import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FiAlertCircle, FiBell, FiCalendar, FiCheck, FiSearch } from "react-icons/fi";
import { useTranslation } from "react-i18next";

import type { NotificationItem } from "@/types";
import "./notificationInbox.css";

export interface NotificationInboxProps {
  notifications: NotificationItem[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onNotificationClick: (item: NotificationItem) => void;
  onMarkAllAsRead: () => Promise<void> | void;
  compact?: boolean;
  getTarget?: (item: NotificationItem) => string | null;
}

type ReadFilter = "all" | "unread";
type TypeFilter = "all" | "event" | "system" | "alert";

const isUnread = (item: NotificationItem) => !item.readStatus;
const validDate = (item: NotificationItem) => {
  if (!item.createdAt) return null;
  const date = new Date(item.createdAt);
  return Number.isNaN(date.getTime()) ? null : date;
};

function relativeTime(item: NotificationItem, locale: string) {
  const date = validDate(item);
  if (!date) return "Time unavailable";
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31536000], ["month", 2592000], ["week", 604800],
    ["day", 86400], ["hour", 3600], ["minute", 60], ["second", 1],
  ];
  const [unit, size] = units.find(([, size]) => Math.abs(seconds) >= size) ?? ["second", 1];
  return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(Math.round(seconds / size), unit);
}

function localizedType(type: string, label: (vi: string, en: string) => string) {
  const value = type.toLowerCase();
  if (value.includes("event") || value.includes("calendar")) return label("Sự kiện", "Event");
  if (value.includes("alert") || value.includes("warning") || value.includes("error")) return label("Cảnh báo", "Alert");
  return label("Hệ thống", "System");
}

function itemIcon(type: string) {
  const value = type.toLowerCase();
  if (value.includes("event") || value.includes("calendar")) return FiCalendar;
  if (value.includes("alert") || value.includes("warning") || value.includes("error")) return FiAlertCircle;
  return FiBell;
}

function isToday(item: NotificationItem) {
  const date = validDate(item);
  const now = new Date();
  return !!date && date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
}

function isMobileViewport() {
  return window.matchMedia?.("(max-width: 700px)").matches ?? false;
}

export function NotificationInbox({
  notifications,
  loading = false,
  error = null,
  onRetry,
  onNotificationClick,
  onMarkAllAsRead,
  compact = false,
  getTarget,
}: NotificationInboxProps) {
  const { t, i18n } = useTranslation();
  const language = i18n.language ?? "vi";
  const locale = language.startsWith("en") ? "en-US" : "vi-VN";
  const label = (vi: string, en: string) => t(vi, { defaultValue: language.startsWith("en") ? en : vi });
  const [searchParams, setSearchParams] = useSearchParams();
  const [readFilter, setReadFilter] = useState<ReadFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [query, setQuery] = useState("");
  const [compactFilter, setCompactFilter] = useState<ReadFilter>("all");
  const detailRef = useRef<HTMLElement>(null);
  const selectedId = searchParams.get("notificationId");
  const selected = notifications.find((item) => item.id === selectedId) ?? null;

  useEffect(() => {
    if (!selectedId || !isMobileViewport()) return;
    requestAnimationFrame(() => detailRef.current?.scrollIntoView?.({ behavior: "smooth", block: "nearest" }));
  }, [selectedId]);

  const filtered = useMemo(() => notifications.filter((item) => {
    if (readFilter === "unread" && !isUnread(item)) return false;
    const type = item.type.toLowerCase();
    const group = /alert|warning|error/.test(type) ? "alert" : /event|calendar/.test(type) ? "event" : "system";
    if (typeFilter !== "all" && group !== typeFilter) return false;
    const needle = query.trim().toLowerCase();
    return !needle || `${item.title} ${item.message} ${item.type}`.toLowerCase().includes(needle);
  }), [notifications, readFilter, typeFilter, query]);

  const compactItems = useMemo(() => notifications.filter((item) => compactFilter === "all" || isUnread(item)), [notifications, compactFilter]);

  const select = (item: NotificationItem) => {
    if (!compact) {
      const params = new URLSearchParams(searchParams);
      params.set("notificationId", item.id);
      setSearchParams(params);
      if (isMobileViewport()) {
        requestAnimationFrame(() => detailRef.current?.scrollIntoView?.({ behavior: "smooth", block: "nearest" }));
      }
    }
    onNotificationClick(item);
  };

  const row = (item: NotificationItem, mode: "compact" | "full") => {
    const Icon = itemIcon(item.type);
    const date = validDate(item);
    return (
      <button
        type="button"
        className={`notification-inbox__row ${isUnread(item) ? "is-unread" : ""} ${mode === "full" && selectedId === item.id ? "is-selected" : ""}`}
        key={item.id}
        onClick={() => select(item)}
        aria-current={mode === "full" && selectedId === item.id ? "true" : undefined}
      >
        <span className="notification-inbox__icon" aria-hidden="true"><Icon /></span>
        <span className="notification-inbox__row-copy">
          <span className="notification-inbox__row-heading"><span className="notification-inbox__row-title">{item.title}</span>{isUnread(item) && <span className="notification-inbox__unread-dot" aria-label={label("Chưa đọc", "Unread")} />}</span>
          <span className="notification-inbox__row-message">{item.message}</span>
          <time className="notification-inbox__time" dateTime={date?.toISOString()} title={date?.toLocaleString(locale) ?? label("Thời gian không khả dụng", "Time unavailable")}>{relativeTime(item, locale)}</time>
        </span>
      </button>
    );
  };

  if (compact) {
    const today = compactItems.filter(isToday);
    const earlier = compactItems.filter((item) => !isToday(item));
    return (
      <section className="notification-inbox notification-inbox--compact" aria-label={label("Thông báo", "Notifications")}>
        <div className="notification-inbox__tabs" role="group" aria-label={label("Trạng thái thông báo", "Notification status")}>
          {(["all", "unread"] as const).map((filter) => <button key={filter} type="button" aria-pressed={compactFilter === filter} onClick={() => setCompactFilter(filter)}>{filter === "all" ? label("Tất cả", "All") : label("Chưa đọc", "Unread")}</button>)}
          <button type="button" className="notification-inbox__text-button" onClick={() => void onMarkAllAsRead()} disabled={!notifications.some(isUnread)}>{label(compact ? "Đọc tất cả" : "Đánh dấu tất cả đã đọc", "Mark all as read")}</button>
        </div>
        {loading ? <p className="notification-inbox__state" role="status">{label("Đang tải thông báo…", "Loading notifications…")}</p> : error ? <div className="notification-inbox__state" role="alert"><p>{error}</p>{onRetry && <button type="button" className="notification-inbox__retry" onClick={onRetry}>{label("Thử lại", "Try again")}</button>}</div> : compactItems.length === 0 ? <p className="notification-inbox__state">{notifications.length === 0 ? label("Bạn đã xem hết thông báo.", "You're all caught up.") : label("Không có thông báo chưa đọc.", "No unread notifications.")}</p> : <div className="notification-inbox__list">
          {today.length > 0 && <><h3 className="notification-inbox__group-title">{label("Hôm nay", "Today")}</h3>{today.map((item) => row(item, "compact"))}</>}
          {earlier.length > 0 && <><h3 className="notification-inbox__group-title">{label("Trước đó", "Earlier")}</h3>{earlier.map((item) => row(item, "compact"))}</>}
        </div>}
      </section>
    );
  }

  return (
    <section className="notification-inbox" aria-label="Notification inbox">
      <div className="notification-inbox__master">
        <header className="notification-inbox__header"><p>{label("Thông báo chưa đọc", "Unread notifications")}: {notifications.filter(isUnread).length}</p><button type="button" className="notification-inbox__text-button" onClick={() => void onMarkAllAsRead()} disabled={!notifications.some(isUnread)}>{label(compact ? "Đọc tất cả" : "Đánh dấu tất cả đã đọc", "Mark all as read")}</button></header>
        <div className="notification-inbox__filters">
          <label className="notification-inbox__search"><FiSearch aria-hidden="true"/><span className="notification-inbox__sr-only">{label("Tìm thông báo", "Search notifications")}</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={label("Tìm thông báo", "Search notifications")} /></label>
          <div className="notification-inbox__filter-row">
            <label>{label("Trạng thái", "Status")} <select value={readFilter} onChange={(event) => setReadFilter(event.target.value as ReadFilter)}><option value="all">{label("Tất cả", "All")}</option><option value="unread">{label("Chưa đọc", "Unread")}</option></select></label>
            <label>{label("Loại", "Type")} <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as TypeFilter)}><option value="all">{label("Tất cả loại", "All types")}</option><option value="event">{label("Sự kiện", "Event")}</option><option value="system">{label("Hệ thống", "System")}</option><option value="alert">{label("Cảnh báo", "Alert")}</option></select></label>
          </div>
        </div>
        <div className="notification-inbox__list" aria-live="polite">
          {loading ? <p className="notification-inbox__state" role="status">{label("Đang tải thông báo…", "Loading notifications…")}</p> : error ? <div className="notification-inbox__state" role="alert"><p>{error}</p>{onRetry && <button type="button" className="notification-inbox__retry" onClick={onRetry}>{label("Thử lại", "Try again")}</button>}</div> : notifications.length === 0 ? <p className="notification-inbox__state">{label("Bạn đã xem hết thông báo.", "You're all caught up.")}</p> : filtered.length === 0 ? <p className="notification-inbox__state">{label("Không tìm thấy thông báo phù hợp.", "No notifications match your filters.")}</p> : filtered.map((item) => row(item, "full"))}
        </div>
      </div>
      <article ref={detailRef} className={`notification-inbox__detail ${selected || selectedId ? "has-selection" : ""}`} aria-label={label("Chi tiết thông báo", "Notification details")} aria-live="polite">
        {selected ? <><button type="button" className="notification-inbox__back" onClick={() => { const params = new URLSearchParams(searchParams); params.delete("notificationId"); setSearchParams(params); }}>{label("Quay lại danh sách", "Back to notifications")}</button><div className="notification-inbox__detail-top"><span className="notification-inbox__detail-type">{localizedType(selected.type, label)}</span>{validDate(selected) && <time dateTime={validDate(selected)!.toISOString()}>{validDate(selected)!.toLocaleString(locale)}</time>}</div><h2>{selected.title}</h2><p>{selected.message}</p>{getTarget?.(selected) && <Link className="notification-inbox__action" to={getTarget(selected)!}>{label("Mở nội dung liên quan", "Open related item")} <FiCheck aria-hidden="true" /></Link>}</> : selectedId ? <p className="notification-inbox__detail-empty">{label("Thông báo này không còn khả dụng.", "This notification is no longer available.")}</p> : <p className="notification-inbox__detail-empty">{label("Chọn thông báo để xem chi tiết.", "Select a notification to read its details.")}</p>}
      </article>
    </section>
  );
}

export default NotificationInbox;

