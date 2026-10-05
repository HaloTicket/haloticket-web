import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FiAlertCircle, FiBell, FiCalendar, FiCheck, FiSearch } from "react-icons/fi";
import { useTranslation } from "react-i18next";

import type { NotificationItem } from "@/types";

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
    const unread = isUnread(item);
    const isSelected = mode === "full" && selectedId === item.id;
    return (
      <button
        type="button"
        className={`w-full flex items-start gap-2.5 p-3 text-left transition-colors border-b app-border hover:bg-slate-50 dark:hover:bg-slate-800/50 ${isSelected ? "bg-blue-50 dark:bg-blue-900/20" : "app-bg-card"}`}
        key={item.id}
        onClick={() => select(item)}
        aria-current={isSelected ? "true" : undefined}
      >
        <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5 ${unread ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`} aria-hidden="true"><Icon className="w-4 h-4" /></span>
        <span className="flex-1 min-w-0 flex flex-col gap-0.5">
          <span className="flex items-start justify-between gap-2">
            <span className={`font-semibold text-[12px] leading-tight truncate ${unread ? 'app-text-main' : 'app-text-muted'}`}>{item.title}</span>
            {unread && <span className="w-1.5 h-1.5 mt-0.5 rounded-full bg-blue-500 flex-shrink-0" aria-label={label("Chưa đọc", "Unread")} />}
          </span>
          <span className={`text-[11px] line-clamp-2 leading-snug ${unread ? 'app-text-main' : 'app-text-muted opacity-80'}`}>{item.message}</span>
          <time className="text-[10px] app-text-muted opacity-70 mt-0.5" dateTime={date?.toISOString()} title={date?.toLocaleString(locale) ?? label("Thời gian không khả dụng", "Time unavailable")}>{relativeTime(item, locale)}</time>
        </span>
      </button>
    );
  };

  if (compact) {
    const today = compactItems.filter(isToday);
    const earlier = compactItems.filter((item) => !isToday(item));
    return (
      <section className="flex flex-col w-full flex-1 overflow-hidden app-bg-card" aria-label={label("Thông báo", "Notifications")}>
        <div className="flex items-center justify-between border-b app-border px-2 bg-slate-50 dark:bg-slate-800/20" role="group" aria-label={label("Trạng thái thông báo", "Notification status")}>
          <div className="flex">
            {(["all", "unread"] as const).map((filter) => <button key={filter} type="button" className={`px-2.5 py-2 text-[12px] font-semibold border-b-2 transition-colors ${compactFilter === filter ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent app-text-muted hover:app-text-main'}`} aria-pressed={compactFilter === filter} onClick={() => setCompactFilter(filter)}>{filter === "all" ? label("Tất cả", "All") : label("Chưa đọc", "Unread")}</button>)}
          </div>
          <button type="button" className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50 font-medium px-2 py-1" onClick={() => void onMarkAllAsRead()} disabled={!notifications.some(isUnread)}>{label(compact ? "Đọc tất cả" : "Đánh dấu tất cả đã đọc", "Mark all as read")}</button>
        </div>
        <div className="flex-1 overflow-y-auto min-h-[150px] max-h-[350px]">
          {loading ? <p className="p-6 text-center text-[13px] app-text-muted" role="status">{label("Đang tải thông báo…", "Loading notifications…")}</p> : error ? <div className="p-6 text-center flex flex-col items-center gap-2" role="alert"><p className="text-[13px] text-rose-500">{error}</p>{onRetry && <button type="button" className="px-3 py-1 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-md text-[13px] font-medium hover:bg-rose-100 dark:hover:bg-rose-500/20" onClick={onRetry}>{label("Thử lại", "Try again")}</button>}</div> : compactItems.length === 0 ? <p className="p-6 text-center text-[13px] app-text-muted">{notifications.length === 0 ? label("Bạn đã xem hết thông báo.", "You're all caught up.") : label("Không có thông báo chưa đọc.", "No unread notifications.")}</p> : <div className="flex flex-col">
            {today.length > 0 && <><h3 className="px-3 py-1.5 text-[10px] font-bold uppercase app-text-muted tracking-wider app-bg-subnav sticky top-0 z-10 border-b app-border shadow-sm">{label("Hôm nay", "Today")}</h3>{today.map((item) => row(item, "compact"))}</>}
            {earlier.length > 0 && <><h3 className="px-3 py-1.5 text-[10px] font-bold uppercase app-text-muted tracking-wider app-bg-subnav sticky top-0 z-10 border-b app-border shadow-sm">{label("Trước đó", "Earlier")}</h3>{earlier.map((item) => row(item, "compact"))}</>}
          </div>}
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col md:flex-row h-full max-h-[75vh] overflow-hidden app-bg-card rounded-xl border app-border shadow-sm" aria-label="Notification inbox">
      <div className="w-full md:w-[320px] lg:w-[380px] flex-shrink-0 flex flex-col border-r app-border app-bg-subnav">
        <header className="flex items-center justify-between p-3 border-b app-border app-bg-card">
          <p className="font-semibold text-[13px] app-text-main">{label("Chưa đọc", "Unread")}: {notifications.filter(isUnread).length}</p>
          <button type="button" className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50 font-medium" onClick={() => void onMarkAllAsRead()} disabled={!notifications.some(isUnread)}>{label(compact ? "Đọc tất cả" : "Đánh dấu tất cả đã đọc", "Mark all as read")}</button>
        </header>
        <div className="p-3 flex flex-col gap-2.5 border-b app-border app-bg-card">
          <label className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-100 dark:bg-black/20 border border-transparent rounded-lg text-[13px] w-full focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
            <FiSearch className="app-text-muted" aria-hidden="true"/>
            <span className="sr-only">{label("Tìm thông báo", "Search notifications")}</span>
            <input className="bg-transparent border-none outline-none w-full app-text-main placeholder-slate-400 dark:placeholder-slate-500" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={label("Tìm kiếm...", "Search...")} />
          </label>
          <div className="flex gap-3 items-center text-[11px] app-text-muted">
            <label className="flex items-center gap-1.5">{label("Trạng thái", "Status")}: <select className="bg-transparent font-medium app-text-main cursor-pointer outline-none" value={readFilter} onChange={(event) => setReadFilter(event.target.value as ReadFilter)}><option value="all">{label("Tất cả", "All")}</option><option value="unread">{label("Chưa đọc", "Unread")}</option></select></label>
            <label className="flex items-center gap-1.5">{label("Loại", "Type")}: <select className="bg-transparent font-medium app-text-main cursor-pointer outline-none" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as TypeFilter)}><option value="all">{label("Tất cả", "All")}</option><option value="event">{label("Sự kiện", "Event")}</option><option value="system">{label("Hệ thống", "System")}</option><option value="alert">{label("Cảnh báo", "Alert")}</option></select></label>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto" aria-live="polite">
          {loading ? <p className="p-6 text-center text-[13px] app-text-muted" role="status">{label("Đang tải thông báo…", "Loading notifications…")}</p> : error ? <div className="p-6 text-center flex flex-col items-center gap-2" role="alert"><p className="text-[13px] text-rose-500">{error}</p>{onRetry && <button type="button" className="px-3 py-1.5 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-md text-[13px] font-medium hover:bg-rose-100 dark:hover:bg-rose-500/20" onClick={onRetry}>{label("Thử lại", "Try again")}</button>}</div> : notifications.length === 0 ? <p className="p-6 text-center text-[13px] app-text-muted">{label("Bạn đã xem hết thông báo.", "You're all caught up.")}</p> : filtered.length === 0 ? <p className="p-6 text-center text-[13px] app-text-muted">{label("Không tìm thấy thông báo phù hợp.", "No notifications match your filters.")}</p> : filtered.map((item) => row(item, "full"))}
        </div>
      </div>
      <article ref={detailRef} className={`flex-1 flex-col p-6 overflow-y-auto app-bg-card ${selected || selectedId ? "flex" : "hidden md:flex"} relative`} aria-label={label("Chi tiết thông báo", "Notification details")} aria-live="polite">
        {selected ? <>
          <button type="button" className="md:hidden flex items-center gap-1.5 mb-5 text-[13px] font-medium app-text-muted hover:app-text-main" onClick={() => { const params = new URLSearchParams(searchParams); params.delete("notificationId"); setSearchParams(params); }}>&larr; {label("Quay lại", "Back")}</button>
          <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-4">
            <span className="px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-500/10">{localizedType(selected.type, label)}</span>
            {validDate(selected) && <time className="app-text-muted font-medium" dateTime={validDate(selected)!.toISOString()}>{validDate(selected)!.toLocaleString(locale)}</time>}
          </div>
          <h2 className="text-lg sm:text-xl font-bold mb-3 app-text-main leading-tight">{selected.title}</h2>
          <p className="text-[13px] sm:text-sm app-text-main opacity-90 whitespace-pre-wrap leading-relaxed">{selected.message}</p>
          {getTarget?.(selected) && <Link className="inline-flex items-center gap-2 mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg text-[13px] font-semibold hover:bg-blue-700 w-fit transition-colors shadow-sm" to={getTarget(selected)!}>{label("Mở nội dung liên quan", "Open related item")} <FiCheck aria-hidden="true" /></Link>}
        </> : selectedId ? <div className="flex-1 flex flex-col items-center justify-center text-center max-w-xs mx-auto opacity-60"><FiAlertCircle className="w-10 h-10 mb-3 app-text-muted" /><p className="text-[13px] app-text-muted">{label("Thông báo này không còn khả dụng.", "This notification is no longer available.")}</p></div> : <div className="flex-1 flex flex-col items-center justify-center text-center max-w-xs mx-auto opacity-60"><FiBell className="w-10 h-10 mb-3 app-text-muted" /><p className="text-[13px] app-text-muted">{label("Chọn thông báo để xem chi tiết.", "Select a notification to read its details.")}</p></div>}
      </article>
    </section>
  );
}

export default NotificationInbox;

