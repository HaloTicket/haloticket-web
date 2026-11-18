import { PATHS } from "@/routes/paths";
import type { NotificationItem } from "@/types/notification";

const PLAIN_ID = /^[A-Za-z0-9_-]{1,100}$/;

/**
 * Đích đến khi bấm vào thông báo duyệt sự kiện: trang chỉnh sửa đúng sự kiện đó nếu thông báo mang theo mã (`variablesJson.eventId`),
 * nếu không thì về danh sách sự kiện của nhà tổ chức. Chỉ dùng mã sự kiện, không bao giờ dùng `link` trong dữ liệu thông báo,
 * và chỉ khi đó là mã thuần túy, để thông báo không thể đưa ai tới đường dẫn hay địa chỉ khác.
 */
export function eventTargetOfNotification(notification: Pick<NotificationItem, "variablesJson">): string {
  try {
    const raw = notification.variablesJson;
    if (typeof raw === "string" && raw.trim().startsWith("{")) {
      const parsed = JSON.parse(raw) as { eventId?: unknown };
      if (typeof parsed.eventId === "string" && PLAIN_ID.test(parsed.eventId)) return PATHS.EVENT_MANAGE_EDIT(parsed.eventId);
    }
  } catch {
    // JSON sai định dạng: quay về danh sách
  }
  return PATHS.MY_EVENTS;
}
