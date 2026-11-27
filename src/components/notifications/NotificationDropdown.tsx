import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { FiBell, FiChevronRight, FiX } from 'react-icons/fi';
import type { NotificationItem } from '@/types';
import { NotificationInbox, type NotificationActions } from './NotificationInbox';

/** Props của dropdown thông báo: danh sách, số chưa đọc, các callback, liên kết "xem tất cả", tiêu đề và trạng thái tải/lỗi. */
export interface NotificationDropdownProps extends NotificationActions {
  notifications: NotificationItem[];
  unreadCount: number;
  onMarkAllAsRead: () => Promise<void> | void;
  onNotificationClick: (item: NotificationItem) => void;
  viewAllLink: string;
  viewAllText?: string;
  titleText?: string;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

/**
 * Nút chuông kèm huy hiệu số thông báo chưa đọc (hiện "99+" khi quá 99) và bảng thả xuống chứa `NotificationInbox`.
 * Đóng bảng khi bấm ra ngoài hoặc nhấn Esc (trả focus về nút chuông).
 */
export function NotificationDropdown({
  notifications,
  unreadCount,
  onMarkAllAsRead,
  onNotificationClick,
  viewAllLink,
  viewAllText,
  titleText,
  loading,
  error,
  onRetry,
  onMarkAsRead,
  onMarkAsUnread,
  onDelete,
  pendingIds,
  markingAll,
}: NotificationDropdownProps) {
  const { t } = useTranslation();
  const displayTitle = titleText || t('Thông báo');
  const displayViewAll = viewAllText || t('Xem tất cả thông báo');

  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    panel.current?.querySelector<HTMLButtonElement>('button')?.focus();
    /** Đóng bảng khi lần bấm nằm ngoài vùng dropdown. */
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    /** Nhấn Esc thì đóng bảng và trả focus về nút chuông. */
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  return (
    <div className="relative" ref={root}>
      <button
        ref={trigger}
        type="button"
        className="relative flex items-center justify-center w-10 h-10 rounded-full app-text-muted hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        aria-label={`${displayTitle}${unreadCount ? `, ${unreadCount} ${t('chưa đọc')}` : ''}`}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
      >
        <FiBell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[16px] h-[16px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold grid place-items-center leading-none border-2 border-white dark:border-[#27272a]">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panel}
          id={id}
          role="region"
          aria-label={displayTitle}
          className="notification-enter fixed inset-x-3 top-16 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[440px] app-bg-card rounded-2xl shadow-2xl border app-border z-[9999] overflow-hidden flex flex-col max-h-[80vh] sm:max-h-[640px]"
        >
          <header className="flex items-center justify-between gap-2 px-4 pt-3 pb-1">
            <div className="flex items-center gap-2">
              <h2 className="text-[17px] font-bold app-text-main">{displayTitle}</h2>
              <p className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[12px] font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300" aria-live="polite">
                {unreadCount} {t('chưa đọc')}
              </p>
            </div>
            <button
              type="button"
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors app-text-muted cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500"
              aria-label={t('Đóng thông báo')}
              onClick={() => {
                setOpen(false);
                trigger.current?.focus();
              }}
            >
              <FiX className="w-4 h-4" />
            </button>
          </header>

          <div className="flex-1 overflow-hidden flex flex-col">
            <NotificationInbox
              compact
              notifications={notifications}
              loading={loading}
              error={error}
              onRetry={onRetry}
              onMarkAllAsRead={onMarkAllAsRead}
              onMarkAsRead={onMarkAsRead}
              onMarkAsUnread={onMarkAsUnread}
              onDelete={onDelete}
              pendingIds={pendingIds}
              markingAll={markingAll}
              onNotificationClick={(item) => {
                setOpen(false);
                onNotificationClick(item);
              }}
            />
          </div>

          {viewAllLink && (
            <Link
              to={viewAllLink}
              className="mx-3 mb-3 mt-1 flex items-center justify-center gap-2 rounded-lg bg-blue-50 px-3 py-2.5 font-semibold text-[13px] text-blue-700 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500"
              onClick={() => setOpen(false)}
            >
              {displayViewAll} <FiChevronRight aria-hidden="true" />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationDropdown;
