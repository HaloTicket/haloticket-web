import { useEffect, useId, useRef, useState } from 'react';
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
export function NotificationDropdown({ notifications, unreadCount, onMarkAllAsRead, onNotificationClick, viewAllLink, viewAllText = 'Xem tất cả thông báo', titleText = 'Thông báo', loading, error, onRetry }: NotificationDropdownProps) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    panel.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [open]);
  return <div className="relative" ref={root}>
    <button ref={trigger} type="button" className="relative min-h-11 min-w-11 grid place-items-center rounded-xl app-bg-card app-text-main border app-border" aria-label={`${titleText}${unreadCount ? `, ${unreadCount} chưa đọc` : ''}`} aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)}>
      <FiBell className="w-5 h-5" />
      {unreadCount > 0 && <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold grid place-items-center">{unreadCount > 99 ? '99+' : unreadCount}</span>}
    </button>
    {open && <div ref={panel} id={id} role="region" aria-label={titleText} className="notification-popover">
      <header className="flex items-center justify-between px-3 py-2 border-b app-border"><div><h2 className="font-bold text-base app-text-main">{titleText}</h2><p className="text-xs app-text-muted mt-1">{unreadCount} thông báo chưa đọc</p></div><button type="button" className="min-w-11 min-h-11 grid place-items-center rounded-lg" aria-label="Đóng thông báo" onClick={() => { setOpen(false); trigger.current?.focus(); }}><FiX /></button></header>
      <NotificationInbox compact notifications={notifications} loading={loading} error={error} onRetry={onRetry} onMarkAllAsRead={onMarkAllAsRead} onNotificationClick={item => { setOpen(false); onNotificationClick(item); }} />
      {viewAllLink && <Link to={viewAllLink} className="block text-center px-3 py-3 border-t app-border font-semibold text-sm text-blue-600 dark:text-blue-400" onClick={() => setOpen(false)}>{viewAllText}</Link>}
    </div>}
  </div>;
}
export default NotificationDropdown;

