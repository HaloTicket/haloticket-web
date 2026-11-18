/** Trạng thái của saga chuyển nhượng vé (khóa vé, chờ người nhận, chuyển quyền, hoàn tất hoặc bù trừ khi lỗi). */
export type MarketplaceSagaState =
  | "WAITING_LOCK"
  | "WAITING_RECIPIENT"
  | "WAITING_TRANSFER"
  | "COMPLETED"
  | "FAILED"
  | "COMPENSATING"
  | "COMPENSATED";

/** Kết quả kiểm tra một vé có được đăng bán lại hay không, kèm khoảng giá và phiên bản chính sách áp dụng. */
export interface ResaleEligibility {
  ticketId: string;
  eventId: string;
  eligible: boolean;
  reasonCode?: string | null;
  originalPrice?: number | null;
  serviceFeePercent?: number | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  policyVersion?: number | null;
  closesAt?: string | null;
  termsVersion?: string | null;
}

/** Phản hồi của một saga chuyển nhượng: mã saga, trạng thái và lỗi cuối cùng nếu có. */
export interface MarketplaceSagaResponse {
  sagaId: string;
  state: MarketplaceSagaState;
  businessId?: string | null;
  lastError?: string | null;
}

/** Một tin đăng bán lại vé trên chợ: vé, giá, số lượng và trạng thái. */
export interface TicketListing {
  id: string;
  ticketId: string;
  ticketIds?: string[];
  tickets?: TransferTicketSnapshot[];
  ticketCode?: string | null;
  ownedByCurrentUser?: boolean;
  eventId?: string | null;
  ticketTypeName?: string | null;
  section?: string | null;
  row?: string | null;
  seat?: string | null;
  price: number;
  originalPrice?: number | null;
  minPriceSnapshot?: number | null;
  maxPriceSnapshot?: number | null;
  quantity?: number | null;
  allowRetail?: boolean | null;
  status: "ACTIVE" | "RESERVED" | "SOLD" | "CANCELLED" | "EXPIRED" | "PAUSED_BY_EVENT";
  pauseReason?: string | null;
  expiresAt?: string | null;
  publishedAt?: string | null;
}

/** Tóm tắt các tin bán lại đang mở của một sự kiện: số tin và giá thấp nhất. */
export interface ResaleEventSummary {
  eventId: string;
  eventName?: string;
  activeListings: number;
  minPrice: number;
}

/** Kết quả giữ chỗ khi người mua chọn một tin bán lại, chờ thanh toán trước thời điểm hết hạn. */
export interface ResaleReservation {
  quantity?: number;
  ticketIds?: string[];
  transactionId: string;
  listingId: string;
  status: "PENDING_PAYMENT";
  amount: number;
  currency: string;
  reservationExpiresAt: string;
}

/** Thông tin khởi tạo thanh toán cho giao dịch mua vé bán lại. */
export interface ResalePaymentInitiation {
  transactionId: string;
  amount: number;
  currency: string;
  expiresAt: string;
}

/** Trạng thái hiện tại của giao dịch mua vé bán lại. */
export interface ResalePurchaseStatus {
  transactionId: string;
  status: "PENDING_PAYMENT" | "PAYMENT_PROCESSING" | "TRANSFERRING" | "COMPLETED" | "REFUND_PENDING" | "REFUNDED" | "CANCELLED" | "EXPIRED";
  sagaId?: string | null;
}

/** Yêu cầu tặng vé: vé, email người nhận, lời nhắn và xác nhận điều khoản. */
export interface GiftTicketRequest {
  ticketId?: string;
  ticketIds?: string[];
  recipientEmail: string;
  message?: string;
  acceptedTerms: boolean;
}

/** Ảnh chụp thông tin một vé tại thời điểm chuyển nhượng (loại vé, vị trí ghế, giá). */
export interface TransferTicketSnapshot {
  ticketId: string;
  ticketTypeId?: string | null;
  showtimeId?: string | null;
  ticketTypeName?: string | null;
  section?: string | null;
  row?: string | null;
  seat?: string | null;
  price?: number;
  originalPrice?: number;
}

/** Trang dữ liệu phân trang của chợ vé. */
export interface MarketplacePage<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}
