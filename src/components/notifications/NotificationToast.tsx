import { useEffect, useRef } from "react";
import { toast as sonnerToast } from "sonner";
import type { NotificationItem } from "@/types";
import { claimNotificationToast } from "./notificationToastSession";

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
    const buttonBg = accentColor === "emerald" ? "#059669" : "#2563eb";
    sonnerToast.info(toast.title, {
      id,
      description: compactMessage(toast.message),
      duration: 4000,
      action: {
        label: actionText,
        onClick: () => {
          handlers.current.onToastClick(toast);
          closeCurrent();
        },
      },
      actionButtonStyle: {
        backgroundColor: buttonBg,
        color: "#ffffff",
      },
      onDismiss: closeCurrent,
      onAutoClose: closeCurrent,
    });
  }, [toast, actionText, accentColor, enabled]);

  return null;
}

export default NotificationToast;
