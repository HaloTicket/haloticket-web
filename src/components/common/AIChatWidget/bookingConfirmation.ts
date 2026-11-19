import type { AiSystemAction } from "@/types/ai";

/** Một dòng vé trong thẻ xác nhận do máy chủ tính: giá và thành tiền lấy từ bảng giá thật, không phải từ mô hình. */
export interface ConfirmedTicketLine {
  ticketTypeId: string;
  tierName: string;
  quantity: number;
  price: number;
  subtotal: number;
  isSeated: boolean;
}

/** Nội dung xác nhận đặt vé đã được máy chủ kiểm chứng (hạng vé có thật, số lượng hợp lệ, giá và tổng tiền tính ở máy chủ). */
export interface ServerConfirmation {
  eventId: string;
  eventTitle: string;
  showtimeId: string | null;
  showtimeName: string | null;
  tickets: ConfirmedTicketLine[];
  seats: string[];
  totalPrice: number;
}

/** Thời gian giữ chỗ tạm của đơn tạo từ trợ lý, khớp với trang chọn vé (15 phút). */
export const PENDING_ORDER_HOLD_MS = 15 * 60 * 1000;

/** Sau chừng này thời gian, thẻ tương tác (giá, tình trạng vé) trong lịch sử đã cũ và không còn được dựng lại khi mở lại cuộc trò chuyện. */
export const STALE_ACTION_MS = 10 * 60 * 1000;

/** Đọc một giá trị JSON có thể đang ở dạng chuỗi hoặc đã là đối tượng; lỗi trả `null`. */
function asObject(value: unknown): Record<string, unknown> | null {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/**
 * Đọc thẻ xác nhận đặt vé từ kết quả công cụ do MÁY CHỦ trả về (`database_data`), không đọc phần mô hình tự viết (`extracted_args`).
 * Chỉ nhận khi máy chủ đánh dấu giá lấy từ bảng giá thật và mọi con số hợp lệ.
 *
 * @param action - Hành động hệ thống của tin nhắn.
 * @returns Nội dung đã kiểm chứng, hoặc `null` nếu thiếu hoặc không hợp lệ.
 */
export function parseServerConfirmation(action: Pick<AiSystemAction, "database_data">): ServerConfirmation | null {
  const outer = asObject(action.database_data);
  if (!outer || outer.status !== "waiting_for_user") return null;
  const data = asObject(outer.data);
  if (!data || data.prices_source !== "server" || typeof data.event_id !== "string" || !data.event_id) return null;
  if (!Array.isArray(data.tickets) || data.tickets.length === 0) return null;

  const tickets: ConfirmedTicketLine[] = [];
  for (const raw of data.tickets as Record<string, unknown>[]) {
    const quantity = Number(raw?.quantity);
    const price = Number(raw?.price);
    const subtotal = Number(raw?.subtotal);
    if (!raw || typeof raw.ticket_type_id !== "string" || !Number.isInteger(quantity) || quantity < 1 || !Number.isFinite(price) || price < 0 || !Number.isFinite(subtotal)) {
      return null;
    }
    tickets.push({
      ticketTypeId: raw.ticket_type_id,
      tierName: String(raw.tier_name ?? ""),
      quantity,
      price,
      subtotal,
      isSeated: raw.is_seated === true,
    });
  }
  const seats = Array.isArray(data.seats) ? (data.seats as unknown[]).filter((s): s is string => typeof s === "string") : [];
  return {
    eventId: data.event_id,
    eventTitle: String(data.event_title ?? ""),
    showtimeId: typeof data.showtime_id === "string" ? data.showtime_id : null,
    showtimeName: typeof data.showtime_name === "string" ? data.showtime_name : null,
    tickets,
    seats,
    totalPrice: tickets.reduce((sum, line) => sum + line.subtotal, 0),
  };
}

/** Thông tin hiển thị thêm của sự kiện khi dựng đơn tạm (có thể thiếu). */
export interface OrderExtras {
  eventLocation?: string;
  eventPoster?: string | null;
  eventTime?: string;
  /** Nhãn hiển thị cho vé tự do. */
  freeAdmissionLabel?: string;
}

/**
 * Dựng đơn tạm cho trang thanh toán từ nội dung xác nhận của máy chủ: giá lấy từ máy chủ, ghế (nếu có) là ghế khách đã chọn.
 * Hạng vé có ghế ngồi mà không có ghế cụ thể thì không dựng được (trả `null`): khách phải chọn ghế trên sơ đồ.
 *
 * @param confirmation - Nội dung xác nhận đã kiểm chứng.
 * @param nowMs - Thời điểm hiện tại (ms).
 * @param extras - Địa điểm, poster, giờ diễn nếu biết.
 * @returns Đơn tạm để lưu vào `haloticket_pending_order`, hoặc `null`.
 */
export function buildPendingOrder(confirmation: ServerConfirmation, nowMs: number, extras: OrderExtras = {}): Record<string, unknown> | null {
  const totalQuantity = confirmation.tickets.reduce((sum, line) => sum + line.quantity, 0);
  const hasSeats = confirmation.seats.length > 0;
  if (confirmation.tickets.some((line) => line.isSeated) && !hasSeats) return null;
  if (hasSeats && confirmation.seats.length !== totalQuantity) return null;

  const seatIds: string[] = [];
  const seatNames: Record<string, string> = {};
  if (hasSeats) {
    seatIds.push(...confirmation.seats);
  } else {
    let index = 0;
    for (const line of confirmation.tickets) {
      for (let i = 0; i < line.quantity; i++) {
        index += 1;
        const id = `${line.ticketTypeId}-AI-${nowMs}-${index}`;
        seatIds.push(id);
        seatNames[id] = `#${String(index).padStart(2, "0")}${extras.freeAdmissionLabel ? ` (${extras.freeAdmissionLabel})` : ""}`;
      }
    }
  }

  const cartItems = confirmation.tickets.map((line) => ({
    id: line.ticketTypeId,
    name: line.tierName,
    price: line.price,
    quantity: line.quantity,
    zoneId: line.ticketTypeId,
    zoneName: line.tierName,
    tierId: line.ticketTypeId,
    min_per_order: 1,
    max_per_order: Math.max(line.quantity, 1),
    is_seated: line.isSeated,
  }));
  const first = cartItems[0];
  return {
    eventId: confirmation.eventId,
    showtimeId: confirmation.showtimeId ?? undefined,
    eventTitle: confirmation.eventTitle,
    eventTime: extras.eventTime ?? "",
    eventLocation: extras.eventLocation ?? "",
    eventPoster: extras.eventPoster ?? null,
    zoneId: first.zoneId,
    zoneName: first.zoneName,
    ticketTypeName: cartItems.map((c) => `${c.quantity}x ${c.name}`).join(", "),
    cartItems,
    items: cartItems.map((c) => ({ ticketTypeId: c.id, quantity: c.quantity, unitPrice: c.price })),
    seatIds,
    seatNames,
    price: first.price,
    quantity: totalQuantity,
    totalAmount: confirmation.totalPrice,
    timestamp: nowMs,
    expiresAt: nowMs + PENDING_ORDER_HOLD_MS,
  };
}

/**
 * Sự kiện khách đang đặt vé: mã sự kiện trong hành động (bảng giá, sơ đồ ghế, xác nhận) gần nhất của cuộc trò chuyện. Gửi kèm mỗi yêu cầu để
 * máy chủ không phải đoán từ lịch sử (lịch sử chỉ giữ vài lượt cuối).
 *
 * @param messages - Các tin nhắn của cuộc trò chuyện, cũ trước mới sau.
 * @returns Mã sự kiện hoặc `undefined`.
 */
export function findSelectedEventId(messages: { actions?: Pick<AiSystemAction, "action" | "database_data">[] }[]): string | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    const actions = messages[i].actions;
    if (!actions) continue;
    for (let j = actions.length - 1; j >= 0; j--) {
      const { action, database_data } = actions[j];
      if (action !== "SHOW_TICKET_TYPES" && action !== "SHOW_SEATMAP" && action !== "USER_CONFIRMATION_REQUIRED") continue;
      const outer = asObject(database_data);
      const inner = action === "USER_CONFIRMATION_REQUIRED" ? asObject(outer?.data) : outer;
      const id = inner?.event_id;
      if (typeof id === "string" && id) return id;
    }
  }
  return undefined;
}

/**
 * Bỏ hành động (thẻ giá, sơ đồ, xác nhận) của các tin nhắn đã cũ để không dựng lại giá và tình trạng vé quá hạn khi mở lại cuộc trò chuyện;
 * phần văn bản của tin giữ nguyên.
 *
 * @param messages - Các tin nhắn đã nạp.
 * @param nowMs - Thời điểm hiện tại (ms).
 * @param maxAgeMs - Tuổi tối đa của hành động.
 * @returns Danh sách tin nhắn, tin cũ không còn `actions`.
 */
export function dropStaleActions<T extends { actions?: unknown[]; timestamp: Date }>(messages: T[], nowMs: number, maxAgeMs: number = STALE_ACTION_MS): T[] {
  return messages.map((message) =>
    message.actions && message.actions.length > 0 && nowMs - message.timestamp.getTime() > maxAgeMs ? { ...message, actions: undefined } : message
  );
}
