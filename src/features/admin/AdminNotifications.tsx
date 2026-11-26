import { useEffect, useState } from "react";
import { Link, useOutletContext, useSearchParams } from "react-router-dom";
import { FiInbox, FiSend, FiShield } from "react-icons/fi";
import { NotificationInbox } from "@/components/notifications/NotificationInbox";
import { useLabel } from "@/components/notifications/useLabel";
import type { useNotificationSocket } from "@/hooks/useNotificationSocket";
import { PATHS } from "@/routes/paths";
import { notificationApi } from "@/services/notificationApi";
import { adminNotificationTarget } from "@/utils/adminNotificationTarget";
import { AdminAnnouncementForm } from "./components/AdminAnnouncementForm";
import { AdminAnnouncementModeration } from "./components/AdminAnnouncementModeration";

type Tab = "inbox" | "send" | "moderation";

export default function AdminNotifications() {
  const { label } = useLabel();
  const state = useOutletContext<ReturnType<typeof useNotificationSocket>>();
  const [params] = useSearchParams();
  const tab: Tab = params.get("tab") === "send" ? "send" : params.get("tab") === "moderation" ? "moderation" : "inbox";
  const [pending, setPending] = useState<number | null>(null);
  const inboxParams = new URLSearchParams(params);
  inboxParams.delete("tab");
  const inboxLink = inboxParams.size ? `?${inboxParams.toString()}` : PATHS.ADMIN_NOTIFICATIONS;
  const tabs = [
    { id: "inbox", to: inboxLink, Icon: FiInbox, text: label("Hộp thư", "Inbox") },
    { id: "send", to: "?tab=send", Icon: FiSend, text: label("Gửi thông báo", "Send notification") },
    { id: "moderation", to: "?tab=moderation", Icon: FiShield, text: label("Kiểm duyệt", "Moderation") },
  ] as const;

  useEffect(() => {
    if (tab === "moderation") return;
    const controller = new AbortController();
    notificationApi.listModeration(0, 1, "", controller.signal).then((page) => {
      if (!controller.signal.aborted) setPending(page.total);
    }).catch(() => undefined);
    return () => controller.abort();
  }, [tab]);

  return (
    <div className="space-y-4 pb-10">
      <nav
        aria-label={label("Thông báo hệ thống", "System notifications")}
        className="flex gap-1 overflow-x-auto border-b app-border"
      >
        {tabs.map(({ id, to, Icon, text }) => {
          const active = tab === id;
          return (
            <Link
              key={id}
              to={to}
              aria-current={active ? "page" : undefined}
              className={`inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-semibold whitespace-nowrap motion-safe:transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset ${active
                ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                : "border-transparent app-text-muted hover:app-text-main"}`}
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              <span>{text}</span>
              {id === "moderation" && pending !== null && pending > 0 && (
                <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-blue-100 px-1.5 text-[11px] leading-5 font-bold text-blue-800 tabular-nums dark:bg-blue-500/20 dark:text-blue-200">
                  <span className="sr-only">{label("Đang chờ duyệt", "Pending review")} </span>
                  {pending}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      {tab === "inbox" && <NotificationInbox
        notifications={state.notifications}
        loading={state.loading}
        error={state.error}
        onRetry={() => void state.reload()}
        onNotificationClick={() => {}}
        onMarkAsRead={state.markAsRead}
        onMarkAsUnread={state.markAsUnread}
        onMarkAllAsRead={state.markAllAsRead}
        onDelete={state.removeNotification}
        pendingIds={state.pendingIds}
        markingAll={state.markingAll}
        getTarget={adminNotificationTarget}
      />}
      <div hidden={tab !== "send"}><AdminAnnouncementForm /></div>
      {tab === "moderation" && <AdminAnnouncementModeration onPendingChange={setPending} />}
    </div>
  );
}
