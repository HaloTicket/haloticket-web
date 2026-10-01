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

export function NotificationToast({ toast, onToastClick, onClose, actionText = "Xem chi tiết", enabled = true }: NotificationToastProps) {
  const handlers = useRef({ onToastClick, onClose });
  const currentToastId = useRef<string | null>(null);
  useEffect(() => { handlers.current = { onToastClick, onClose }; }, [onToastClick, onClose]);
  useEffect(() => { currentToastId.current = toast ? `${toast.userId}:${toast.id}` : null; }, [toast]);

  useEffect(() => {
    if (!toast) return;
    if (!enabled) {
      claimNotificationToast(toast.userId, toast.id);
      sonnerToast.dismiss(`${toast.userId}:${toast.id}`);
      handlers.current.onClose();
      return;
    }
    const id = claimNotificationToast(toast.userId, toast.id);
    if (!id) return;
    const closeCurrent = () => { if (currentToastId.current === id) handlers.current.onClose(); };
    sonnerToast.info(toast.title, {
      id,
      description: toast.message,
      duration: 4000,
      action: { label: actionText, onClick: () => {
        handlers.current.onToastClick(toast);
        closeCurrent();
      } },
      onDismiss: closeCurrent,
      onAutoClose: closeCurrent,
    });
  }, [toast, actionText, enabled]);

  return null;
}

export default NotificationToast;
