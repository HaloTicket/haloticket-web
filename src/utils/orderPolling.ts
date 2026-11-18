/** Các quyết định thuần túy của trang chi tiết đơn hàng sau khi thanh toán: khi nào hỏi lại server và trong lúc chờ thì hiển thị gì. */

/** Đọc lại đơn đặt vé khi còn `PENDING`: mỗi 2 giây trong 10 giây đầu, sau đó 3 đến 5 giây, tổng cộng khoảng 90 giây. */
export const PENDING_POLL_INTERVALS = [
  2000, 2000, 2000, 2000, 2000,
  3000, 3000, 4000, 4000,
  5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000,
];

/** Đọc lại vé: 2 giây trong 10 giây đầu, giãn dần tới khoảng 40 giây... */
export const TICKET_POLL_INTERVALS = [2000, 2000, 2000, 2000, 2000, 3000, 4000, 5000, 6000, 6000, 6000];
/** ...sau đó, không cần bấm gì, cứ 15 giây một lần trong 5 phút nữa. */
export const SLOW_POLL_INTERVAL_MS = 15000;
export const SLOW_POLL_COUNT = 20;

/** Loại dữ liệu đang được hỏi lại: đơn đặt vé hoặc vé. */
export type PollKind = "booking" | "tickets";

/**
 * Số mili giây chờ trước lần đọc kế tiếp sau `step` lần đã đọc, hoặc `null` khi lịch hỏi lại đã kết thúc.
 *
 * @param kind - Đang hỏi đơn hay vé.
 * @param step - Số lần đã đọc.
 * @returns Độ trễ tính bằng mili giây hoặc `null`.
 */
export function nextPollDelay(kind: PollKind, step: number): number | null {
  if (step < 0) return null;
  if (kind === "booking") return step < PENDING_POLL_INTERVALS.length ? PENDING_POLL_INTERVALS[step] : null;
  if (step < TICKET_POLL_INTERVALS.length) return TICKET_POLL_INTERVALS[step];
  return step < TICKET_POLL_INTERVALS.length + SLOW_POLL_COUNT ? SLOW_POLL_INTERVAL_MS : null;
}

/** `true` khi lịch hỏi lại nhanh đã hết: lúc này hiện thông báo vé về trễ trong khi vẫn tiếp tục hỏi chậm. */
export function ticketPollingIsLate(step: number): boolean {
  return step >= TICKET_POLL_INTERVALS.length;
}

/** Trạng thái đơn đặt vé; ngoài các giá trị đã biết, server có thể trả giá trị khác. */
export type OrderStatus = "PENDING" | "PAID" | "CONFIRMED" | "CANCELLED" | "EXPIRED" | string;

/** Đơn đã thanh toán (`PAID` hoặc `CONFIRMED`). */
export const isPaidStatus = (status?: string | null): boolean => status === "PAID" || status === "CONFIRMED";
/** Đơn đã đóng, không còn thanh toán được (`CANCELLED` hoặc `EXPIRED`). */
export const isClosedStatus = (status?: string | null): boolean => status === "CANCELLED" || status === "EXPIRED";

/** Việc cần làm tiếp sau khi đọc đơn: chờ xác nhận thanh toán, chờ vé được phát hành, hoặc xong. */
export type OrderNextStep = "poll-booking" | "poll-tickets" | "done";

/**
 * Quyết định việc tiếp theo sau khi đọc đơn. Đơn `PENDING` đang chờ cổng thanh toán xác nhận; đơn đã thanh toán nhưng chưa đủ vé thì chờ phát hành vé.
 *
 * @param status - Trạng thái đơn.
 * @param issuedTickets - Số vé đã phát hành.
 * @param expectedTickets - Số vé phải có.
 */
export function nextStepForBooking(status: string | undefined | null, issuedTickets: number, expectedTickets: number): OrderNextStep {
  if (status === "PENDING") return "poll-booking";
  if (isPaidStatus(status) && issuedTickets < expectedTickets) return "poll-tickets";
  return "done";
}

/** Nhãn trạng thái hiển thị của đơn hàng. */
export type OrderBadge = "confirming" | "pending" | "paid" | "cancelled" | "expired" | "other";

/**
 * Chọn nhãn trạng thái: đơn `PENDING` trong thời gian xác nhận là "đang xác nhận", không phải "chờ thanh toán".
 *
 * @param status - Trạng thái đơn.
 * @param confirming - `true` nếu đơn đang trong thời gian chờ xác nhận.
 */
export function orderBadge(status: string | undefined | null, confirming: boolean): OrderBadge {
  if (isPaidStatus(status)) return "paid";
  if (status === "PENDING") return confirming ? "confirming" : "pending";
  if (status === "CANCELLED") return "cancelled";
  if (status === "EXPIRED") return "expired";
  return "other";
}

/** Kết quả của yêu cầu phát hành lại vé: đã gửi yêu cầu, đã phát hành, quá sớm (kèm số giây chờ), chưa thanh toán hoặc không rõ. */
export type ReissueOutcome =
  | { kind: "requested" }
  | { kind: "already-issued" }
  | { kind: "too-soon"; retryAfterSeconds: number }
  | { kind: "not-paid" }
  | { kind: "unknown" };

/**
 * Đọc phản hồi của `POST /bookings/by-code/{code}/reissue` một cách phòng thủ: mọi giá trị bất ngờ đều thành `unknown`.
 *
 * @param raw - Nội dung phản hồi.
 * @returns Kết quả đã phân loại; `too-soon` mặc định chờ 30 giây nếu server không cho số hợp lệ.
 */
export function parseReissueResponse(raw: unknown): ReissueOutcome {
  const result = raw && typeof raw === "object" ? (raw as { result?: unknown; retryAfterSeconds?: unknown }).result : undefined;
  switch (result) {
    case "REQUESTED":
      return { kind: "requested" };
    case "ALREADY_ISSUED":
      return { kind: "already-issued" };
    case "NOT_PAID":
      return { kind: "not-paid" };
    case "TOO_SOON": {
      const seconds = Number((raw as { retryAfterSeconds?: unknown }).retryAfterSeconds);
      return { kind: "too-soon", retryAfterSeconds: Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : 30 };
    }
    default:
      return { kind: "unknown" };
  }
}

/**
 * Trang đơn hàng tự yêu cầu phát hành lại một lần khi lịch hỏi nhanh đã hết mà vé vẫn chưa về.
 *
 * @param step - Số lần đã đọc vé.
 * @param alreadyAsked - Đã tự yêu cầu trước đó chưa.
 */
export function shouldAutoReissue(step: number, alreadyAsked: boolean): boolean {
  return !alreadyAsked && ticketPollingIsLate(step);
}

/**
 * Nút tải lại thủ công chỉ yêu cầu phát hành lại với đơn đã thanh toán mà còn thiếu vé; các trường hợp khác chỉ tải lại dữ liệu.
 *
 * @param status - Trạng thái đơn.
 * @param issuedTickets - Số vé đã phát hành.
 * @param expectedTickets - Số vé phải có.
 */
export function shouldRequestReissue(status: string | undefined | null, issuedTickets: number, expectedTickets: number): boolean {
  return isPaidStatus(status) && expectedTickets > 0 && issuedTickets < expectedTickets;
}
