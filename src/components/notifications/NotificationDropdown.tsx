import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { FiBell, FiCheckSquare } from "react-icons/fi";
import type { NotificationItem } from "@/types";

export interface NotificationDropdownProps {
  notifications: NotificationItem[];
  unreadCount: number;
  onMarkAllAsRead: () => Promise<void> | void;
  onNotificationClick: (item: NotificationItem) => void;
  viewAllLink: string;
  viewAllText?: string;
  titleText?: string;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  notifications,
  unreadCount,
  onMarkAllAsRead,
  onNotificationClick,
  viewAllLink,
  viewAllText = "Xem chi tiết →",
  titleText = "Thông báo hệ thống",
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleItemClick = (n: NotificationItem) => {
    setShowNotifications(false);
    onNotificationClick(n);
  };

  return (
    <div className="relative" ref={notifRef}>
      <button
        type="button"
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative p-2 rounded-xl app-bg-card app-text-main border app-border hover:opacity-80 transition-all cursor-pointer"
        title={titleText}
      >
        <FiBell className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Notification Popover Box */}
      {showNotifications && (
        <div className="absolute right-0 mt-2 w-80 sm:w-90 app-bg-card border app-border rounded-2xl shadow-xl p-3.5 space-y-3 z-50 animate-in zoom-in-95">
          <div className="flex items-center justify-between border-b app-border pb-2">
            <h4 className="text-xs font-bold app-text-main flex items-center gap-1.5">
              <FiBell className="w-3.5 h-3.5 text-blue-600" />
              <span>
                {titleText} ({unreadCount} mới)
              </span>
            </h4>
            <button
              type="button"
              onClick={onMarkAllAsRead}
              className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              Đánh dấu đã đọc
            </button>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto no-scrollbar">
            {notifications.length === 0 ? (
              <p className="text-xs text-center py-6 text-slate-400 font-medium">
                Không có thông báo mới.
              </p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleItemClick(n)}
                  className={`p-2.5 rounded-xl border transition-colors space-y-1 cursor-pointer text-xs ${n.readStatus
                      ? "app-bg-subnav border-slate-200 dark:border-slate-800 opacity-70"
                      : "bg-blue-50/50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/60 font-semibold"
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold app-text-main flex items-center gap-1.5">
                      <FiCheckSquare className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span>{n.title}</span>
                    </span>
                    <span className="text-[10px] app-text-muted">
                      {n.createdAt
                        ? new Date(n.createdAt).toLocaleTimeString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                        : "Vừa xong"}
                    </span>
                  </div>
                  <p className="text-[11px] app-text-muted leading-snug">
                    {n.message}
                  </p>
                </div>
              ))
            )}
          </div>

          {viewAllLink && (
            <div className="pt-2 border-t app-border text-center">
              <Link
                to={viewAllLink}
                onClick={() => setShowNotifications(false)}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                {viewAllText}
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
