import React from "react";
import { FiBell, FiX } from "react-icons/fi";
import type { NotificationItem } from "@/types";

export interface NotificationToastProps {
  toast: NotificationItem | null;
  onToastClick: (toast: NotificationItem) => void;
  onClose: () => void;
  actionText?: string;
  accentColor?: "blue" | "emerald";
}

export const NotificationToast: React.FC<NotificationToastProps> = ({
  toast,
  onToastClick,
  onClose,
  actionText = "Nhấn để xem chi tiết ngay →",
  accentColor = "blue",
}) => {
  if (!toast) return null;

  const isEmerald = accentColor === "emerald";

  return (
    <div className="fixed bottom-6 right-6 z-[9999] max-w-sm w-full bg-slate-900/95 text-white rounded-2xl shadow-2xl p-4 border border-blue-500/40 backdrop-blur-md flex items-start justify-between gap-3 animate-in slide-in-from-bottom-5 duration-300">
      <div
        className="flex-1 space-y-1 cursor-pointer"
        onClick={() => onToastClick(toast)}
      >
        <div className="flex items-center gap-2">
          <FiBell
            className={`w-4 h-4 shrink-0 animate-bounce ${isEmerald ? "text-emerald-400" : "text-blue-400"
              }`}
          />
          <h5
            className={`font-bold text-xs ${isEmerald ? "text-emerald-400" : "text-blue-400"
              }`}
          >
            {toast.title}
          </h5>
        </div>
        <p className="text-xs text-slate-300 line-clamp-2">{toast.message}</p>
        <span className="text-[10px] text-blue-400 font-semibold underline block mt-1">
          {actionText}
        </span>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="text-slate-400 hover:text-white p-1 cursor-pointer"
        title="Đóng thông báo"
      >
        <FiX className="w-4 h-4" />
      </button>
    </div>
  );
};

export default NotificationToast;
