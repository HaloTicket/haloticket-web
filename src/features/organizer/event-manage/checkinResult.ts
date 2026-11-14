// What the check-in screen tells the person at the gate. The ticket service answers a scan in two ways:
//  - HTTP 200 with a body { status, code, ... }: SUCCESS, ALREADY_USED (status DUPLICATED) or TICKET_LOCKED (status INVALID);
//  - HTTP 400 with { code, message } for WRONG_EVENT, WRONG_SHOWTIME, TICKET_NOT_FOUND, OUTSIDE_CHECKIN_WINDOW.
// A 403 means the signed-in person may not scan this event. Texts are Vietnamese keys for i18n (the page calls t()).

export type CheckinTone = "success" | "warning" | "error";

export interface CheckinOutcome {
  tone: CheckinTone;
  code: string;
  title: string;
  detail: string;
  ticketTypeName?: string;
  seatName?: string;
  // for a ticket already used: when it went in the first time
  checkedInAt?: string;
}

interface Message { tone: CheckinTone; title: string; detail: string }

const MESSAGES: Record<string, Message> = {
  SUCCESS: { tone: "success", title: "Check-in thành công", detail: "Cho khách vào cổng." },
  ALREADY_USED: { tone: "warning", title: "Vé đã được sử dụng", detail: "Vé này đã check-in trước đó, không cho vào lần nữa." },
  TICKET_LOCKED: { tone: "error", title: "Vé đang bị khóa", detail: "Vé đang rao bán lại, đang chuyển cho người khác hoặc tạm khóa. Không cho vào." },
  TICKET_REVOKED: { tone: "error", title: "Vé đã bị thu hồi", detail: "Vé đã hoàn tiền, đã hủy hoặc bị thu hồi. Không cho vào." },
  TICKET_TRANSFERRED: { tone: "error", title: "Vé đã được chuyển cho người khác", detail: "Mã này không còn hiệu lực vì chủ vé đã chuyển vé. Yêu cầu khách đưa mã vé hiện tại." },
  WRONG_EVENT: { tone: "error", title: "Vé thuộc sự kiện khác", detail: "Mã vé hợp lệ nhưng không phải của sự kiện này." },
  WRONG_SHOWTIME: { tone: "error", title: "Vé thuộc suất diễn khác", detail: "Mã vé không áp dụng cho suất diễn này." },
  TICKET_NOT_FOUND: { tone: "error", title: "Không tìm thấy vé", detail: "Mã không khớp vé nào. Kiểm tra lại mã hoặc quét lại." },
  OUTSIDE_CHECKIN_WINDOW: { tone: "error", title: "Ngoài khung giờ check-in", detail: "Chưa đến hoặc đã quá giờ cho phép check-in của suất này." },
  QUEUED: { tone: "warning", title: "Chưa có mạng, đã lưu lượt quét", detail: "Chưa xác nhận được vé này. Lượt quét sẽ gửi lại khi có mạng; xử lý theo quy trình dự phòng của ban tổ chức." },
  QUEUE_DUPLICATE: { tone: "warning", title: "Mã này đang chờ đồng bộ", detail: "Mã đã được lưu trước đó và sẽ gửi khi có mạng." },
  QUEUE_FULL: { tone: "error", title: "Hàng chờ đã đầy", detail: "Đã lưu quá nhiều lượt quét chưa gửi. Kiểm tra kết nối mạng trước khi quét tiếp." },
  FORBIDDEN: { tone: "error", title: "Không có quyền quét vé", detail: "Bạn không có quyền quét vé của sự kiện này." },
  UNKNOWN: { tone: "error", title: "Không check-in được", detail: "Có lỗi xảy ra, thử lại sau ít phút." },
};

interface ScanBody {
  status?: string | null;
  code?: string | null;
  ticketTypeName?: string | null;
  seatName?: string | null;
  checkedInAt?: string | null;
}

function build(code: string, body?: ScanBody | null): CheckinOutcome {
  const message = MESSAGES[code] ?? MESSAGES.UNKNOWN;
  const outcome: CheckinOutcome = { tone: message.tone, code: MESSAGES[code] ? code : "UNKNOWN", title: message.title, detail: message.detail };
  if (body?.ticketTypeName) outcome.ticketTypeName = body.ticketTypeName;
  if (body?.seatName) outcome.seatName = body.seatName;
  if (code === "ALREADY_USED" && body?.checkedInAt) outcome.checkedInAt = body.checkedInAt;
  return outcome;
}

/** The body of an HTTP 200 answer to a scan. Never reports success for DUPLICATED or INVALID. */
export function outcomeFromResponse(body: ScanBody | null | undefined): CheckinOutcome {
  if (!body) return build("UNKNOWN");
  const status = (body.status ?? "").toUpperCase();
  const code = (body.code ?? "").toUpperCase();
  if (status === "DUPLICATED") return build("ALREADY_USED", body);
  if (status === "INVALID") return build(code in MESSAGES ? code : "TICKET_LOCKED", body);
  if (code === "SUCCESS") return build("SUCCESS", body);
  if (code in MESSAGES && code !== "UNKNOWN") return build(code, body);
  // no explicit failure marker and no known code: a body with a check-in time is a completed check-in
  return body.checkedInAt && !status.length ? build("SUCCESS", body) : build("UNKNOWN", body);
}

/** A scan that could not be sent and was stored (or not) in the offline queue. */
export function outcomeFromQueue(result: "added" | "duplicate" | "full"): CheckinOutcome {
  return build(result === "added" ? "QUEUED" : result === "duplicate" ? "QUEUE_DUPLICATE" : "QUEUE_FULL");
}

/** An axios error from the scan request. */
export function outcomeFromError(err: unknown): CheckinOutcome {
  const response = (err as { response?: { status?: number; data?: { code?: string } } } | null)?.response;
  if (response?.status === 403) return build("FORBIDDEN");
  const code = (response?.data?.code ?? "").toUpperCase();
  return build(code in MESSAGES ? code : "UNKNOWN");
}
