import { FiInfo } from "react-icons/fi";
import type { ReactNode } from "react";
import type { IconType } from "react-icons";
import { useLabel } from "./useLabel";

export interface AnnouncementPreviewProps {
  title: string;
  message: string;
  source: string;
  Icon: IconType;
  tone: string;
  badge?: ReactNode;
}

/** Khung "Xem trước thông báo" dùng chung: hiển thị đúng cách một thông báo xuất hiện trong hộp thư của người nhận. */
export function AnnouncementPreview({ title, message, source, Icon, tone, badge }: AnnouncementPreviewProps) {
  const { label } = useLabel();
  return (
    <aside className="rounded-xl border app-border app-bg-card shadow-sm" aria-label={label("Xem trước thông báo", "Notification preview")}>
      <h2 className="flex items-center gap-3 border-b app-border px-4 py-3 text-[14px] font-bold app-text-main">
        <span className="grid size-7 place-items-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300" aria-hidden="true"><FiInfo /></span>
        {label("Xem trước thông báo", "Notification preview")}
      </h2>
      <div className="p-4">
        <div className="flex items-start gap-3 rounded-xl bg-blue-50 p-4 dark:bg-blue-500/10">
          <span className={`grid size-10 shrink-0 place-items-center rounded-full ${tone}`} aria-hidden="true"><Icon className="size-5" /></span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="wrap-anywhere text-[14px] font-bold app-text-main" data-testid="preview-title">{title.trim() || label("Tiêu đề thông báo", "Notification title")}</p>
              <span className="shrink-0 text-[11px] app-text-muted">{label("Vừa xong", "Just now")}</span>
            </div>
            <p className="text-[12px] app-text-muted">{source}</p>
            <p className="mt-1 line-clamp-4 whitespace-pre-wrap wrap-anywhere text-[13px] app-text-muted" data-testid="preview-message">{message.trim() || label("Nội dung thông báo sẽ hiển thị tại đây...", "The notification message will appear here...")}</p>
            {badge && <div className="mt-2">{badge}</div>}
          </div>
        </div>
      </div>
    </aside>
  );
}
