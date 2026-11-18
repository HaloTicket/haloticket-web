/**
 * Lỗi khi tạo hoặc cập nhật sự kiện mà nhà tổ chức bắt buộc phải thấy (sự kiện không được báo là đã lưu một cách âm thầm):
 * đồng bộ vé thất bại, hoặc số lượng vé thấp hơn số đã bán và đang giữ.
 */
export type EventSaveFailure =
  | { kind: "ticketsSyncFailed"; eventId?: string }
  | { kind: "quantityBelowSoldHeld"; name: string; sold?: number; held?: number; minAllowed?: number };

/** Trả về số nếu là số hữu hạn, ngược lại `undefined`. */
const asNumber = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

/**
 * Nhận diện lỗi lưu sự kiện từ phản hồi của server: HTTP 502 `TICKETS_SYNC_FAILED` hoặc HTTP 422 `QUANTITY_BELOW_SOLD_AND_HELD`.
 *
 * @param err - Lỗi bắt được từ lời gọi API.
 * @returns Mô tả lỗi, hoặc `null` nếu không thuộc hai loại trên.
 */
export function parseEventSaveFailure(err: unknown): EventSaveFailure | null {
  const res = (err as { response?: { status?: number; data?: Record<string, unknown> } } | null)?.response;
  const data = res?.data;
  if (!data || typeof data !== "object") return null;
  const code = data.code ?? data.message;
  if (res?.status === 502 && code === "TICKETS_SYNC_FAILED") {
    return { kind: "ticketsSyncFailed", eventId: typeof data.eventId === "string" ? data.eventId : undefined };
  }
  if (res?.status === 422 && code === "QUANTITY_BELOW_SOLD_AND_HELD") {
    return {
      kind: "quantityBelowSoldHeld",
      name: typeof data.name === "string" ? data.name : "",
      sold: asNumber(data.sold),
      held: asNumber(data.held),
      minAllowed: asNumber(data.minAllowed),
    };
  }
  return null;
}

/** Hàm dịch chuỗi theo khóa i18n, có thể kèm tham số nội suy. */
type Translate = (key: string, options?: Record<string, unknown>) => string;

/**
 * Tạo thông báo hiển thị cho một lỗi lưu sự kiện; số liệu chưa biết được thay bằng chữ "không rõ".
 *
 * @param failure - Lỗi đã nhận diện.
 * @param t - Hàm dịch.
 * @returns Nội dung thông báo.
 */
export function eventSaveFailureMessage(failure: EventSaveFailure, t: Translate): string {
  if (failure.kind === "ticketsSyncFailed") return t("tickets.sync.savedNotSynced");
  const unknown = t("tickets.quantity.unknown");
  return t("tickets.quantity.belowSoldHeldServer", {
    name: failure.name,
    sold: failure.sold ?? unknown,
    held: failure.held ?? unknown,
    min: failure.minAllowed ?? unknown,
  });
}

/** Tên sự kiện (event) phát ra sau khi lưu để layout quản lý sự kiện đọc lại sự kiện và trạng thái `ticketsSync`. */
export const EVENT_TICKETS_SYNC_CHANGED = "event-tickets-sync-changed";
