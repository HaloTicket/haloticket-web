import axiosClient from "./axiosClient";
import type {
  GiftTicketRequest,
  MarketplacePage,
  MarketplaceSagaResponse,
  ResaleEventSummary,
  ResaleReservation,
  ResalePaymentInitiation, ResalePurchaseStatus,
  ResaleEligibility,
  TicketListing,
  TransferTicketSnapshot,
} from "@/types/marketplace";

/** Tạo khóa idempotency ngẫu nhiên, dùng `crypto.randomUUID` nếu có. */
const newIdempotencyKey = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const marketplaceApi = {
  /** Lấy danh sách sự kiện có vé đang được bán lại. */
  getResaleEvents: () =>
    axiosClient.get<unknown, ResaleEventSummary[]>("/marketplace/events"),

  /** Lấy một trang tin đăng bán lại của sự kiện. */
  getEventListings: (eventId: string, page = 0, size = 20) =>
    axiosClient.get<unknown, MarketplacePage<TicketListing>>(
      `/marketplace/events/${encodeURIComponent(eventId)}/listings?page=${page}&size=${size}`,
    ),

  /** Lấy chi tiết một tin đăng bán lại. */
  getListing: (listingId: string) =>
    axiosClient.get<unknown, TicketListing>(`/marketplace/listings/${encodeURIComponent(listingId)}`),

  /** Giữ chỗ tin đăng (hoặc một số vé được chọn) cho người mua, kèm khóa idempotency. */
  reserveListing: (listingId: string, idempotencyKey = newIdempotencyKey(), ticketIds?: string[]) =>
    axiosClient.post<unknown, ResaleReservation>(
      `/marketplace/listings/${encodeURIComponent(listingId)}/reserve`,
      ticketIds ? { ticketIds } : null,
      { headers: { "Idempotency-Key": idempotencyKey } },
    ),

  /** Hủy giữ chỗ một tin đăng. */
  cancelReservation: (listingId: string) =>
    axiosClient.post<unknown, void>(
      `/marketplace/listings/${encodeURIComponent(listingId)}/cancel-reservation`,
    ),

  /** Bắt đầu thanh toán cho giao dịch mua vé bán lại. */
  startResalePayment: (transactionId: string) =>
    axiosClient.post<unknown, ResalePaymentInitiation>(
      `/marketplace/transactions/${encodeURIComponent(transactionId)}/payment`,
    ),

  /** Lấy trạng thái giao dịch mua vé bán lại. */
  getResalePurchaseStatus: (transactionId: string) =>
    axiosClient.get<unknown, ResalePurchaseStatus>(
      `/marketplace/transactions/${encodeURIComponent(transactionId)}`,
    ),

  /** Kiểm tra một vé có đủ điều kiện để đăng bán lại hay không. */
  getResaleEligibility: (ticketId: string) =>
    axiosClient.get<unknown, ResaleEligibility>(`/marketplace/tickets/${encodeURIComponent(ticketId)}/resale-eligibility`),

  /** Đăng bán lại một hoặc nhiều vé với giá chỉ định, kèm khóa idempotency. */
  createResaleListing: (request: { ticketId?: string; ticketIds?: string[]; price: number; policyVersion?: number; termsVersion?: string; allowRetail?: boolean }, idempotencyKey = newIdempotencyKey()) =>
    axiosClient.post<unknown, MarketplaceSagaResponse>("/marketplace/listings", request, { headers: { "Idempotency-Key": idempotencyKey } }),

  /** Lấy trạng thái một saga giao dịch (bán lại hoặc tặng). */
  getSaga: (sagaId: string) =>
    axiosClient.get<unknown, MarketplaceSagaResponse>(`/marketplace/sagas/${encodeURIComponent(sagaId)}`),

  /** Lấy một trang các tin đăng bán lại công khai. */
  getPublicListings: (page = 0, size = 20) =>
    axiosClient.get<unknown, MarketplacePage<TicketListing>>(`/marketplace/listings?page=${page}&size=${size}`),

  /** Tạo lượt tặng vé, kèm khóa idempotency. */
  createGift: (request: GiftTicketRequest, idempotencyKey = newIdempotencyKey()) =>
    axiosClient.post<unknown, MarketplaceSagaResponse>("/marketplace/gifts", request, { headers: { "Idempotency-Key": idempotencyKey } }),

  /** Người nhận chấp nhận quà tặng bằng token trong lời mời. */
  acceptGift: (sagaId: string, token?: string) =>
    axiosClient.post<unknown, MarketplaceSagaResponse>(`/marketplace/gifts/${encodeURIComponent(sagaId)}/accept`, null, { params: { token: token ?? "" } }),

  /** Người tặng hủy lượt tặng vé. */
  cancelGift: (sagaId: string) =>
    axiosClient.post<unknown, MarketplaceSagaResponse>(`/marketplace/gifts/${encodeURIComponent(sagaId)}/cancel`),

  /** Người nhận từ chối quà tặng. */
  declineGift: (sagaId: string) =>
    axiosClient.post<unknown, MarketplaceSagaResponse>(`/marketplace/gifts/${encodeURIComponent(sagaId)}/decline`),

  /** Lấy lượt tặng đang hiệu lực của một vé. */
  getActiveGiftByTicket: (ticketId: string) =>
    axiosClient.get<unknown, { sagaId: string; ticketId: string; status: string; recipientEmail: string; expiresAt: string }>(
      `/marketplace/gifts/by-ticket/${encodeURIComponent(ticketId)}`
    ),

  /** Lấy thông tin lời mời nhận quà theo saga và token. */
  getGiftInvitation: (sagaId: string, token?: string) =>
    axiosClient.get<unknown, {
      ticketId: string; eventId: string; ticketTypeName: string;
      section: string; row: string; seat: string; message: string;
      recipientEmail: string; expiresAt: string; state: string;
      requireEkyc?: boolean; maxGiftCount?: number;
      senderUserId?: string; senderName?: string;
      ticketIds?: string[]; quantity?: number; tickets?: TransferTicketSnapshot[];
    }>(
      `/marketplace/gifts/${encodeURIComponent(sagaId)}/invitation`, { params: { token: token ?? "" } },
    ),

  /** Lấy các lời mời nhận quà đang gửi tới người dùng hiện tại. */
  getMyGiftInvitations: () =>
    axiosClient.get<unknown, Array<{
      sagaId: string; eventId: string; ticketTypeName: string;
      section?: string; row?: string; seat?: string;
      expiresAt: string; senderName?: string;
      ticketIds?: string[]; quantity?: number; tickets?: TransferTicketSnapshot[];
    }>>(
      "/marketplace/gifts/mine",
    ),

  /** Lấy một trang các tin đăng bán lại của chính người dùng. */
  getMyListings: (page = 0, size = 50) =>
    axiosClient.get<unknown, MarketplacePage<TicketListing>>(`/marketplace/listings/me?page=${page}&size=${size}`),

  /** Hủy tin đăng bán lại của người dùng. */
  cancelListing: (listingId: string) =>
    axiosClient.post<unknown, MarketplaceSagaResponse>(`/marketplace/listings/${encodeURIComponent(listingId)}/cancel`),
};
