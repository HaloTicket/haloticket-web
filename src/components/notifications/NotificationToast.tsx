import { useEffect, useRef } from "react";
import { toast as sonnerToast } from "sonner";
import type { NotificationItem } from "@/types";
import { claimNotificationToast } from "@/utils/notificationToastSession";

export interface NotificationToastProps {
  toast: NotificationItem | null;
  onToastClick: (toast: NotificationItem) => void;
  onClose: () => void;
  actionText?: string;
  accentColor?: "blue" | "emerald";
  enabled?: boolean;
}

function compactMessage(message?: string): string | undefined {
  if (!message) return undefined;
  const quoted = message.match(/"([^"]+)"/);
  if (quoted && (message.includes("phê duyệt") || message.includes("cập nhật") || message.includes("xem xét"))) {
    return `"${quoted[1]}"`;
  }
  return message;
}

export function NotificationToast({
  toast,
  onToastClick,
  onClose,
  actionText = "Xem chi tiết",
  accentColor = "blue",
  enabled = true,
}: NotificationToastProps) {
  const handlers = useRef({ onToastClick, onClose });
  const currentToastId = useRef<string | null>(null);
  useEffect(() => { handlers.current = { onToastClick, onClose }; }, [onToastClick, onClose]);
  useEffect(() => { currentToastId.current = toast ? `${toast.userId}:${toast.id}` : null; }, [toast]);

  useEffect(() => {
    if (!toast) return;
    const contentKey = `${toast.title}:${compactMessage(toast.message) || ""}`;
    if (!enabled) {
      claimNotificationToast(toast.userId, toast.id, contentKey);
      sonnerToast.dismiss(`${toast.userId}:${toast.id}`);
      handlers.current.onClose();
      return;
    }
    const id = claimNotificationToast(toast.userId, toast.id, contentKey);
    if (!id) return;
    const closeCurrent = () => { if (currentToastId.current === id) handlers.current.onClose(); };
    sonnerToast.custom((toastId) => (
      <div className="app-bg-card border app-border shadow-lg rounded-xl p-4 w-full sm:w-[356px] flex flex-col pointer-events-auto">
        <h3 className="font-semibold text-sm app-text-main">{toast.title}</h3>
        {compactMessage(toast.message) && (
          <p className="text-xs app-text-muted mt-1.5">{compactMessage(toast.message)}</p>
        )}
        <button
          onClick={() => {
            handlers.current.onToastClick(toast);
            sonnerToast.dismiss(toastId);
          }}
          className={`mt-3 w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center transition-colors border ${
            accentColor === "emerald"
              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:hover:bg-emerald-500/30 dark:border-emerald-800/50"
              : "bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200 dark:bg-blue-500/20 dark:text-blue-400 dark:hover:bg-blue-500/30 dark:border-blue-800/50"
          }`}
        >
          {actionText}
        </button>
      </div>
    ), {
      id,
      duration: 5000,
      onDismiss: closeCurrent,
      onAutoClose: closeCurrent,
    });
  }, [toast, actionText, accentColor, enabled]);

  return null;
}

export default NotificationToast;
