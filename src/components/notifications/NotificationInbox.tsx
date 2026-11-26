import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FiCheck, FiInbox, FiSearch } from "react-icons/fi";

import type { NotificationItem } from "@/types";
import { notificationPriorities } from "./notificationPriority";
import { NotificationActionMenu } from "./NotificationActionMenu";
import { InternalBadge, PromotionBadge, SourceGlyph } from "./NotificationBadges";
import { isImportant, isInternalNotification, isOrganizer, isUnread, itemVisual, sourceText } from "./notificationMeta";
import { relativeTime, useLabel } from "./useLabel";

export interface NotificationActions {
  onMarkAsRead?: (id: string) => Promise<unknown> | void;
  onMarkAsUnread?: (id: string) => Promise<unknown> | void;
  onDelete?: (id: string) => Promise<boolean | undefined>;
  pendingIds?: ReadonlySet<string>;
  markingAll?: boolean;
}

/** Props của hộp thư thông báo: danh sách, trạng thái tải/lỗi, các callback, chế độ gọn và hàm tính đường dẫn đích. */
export interface NotificationInboxProps extends NotificationActions {
  notifications: NotificationItem[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onNotificationClick: (item: NotificationItem) => void;
  onMarkAllAsRead: () => Promise<void> | void;
  compact?: boolean;
  getTarget?: (item: NotificationItem) => string | null;
}

/** Bộ lọc: tất cả, chưa đọc, quan trọng (gồm Quan trọng và Khẩn cấp). */
type Filter = "all" | "unread" | "important";

const validDate = (item: NotificationItem) => {
  if (!item.createdAt) return null;
  const date = new Date(item.createdAt);
  return Number.isNaN(date.getTime()) ? null : date;
};

function isToday(item: NotificationItem) {
  const date = validDate(item);
  const now = new Date();
  return !!date && date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
}

function isMobileViewport() {
  return window.matchMedia?.("(max-width: 1023px)").matches ?? false;
}

/** Loại thông báo được xem ngay trong hộp, không điều hướng đi nơi khác. */
const inlineTypes = new Set(["SYSTEM_ANNOUNCEMENT", "ORGANIZER_ANNOUNCEMENT"]);

/**
 * Hộp thư thông báo. Chế độ `compact` dựng danh sách gọn (nhóm Hôm nay/Trước đó) cho bảng chuông; chế độ đầy đủ là
 * hai khung danh sách/chi tiết, thông báo đang xem lưu ở tham số URL `notificationId`.
 */
export function NotificationInbox({
  notifications,
  loading = false,
  error = null,
  onRetry,
  onNotificationClick,
  onMarkAllAsRead,
  onMarkAsRead,
  onMarkAsUnread,
  onDelete,
  pendingIds,
  markingAll = false,
  compact = false,
  getTarget,
}: NotificationInboxProps) {
  const { label, locale } = useLabel();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [compactSelectedId, setCompactSelectedId] = useState<string | null>(null);
  const detailRef = useRef<HTMLElement>(null);
  const latestSearchParams = useRef(searchParams);
  const mounted = useRef(false);
  const selectedId = searchParams.get("notificationId");
  const selected = notifications.find((item) => item.id === selectedId) ?? null;
  const compactSelected = notifications.find((item) => item.id === compactSelectedId);
  const unreadCount = notifications.filter(isUnread).length;
  const canMarkAll = !markingAll && !pendingIds?.size && unreadCount > 0;

  useEffect(() => { latestSearchParams.current = searchParams; }, [searchParams]);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => {
    if (!selectedId || !isMobileViewport()) return;
    requestAnimationFrame(() => detailRef.current?.scrollIntoView?.({ behavior: "smooth", block: "nearest" }));
  }, [selectedId]);

  const visible = useMemo(() => notifications.filter((item) => {
    if (filter === "unread" && !isUnread(item)) return false;
    if (filter === "important" && !isImportant(item)) return false;
    const needle = query.trim().toLowerCase();
    return !compact && needle ? `${item.title} ${item.message} ${item.eventTitle ?? ""}`.toLowerCase().includes(needle) : true;
  }), [notifications, filter, query, compact]);

  const canDelete = (item: NotificationItem) => Boolean(onDelete) && item.userId !== "ADMIN" && !item.id.startsWith("notif-");

  const select = (item: NotificationItem) => {
    if (compact && inlineTypes.has(item.type)) {
      setCompactSelectedId(item.id);
      return;
    }
    if (!compact) {
      const params = new URLSearchParams(searchParams);
      params.set("notificationId", item.id);
      setSearchParams(params);
    }
    onNotificationClick(item);
  };

  const deleteItem = async (id: string) => {
    const deleted = await onDelete?.(id);
    if (deleted && mounted.current && compactSelectedId === id) setCompactSelectedId(null);
    if (!deleted || !mounted.current || latestSearchParams.current.get("notificationId") !== id) return;
    const params = new URLSearchParams(latestSearchParams.current);
    params.delete("notificationId");
    setSearchParams(params, { replace: true });
  };

  const priorityBadge = (item: NotificationItem) => {
    const value = item.priority ?? "NORMAL";
    if (value === "NORMAL") return null;
    const priority = notificationPriorities[value];
    return <span className={`w-fit rounded px-1.5 py-0.5 text-[10px] font-semibold ${priority.tone}`}>{label(priority.label, { NORMAL: "Normal", IMPORTANT: "Important", URGENT: "Urgent" }[value])}</span>;
  };

  const hasContextBadges = (item: NotificationItem) =>
    item.priority === "IMPORTANT" || item.priority === "URGENT" || isInternalNotification(item)
    || (isOrganizer(item) && item.category === "PROMOTION");

  const menuFor = (item: NotificationItem) => (
    <NotificationActionMenu
      title={item.title}
      disabled={markingAll || pendingIds?.has(item.id)}
      onMarkRead={isUnread(item) && onMarkAsRead ? () => void onMarkAsRead(item.id) : undefined}
      onMarkUnread={!isUnread(item) && onMarkAsUnread ? () => void onMarkAsUnread(item.id) : undefined}
      onDelete={canDelete(item) ? () => void deleteItem(item.id) : undefined}
    />
  );

  const row = (item: NotificationItem) => {
    const { Icon, tone } = itemVisual(item);
    const date = validDate(item);
    const unread = isUnread(item);
    const isSelected = !compact && selectedId === item.id;
    return (
      <div key={item.id} role="group" aria-label={item.title} className={`flex items-start gap-1 rounded-xl px-2 py-1 ${isSelected || unread ? "bg-blue-50 dark:bg-blue-500/10" : ""}`}>
        <button
          type="button"
          className="flex min-w-0 flex-1 items-start gap-3 rounded-lg p-2 text-left transition-colors hover:bg-slate-100/70 focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-slate-800/50"
          onClick={() => select(item)}
          aria-current={isSelected ? "true" : undefined}
        >
          <span className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-full ${tone}`} aria-hidden="true"><Icon className="size-4" /></span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-blue-800 dark:text-blue-200"><SourceGlyph item={item} /><span className="truncate">{sourceText(item, label)}</span></span>
            <span className={`wrap-anywhere text-[13px] leading-tight ${unread ? "font-bold app-text-main" : "font-semibold app-text-main"}`}>{item.title}</span>
            <span className="line-clamp-2 text-[12px] leading-snug app-text-muted">{item.message}</span>
            {hasContextBadges(item) && <span className="mt-1 flex flex-wrap items-center gap-1.5">{priorityBadge(item)}<InternalBadge item={item} label={label} /><PromotionBadge item={item} label={label} /></span>}
          </span>
        </button>
        <div className="flex shrink-0 flex-col items-end gap-0.5 pt-2">
          <span className="flex items-center gap-2">
            {unread && <span className="size-2 rounded-full bg-blue-500" role="img" aria-label={label("Chưa đọc", "Unread")} />}
            {date && <time className="text-[11px] app-text-muted whitespace-nowrap" dateTime={date.toISOString()} title={date.toLocaleString(locale)}>{relativeTime(date, locale)}</time>}
          </span>
          {menuFor(item)}
        </div>
      </div>
    );
  };

  const filters = (
    <div className="flex gap-1" role="group" aria-label={label("Lọc thông báo", "Filter notifications")}>
      {(["all", "unread", "important"] as const).map((value) => {
        const text = value === "all" ? label("Tất cả", "All")
          : value === "unread" ? `${label("Chưa đọc", "Unread")}${unreadCount ? ` (${unreadCount})` : ""}`
            : label("Quan trọng", "Important");
        return <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)} className={`min-h-9 border-b-2 px-3 text-[13px] font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 ${filter === value ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400" : "border-transparent app-text-muted hover:app-text-main"}`}>{text}</button>;
      })}
    </div>
  );

  const markAll = (
    <button type="button" className="inline-flex items-center gap-1 whitespace-nowrap text-[12px] font-semibold text-blue-600 hover:underline disabled:opacity-50 dark:text-blue-400" onClick={() => void onMarkAllAsRead()} disabled={!canMarkAll}>
      <FiCheck aria-hidden="true" />{compact ? label("Đọc tất cả", "Mark all read") : label("Đánh dấu tất cả đã đọc", "Mark all as read")}
    </button>
  );

  const emptyText = notifications.length === 0 ? label("Bạn đã xem hết thông báo.", "You're all caught up.")
    : filter === "unread" ? label("Không có thông báo chưa đọc.", "No unread notifications.")
      : filter === "important" ? label("Không có thông báo quan trọng.", "No important notifications.")
        : label("Không tìm thấy thông báo phù hợp.", "No notifications match your filters.");

  const body = loading ? <p className="p-6 text-center text-[13px] app-text-muted" role="status">{label("Đang tải thông báo…", "Loading notifications…")}</p>
    : error ? <div className="flex flex-col items-center gap-2 p-6 text-center" role="alert"><p className="text-[13px] text-rose-500">{error}</p>{onRetry && <button type="button" className="rounded-md bg-rose-50 px-3 py-1.5 text-[13px] font-medium text-rose-600 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400" onClick={onRetry}>{label("Thử lại", "Try again")}</button>}</div>
      : visible.length === 0 ? <p className="p-6 text-center text-[13px] app-text-muted">{emptyText}</p>
        : null;

  if (compact) {
    const today = visible.filter(isToday);
    const earlier = visible.filter((item) => !isToday(item));
    const heading = (text: string) => <h3 className="sticky top-0 z-10 mt-1 rounded-lg bg-slate-100 px-3 py-1.5 text-[12px] font-bold app-text-main dark:bg-slate-800">{text}</h3>;
    return (
      <section className="flex w-full flex-1 flex-col overflow-hidden app-bg-card" aria-label={label("Thông báo", "Notifications")}>
        <div className="flex items-center justify-between gap-2 border-b app-border px-3">
          {filters}
          {markAll}
        </div>
        <div className="max-h-[50vh] min-h-[150px] flex-1 overflow-y-auto px-1 pb-2" data-menu-boundary>
          {compactSelected ? (
            <article key={compactSelected.id} className="notification-enter space-y-2 p-3" aria-label={label("Chi tiết thông báo", "Notification details")}>
              <button type="button" className="text-xs font-semibold app-text-brand" onClick={() => setCompactSelectedId(null)}>&larr; {label("Quay lại", "Back")}</button>
              <p className="flex items-center gap-1.5 text-xs font-semibold text-blue-800 dark:text-blue-200"><SourceGlyph item={compactSelected} />{sourceText(compactSelected, label)}</p>
              <h3 className="wrap-anywhere text-sm font-bold app-text-main">{compactSelected.title}</h3>
              <div className="flex flex-wrap gap-1.5">{priorityBadge(compactSelected)}<InternalBadge item={compactSelected} label={label} /><PromotionBadge item={compactSelected} label={label} /></div>
              <p className="whitespace-pre-wrap wrap-anywhere text-sm app-text-main">{compactSelected.message}</p>
            </article>
          ) : body ?? <div className="flex flex-col">
            {today.length > 0 && <>{heading(label("Hôm nay", "Today"))}{today.map(row)}</>}
            {earlier.length > 0 && <>{heading(label("Trước đó", "Earlier"))}{earlier.map(row)}</>}
          </div>}
        </div>
      </section>
    );
  }

  const selectedVisual = selected ? itemVisual(selected) : null;
  const selectedDate = selected ? validDate(selected) : null;
  const target = selected ? getTarget?.(selected) : null;
  const clearSelection = () => {
    const params = new URLSearchParams(searchParams);
    params.delete("notificationId");
    setSearchParams(params);
  };

  return (
    <section className="grid min-h-96 gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]" aria-label={label("Hộp thư thông báo", "Notification inbox")}>
      <div className="flex min-w-0 flex-col overflow-hidden rounded-xl border app-border app-bg-card shadow-sm">
        <header className="flex items-center justify-between gap-2 border-b app-border p-3">
          <h2 className="text-[14px] font-bold app-text-main">{filter === "unread" ? label("Chưa đọc", "Unread") : filter === "important" ? label("Quan trọng", "Important") : label("Tất cả", "All")} ({visible.length})</h2>
          {markAll}
        </header>
        <div className="flex flex-col gap-2 border-b app-border px-3 pb-2 pt-1">
          {filters}
          <label className="flex items-center gap-2 rounded-lg border border-transparent bg-slate-100 px-2.5 py-1.5 text-[13px] focus-within:ring-2 focus-within:ring-blue-500/30 dark:bg-black/20">
            <FiSearch className="app-text-muted" aria-hidden="true" />
            <span className="sr-only">{label("Tìm thông báo", "Search notifications")}</span>
            <input className="w-full border-none bg-transparent outline-none app-text-main placeholder-slate-400" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={label("Tìm kiếm...", "Search...")} />
          </label>
        </div>
        <div className="max-h-[60vh] min-h-48 flex-1 divide-y divide-transparent overflow-y-auto p-1 lg:max-h-[70vh]" aria-live="polite" data-menu-boundary>
          {body ?? visible.map(row)}
        </div>
      </div>
      <article key={selected?.id} ref={detailRef} className="notification-enter min-w-0 rounded-xl border app-border app-bg-card p-4 shadow-sm sm:p-6" aria-label={label("Chi tiết thông báo", "Notification details")} aria-live="polite">
        {selected && selectedVisual ? <>
          <button type="button" className="mb-3 text-[13px] font-medium app-text-muted hover:app-text-main lg:hidden" onClick={clearSelection}>{label("Đóng chi tiết", "Close details")}</button>
          <div className="flex items-start gap-3 border-b app-border pb-4">
            <span className={`grid size-11 shrink-0 place-items-center rounded-full ${selectedVisual.tone}`} aria-hidden="true"><selectedVisual.Icon className="size-5" /></span>
            <div className="min-w-0 flex-1">
              <h2 className="wrap-anywhere text-lg font-bold leading-tight app-text-main">{selected.title}</h2>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] app-text-muted">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2 py-0.5 font-bold text-blue-800 dark:bg-blue-500/10 dark:text-blue-200"><SourceGlyph item={selected} />{sourceText(selected, label)}</span>
                {priorityBadge(selected)}<InternalBadge item={selected} label={label} /><PromotionBadge item={selected} label={label} />
                {selectedDate && <time dateTime={selectedDate.toISOString()}>{selectedDate.toLocaleString(locale)}</time>}
              </p>
            </div>
            {menuFor(selected)}
          </div>
          <p className="mt-4 whitespace-pre-wrap wrap-anywhere text-sm leading-relaxed app-text-main">{selected.message}</p>
          {target && <Link className="mt-6 inline-flex w-fit items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-blue-700" to={target}>{label("Mở nội dung liên quan", "Open related item")} <FiCheck aria-hidden="true" /></Link>}
        </> : selectedId && !loading ? <p className="text-[13px] app-text-muted">{label("Thông báo này không còn khả dụng.", "This notification is no longer available.")}</p>
          : <div className="hidden h-full min-h-48 flex-col items-center justify-center gap-2 text-center app-text-muted lg:flex"><FiInbox className="size-8" aria-hidden="true" /><p className="text-[13px]">{label("Chọn một thông báo để xem chi tiết.", "Select a notification to view its details.")}</p></div>}
      </article>
    </section>
  );
}

export default NotificationInbox;
