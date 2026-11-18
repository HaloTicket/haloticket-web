/** Khóa thông báo lỗi (i18n) hiển thị cho người mua khi tạo đơn thất bại. */
export type CheckoutErrorKey =
  | "tickets.error.soldOut"
  | "tickets.error.stockBusy"
  | "tickets.error.reservationRefused"
  | "tickets.error.reservationClosed"
  | "tickets.error.quantityOutOfRange"
  | "tickets.error.invalidOrder"
  | "tickets.error.seatCountMismatch"
  | "tickets.error.bookingCreateFailed"
  | "tickets.error.voucherRefused"
  | "tickets.error.unknown";

/** Quy tắc xử lý một mã lỗi: khóa thông báo, và cờ `backToSelection` cho biết có nên đưa người dùng về bước chọn vé không. */
interface CheckoutErrorRule { key: CheckoutErrorKey; backToSelection: boolean }

export const CHECKOUT_ERROR_CODES: Record<string, CheckoutErrorRule> = {
  TICKET_SOLD_OUT: { key: "tickets.error.soldOut", backToSelection: true },
  TICKET_STOCK_UNAVAILABLE: { key: "tickets.error.stockBusy", backToSelection: false },
  TICKET_RESERVATION_REFUSED: { key: "tickets.error.reservationRefused", backToSelection: false },
  RESERVATION_CLOSED: { key: "tickets.error.reservationClosed", backToSelection: true },
  QUANTITY_OUT_OF_RANGE: { key: "tickets.error.quantityOutOfRange", backToSelection: true },
  INVALID_ORDER_ITEMS: { key: "tickets.error.invalidOrder", backToSelection: false },
  DUPLICATE_SEAT_IDS: { key: "tickets.error.invalidOrder", backToSelection: false },
  SEAT_COUNT_EXCEEDS_QUANTITY: { key: "tickets.error.seatCountMismatch", backToSelection: true },
  SEAT_COUNT_MISMATCH: { key: "tickets.error.seatCountMismatch", backToSelection: true },
  BOOKING_CREATE_FAILED: { key: "tickets.error.bookingCreateFailed", backToSelection: false },
  VOUCHER_NOT_APPLICABLE: { key: "tickets.error.voucherRefused", backToSelection: false },
};

/** `detail` là câu server viết cho người mua (chỉ với voucher bị từ chối, vì lý do mỗi lần một khác). */
export function resolveCheckoutError(err: unknown): CheckoutErrorRule & { code?: string; detail?: string } {
  const e = err as { response?: { data?: { message?: unknown; code?: unknown } }; message?: unknown } | null;
  const candidates = [e?.response?.data?.message, e?.response?.data?.code, e?.message];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && Object.prototype.hasOwnProperty.call(CHECKOUT_ERROR_CODES, candidate)) {
      const detail = e?.response?.data?.message;
      if (candidate === "VOUCHER_NOT_APPLICABLE" && typeof detail === "string" && detail !== candidate) {
        return { ...CHECKOUT_ERROR_CODES[candidate], code: candidate, detail };
      }
      return { ...CHECKOUT_ERROR_CODES[candidate], code: candidate };
    }
  }
  return { key: "tickets.error.unknown", backToSelection: false };
}
