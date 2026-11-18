import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { toast as sonnerToast } from "sonner";
import type { NotificationItem } from "@/types";
import { claimNotificationToast } from "@/utils/notificationToastSession";

/** Props của toast thông báo: thông báo cần hiện, callback bấm/đóng, chữ nút, màu nhấn và cờ bật/tắt. */
export interface NotificationToastProps {
  toast: NotificationItem | null;
  onToastClick: (toast: NotificationItem) => void;
  onClose: () => void;
  actionText?: string;
  accentColor?: "blue" | "emerald";
  enabled?: boolean;
}

/** Rút gọn nội dung thông báo: đổi số dạng khoa học sang định dạng vi-VN; với thông báo phê duyệt, cập nhật hoặc xem xét chỉ giữ phần tên trong ngoặc kép. */
function compactMessage(message?: string): string | undefined {
  if (!message) return undefined;
  // đổi số dạng khoa học như 7.6E8đ thành dạng dễ đọc
  let text = message.replace(/(\d+(?:\.\d+)?)[eE]\+?(\d+)/g, (match) => {
    try {
      const num = Number(match);
      return num.toLocaleString("vi-VN");
    } catch {
      return match;
    }
  });
  const quoted = text.match(/"([^"]+)"/);
  if (quoted && (text.includes("phê duyệt") || text.includes("cập nhật") || text.includes("xem xét"))) {
    return `"${quoted[1]}"`;
  }
  return text;
}

/**
 * Thành phần không có giao diện riêng: hiện toast sonner cho thông báo mới, mỗi thông báo chỉ hiện một lần nhờ
 * `claimNotificationToast`. Khi `enabled` là false thì chỉ đánh dấu đã nhận và gọi `onClose`.
 */
export function NotificationToast({
  toast,
  onToastClick,
  onClose,
  actionText,
  accentColor = "blue",
  enabled = true,
}: NotificationToastProps) {
  const { t } = useTranslation();
  const effectiveActionText = actionText || t("Xem chi tiết");
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
    /** Gọi `onClose` nếu toast vừa đóng vẫn là toast hiện tại. */
    const closeCurrent = () => { if (currentToastId.current === id) handlers.current.onClose(); };
    sonnerToast.custom((toastId) => (
      <div className="app-bg-card border app-border shadow-lg rounded-xl p-4 w-full sm:w-[356px] flex flex-col pointer-events-auto">
        <h3 className="font-semibold text-sm app-text-main">{toast.title}</h3>
        {compactMessage(toast.message) && (
          <p className="text-xs app-text-muted mt-1.5 leading-relaxed">{compactMessage(toast.message)}</p>
        )}
        <button
          onClick={() => {
            handlers.current.onToastClick(toast);
            sonnerToast.dismiss(toastId);
          }}
          className="mt-3 w-full py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center transition-all bg-blue-600 hover:bg-blue-700 text-white shadow-sm active:scale-[0.98] cursor-pointer"
        >
          {effectiveActionText}
        </button>
      </div>
    ), {
      id,
      duration: 5000,
      onDismiss: closeCurrent,
      onAutoClose: closeCurrent,
    });
  }, [toast, effectiveActionText, accentColor, enabled]);

  return null;
}

export default NotificationToast;
