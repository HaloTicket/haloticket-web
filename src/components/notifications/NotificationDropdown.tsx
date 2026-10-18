import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { FiBell, FiX } from 'react-icons/fi';
import type { NotificationItem } from '@/types';
import { NotificationInbox } from './NotificationInbox';

export interface NotificationDropdownProps {
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
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
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
          className="absolute top-full right-0 sm:right-0 mt-2 w-[320px] sm:w-[360px] app-bg-card rounded-lg shadow-xl border app-border z-[9999] overflow-hidden flex flex-col max-h-[60vh] sm:max-h-[500px]"
        >
          <header className="flex items-center justify-between px-3 py-2 border-b app-border bg-slate-50 dark:bg-slate-800/50">
            <div>
              <h2 className="font-bold text-[13px] app-text-main">{displayTitle}</h2>
              <p className="text-[11px] app-text-muted mt-0.5">
                {unreadCount} {t('thông báo chưa đọc')}
              </p>
            </div>
            <button
              type="button"
              className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors app-text-muted cursor-pointer"
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
              onNotificationClick={(item) => {
                setOpen(false);
                onNotificationClick(item);
              }}
            />
          </div>

          {viewAllLink && (
            <Link
              to={viewAllLink}
              className="block text-center px-3 py-2 border-t app-border font-medium text-[12px] text-blue-600 dark:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              onClick={() => setOpen(false)}
            >
              {displayViewAll}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationDropdown;
