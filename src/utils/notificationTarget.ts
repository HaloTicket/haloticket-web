import { PATHS } from "@/routes/paths";
import type { NotificationItem } from "@/types/notification";
import { eventTargetOfNotification } from "@/utils/notificationLinks";

/** Vai trò người nhận thông báo, quyết định đích đến khi bấm vào thông báo. */
export type NotificationRole = "customer" | "organizer" | "admin";

/** Phần của thông báo dùng để xác định đích đến: loại, nội dung và biến đi kèm dạng JSON. */
type Notice = Pick<NotificationItem, "type" | "message" | "variablesJson">;

const PLAIN_CODE = /^[A-Za-z0-9_-]{1,100}$/;
const SAGA_ID = /Mã lời mời: ([a-f0-9-]{36})/i;
const ADMIN_EVENT_REF = /EV_[a-zA-Z0-9_-]+/;

/**
 * Đọc `variablesJson` của thông báo thành đối tượng.
 *
 * @returns Đối tượng biến, hoặc đối tượng rỗng nếu thiếu hoặc JSON sai định dạng.
 */
function variablesOf(notice: Notice): Record<string, unknown> {
  try {
    const raw = notice.variablesJson;
    if (typeof raw === "string" && raw.trim().startsWith("{")) {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
    }
  } catch {
    // JSON sai định dạng: coi như không có dữ liệu bổ sung
  }
  return {};
}

/** Mã đặt vé trong thông báo, chỉ nhận khi đó là mã thuần túy (không bao giờ là đường dẫn hay địa chỉ). */
function bookingCodeOf(notice: Notice): string | null {
  const code = variablesOf(notice).bookingCode;
  return typeof code === "string" && PLAIN_CODE.test(code) ? code : null;
}

/**
 * Đích đến của thông báo dành cho quản trị viên theo loại thông báo.
 *
 * @returns Đường dẫn, hoặc `null` nếu loại thông báo không có trang tương ứng.
 */
function adminTarget(notice: Notice): string | null {
  const type = notice.type || "";
  // khoản thanh toán cần người xử lý (thanh toán trễ, vé không phát hành được): trang đối soát liệt kê khoản này
  if (type === "PAYMENT_EXCEPTION") return PATHS.ADMIN_RECONCILIATION;
  if (type === "NEW_EVENT_APPROVAL" || type === "EVENT_UPDATED") return PATHS.ADMIN_EVENTS_APPROVAL;
  if (type.includes("PAYOUT")) return PATHS.ADMIN_FINANCE;
  return null;
}

/**
 * Đích đến khi bấm vào một thông báo, dùng chung cho chuông, toast và hộp thư. `null` nghĩa là ở yên tại chỗ: thông báo chỉ được đánh dấu đã đọc.
 * Loại thông báo chưa biết không bao giờ đưa ai về danh sách sự kiện của nhà tổ chức (hành vi dự phòng cũ).
 * Chỉ dùng mã và đường dẫn thuần túy lấy từ dữ liệu thông báo, không bao giờ dùng `link`.
 *
 * @param notice - Thông báo.
 * @param role - Vai trò của người đang xem.
 * @returns Đường dẫn đích, hoặc `null`.
 */
export function notificationTarget(notice: Notice, role: NotificationRole): string | null {
  if (role === "admin") {
    const known = adminTarget(notice);
    if (known) return known;
    // thông báo cũ dành cho quản trị viên có nêu mã sự kiện (EV_...) thì mở trang duyệt của sự kiện đó
    const ref = notice.message?.match(ADMIN_EVENT_REF)?.[0];
    return ref ? `${PATHS.ADMIN_EVENTS_APPROVAL}?eventId=${ref}` : null;
  }
  const type = notice.type || "";
  if (type === "GIFT_INVITATION") {
    const sagaId = notice.message?.match(SAGA_ID)?.[1];
    return sagaId ? `${PATHS.GIFT_ACCEPT}?sagaId=${encodeURIComponent(sagaId)}` : null;
  }
  if (type === "PAYOUT_APPROVED" || type === "PAYOUT_REQUESTED") return PATHS.REPORTS;
  if (type === "EVENT_APPROVED" || type === "EVENT_UPDATE_APPROVED" || type === "EVENT_REJECTED") return eventTargetOfNotification(notice);
  if (type === "TICKETS_ISSUED" || type === "TICKET_ISSUED") {
    const code = bookingCodeOf(notice);
    return code ? PATHS.ORDER_DETAIL(encodeURIComponent(code)) : PATHS.MY_TICKETS;
  }
  if (type.startsWith("RESALE_") || type.startsWith("GIFT_") || type.startsWith("TICKET_")) return PATHS.MY_TICKETS;
  return null;
}
